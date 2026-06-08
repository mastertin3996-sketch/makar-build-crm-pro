"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { RequestSource, OrderStatus, OrderItem } from "@prisma/client";

async function guard(action: "create" | "edit") {
  const me = await requireUser();
  if (!can(me, "orders", action)) throw new Error("Недостатньо прав для замовлень");
  return me;
}

async function recompute(productId: string) {
  const agg = await prisma.stockItem.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { stock: agg._sum.quantity ?? 0 },
  });
}

async function defaultWarehouseId(orderWarehouseId: string | null) {
  if (orderWarehouseId) return orderWarehouseId;
  const wh =
    (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
    (await prisma.warehouse.findFirst());
  return wh?.id ?? null;
}

// Авторезерв однієї позиції під замовлення
async function reserveLine(item: OrderItem, warehouseId: string, userId: string, orderNumber: number) {
  if (!item.productId || item.reservedQty > 0) return;
  const product = await prisma.product.findUnique({ where: { id: item.productId } });
  if (!product || product.category === "SERVICES") return;

  const si = await prisma.stockItem.upsert({
    where: { productId_warehouseId: { productId: item.productId, warehouseId } },
    create: { productId: item.productId, warehouseId, quantity: 0, reserved: 0 },
    update: {},
  });
  const available = si.quantity - si.reserved;
  const r = Math.min(item.quantity, Math.max(0, available));
  if (r <= 0) return;

  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId: item.productId, warehouseId } },
    data: { reserved: { increment: r } },
  });
  await prisma.orderItem.update({ where: { id: item.id }, data: { reservedQty: r } });
  await prisma.stockMovement.create({
    data: { type: "RESERVE", productId: item.productId, warehouseId, quantity: r, userId, note: `Замовлення #${orderNumber}` },
  });
}

async function releaseLine(item: OrderItem, warehouseId: string, userId: string, orderNumber: number) {
  if (!item.productId || item.reservedQty <= 0) return;
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId: item.productId, warehouseId } },
    data: { reserved: { decrement: item.reservedQty } },
  });
  await prisma.stockMovement.create({
    data: { type: "UNRESERVE", productId: item.productId, warehouseId, quantity: item.reservedQty, userId, note: `Замовлення #${orderNumber}` },
  });
  await prisma.orderItem.update({ where: { id: item.id }, data: { reservedQty: 0 } });
}

async function shipLine(item: OrderItem, warehouseId: string, userId: string, orderNumber: number) {
  if (!item.productId || item.reservedQty <= 0) return;
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId: item.productId, warehouseId } },
    data: { reserved: { decrement: item.reservedQty }, quantity: { decrement: item.reservedQty } },
  });
  await prisma.stockMovement.create({
    data: { type: "WRITEOFF", productId: item.productId, warehouseId, quantity: item.reservedQty, userId, note: `Відвантаження по замовленню #${orderNumber}` },
  });
  await prisma.orderItem.update({ where: { id: item.id }, data: { reservedQty: 0 } });
  await recompute(item.productId);
}

async function recalcTotal(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  await prisma.order.update({ where: { id: orderId }, data: { totalAmount: total } });
}

async function nextNumber() {
  const last = await prisma.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 5000) + 1;
}

// ----- Дії -----
export async function createOrder(formData: FormData) {
  const me = await guard("create");
  const channel = (String(formData.get("channel")) || "MANUAL") as RequestSource;
  const clientId = String(formData.get("clientId") ?? "") || null;
  const warehouseId = String(formData.get("warehouseId") ?? "") || (await defaultWarehouseId(null));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const order = await prisma.order.create({
    data: { number: await nextNumber(), channel, clientId, warehouseId, comment, ownerId: me.id, status: "NEW" },
  });
  await audit("ORDER_CREATED", { userId: me.id, entity: "Order", entityId: order.id, details: `#${order.number}` });
  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

export async function addOrderItem(formData: FormData) {
  const me = await guard("edit");
  const orderId = String(formData.get("orderId") ?? "");
  const productId = String(formData.get("productId") ?? "") || null;
  const qty = Number(formData.get("qty") ?? 0) || 0;
  if (!orderId || qty <= 0) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "SHIPPED" || order.status === "COMPLETED" || order.status === "CANCELLED") return;

  let name = String(formData.get("name") ?? "").trim();
  let price = Number(formData.get("price") ?? 0) || 0;
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      if (!name) name = product.name;
      if (!price) price = product.price;
    }
  }
  if (!name) return;

  const item = await prisma.orderItem.create({
    data: { orderId, productId, name, quantity: qty, price },
  });

  // Автоматичне резервування під замовлення
  const whId = await defaultWarehouseId(order.warehouseId);
  if (whId) await reserveLine(item, whId, me.id, order.number);

  // якщо щось зарезервовано і статус ще NEW → переводимо в RESERVED
  const fresh = await prisma.orderItem.findUnique({ where: { id: item.id } });
  if (order.status === "NEW" && (fresh?.reservedQty ?? 0) > 0) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "RESERVED" } });
  }
  await recalcTotal(orderId);
  await audit("ORDER_ITEM_ADDED", { userId: me.id, entity: "Order", entityId: orderId, details: `${name} ×${qty}` });
  revalidatePath(`/orders/${orderId}`);
}

export async function removeOrderItem(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const item = await prisma.orderItem.findUnique({ where: { id }, include: { order: true } });
  if (!item) return;
  const whId = await defaultWarehouseId(item.order.warehouseId);
  if (whId) await releaseLine(item, whId, me.id, item.order.number);
  await prisma.orderItem.delete({ where: { id } });
  await recalcTotal(item.orderId);
  revalidatePath(`/orders/${item.orderId}`);
}

export async function setOrderStatus(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  // лише статуси без впливу на склад
  if (!["NEW", "CONFIRMED", "RESERVED", "PACKING"].includes(status)) return;
  await prisma.order.update({ where: { id }, data: { status } });
  await audit("ORDER_STATUS", { userId: me.id, entity: "Order", entityId: id, details: status });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
}

export async function shipOrder(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.status === "SHIPPED" || order.status === "COMPLETED" || order.status === "CANCELLED") return;
  const whId = await defaultWarehouseId(order.warehouseId);
  if (whId) for (const item of order.items) await shipLine(item, whId, me.id, order.number);
  await prisma.order.update({ where: { id }, data: { status: "SHIPPED" } });
  await audit("ORDER_SHIPPED", { userId: me.id, entity: "Order", entityId: id, details: `#${order.number}` });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/warehouse");
}

export async function completeOrder(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  await prisma.order.update({ where: { id }, data: { status: "COMPLETED" } });
  await audit("ORDER_COMPLETED", { userId: me.id, entity: "Order", entityId: id });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
}

export async function cancelOrder(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.status === "CANCELLED") return;
  // повертаємо резерв (якщо ще не відвантажено)
  if (order.status !== "SHIPPED" && order.status !== "COMPLETED") {
    const whId = await defaultWarehouseId(order.warehouseId);
    if (whId) for (const item of order.items) await releaseLine(item, whId, me.id, order.number);
  }
  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit("ORDER_CANCELLED", { userId: me.id, entity: "Order", entityId: id, details: `#${order.number}` });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/warehouse");
}

// Демо-імпорт замовлення з маркетплейсу (імітація автоматичного створення)
export async function importDemoOrder() {
  const me = await guard("create");
  const channels: RequestSource[] = ["WEBSITE", "PROM", "ROZETKA", "EPICENTR", "OLX", "INSTAGRAM", "FACEBOOK", "TELEGRAM"];
  const channel = channels[Math.floor(Math.random() * channels.length)];

  const [clients, products, wh] = await Promise.all([
    prisma.client.findMany(),
    prisma.product.findMany({ where: { category: { not: "SERVICES" }, stock: { gt: 0 } } }),
    defaultWarehouseId(null),
  ]);
  const client = clients[Math.floor(Math.random() * clients.length)] ?? null;

  const order = await prisma.order.create({
    data: {
      number: await nextNumber(),
      channel,
      status: "NEW",
      clientId: client?.id ?? null,
      warehouseId: wh,
      ownerId: me.id,
      comment: "Автоматичний імпорт з каналу продажу",
    },
  });

  // 1–2 випадкові позиції з авторезервом
  const picks = products.sort(() => Math.random() - 0.5).slice(0, Math.min(2, products.length));
  for (const p of picks) {
    const qty = 1 + Math.floor(Math.random() * 3);
    const item = await prisma.orderItem.create({
      data: { orderId: order.id, productId: p.id, name: p.name, quantity: qty, price: p.price },
    });
    if (wh) await reserveLine(item, wh, me.id, order.number);
  }
  const anyReserved = await prisma.orderItem.findFirst({ where: { orderId: order.id, reservedQty: { gt: 0 } } });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: anyReserved ? "RESERVED" : "NEW" },
  });
  await recalcTotal(order.id);
  await audit("ORDER_IMPORTED", { userId: me.id, entity: "Order", entityId: order.id, details: `#${order.number} (${channel})` });
  revalidatePath("/orders");
  revalidatePath("/warehouse");
  redirect(`/orders/${order.id}`);
}
