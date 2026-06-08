"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MOVEMENT_LABELS } from "@/lib/labels";
import type { MovementType } from "@prisma/client";

// Перерахунок сумарного залишку товару (для Каталогу) після руху
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

async function ensureItem(productId: string, warehouseId: string) {
  return prisma.stockItem.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    create: { productId, warehouseId, quantity: 0, reserved: 0 },
    update: {},
  });
}

async function logMovement(
  type: MovementType,
  productId: string,
  warehouseId: string,
  quantity: number,
  userId: string,
  note?: string | null,
  toWarehouseId?: string | null
) {
  await prisma.stockMovement.create({
    data: { type, productId, warehouseId, quantity, userId, note: note ?? null, toWarehouseId: toWarehouseId ?? null },
  });
  await audit(`STOCK_${type}`, {
    userId,
    entity: "Product",
    entityId: productId,
    details: `${MOVEMENT_LABELS[type]}: ${quantity}`,
  });
}

function parse(formData: FormData) {
  return {
    productId: String(formData.get("productId") ?? ""),
    warehouseId: String(formData.get("warehouseId") ?? ""),
    toWarehouseId: String(formData.get("toWarehouseId") ?? ""),
    qty: Number(formData.get("qty") ?? 0),
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

async function guard(action: "create" | "edit" | "delete") {
  const me = await requireUser();
  if (!can(me, "warehouse", action)) throw new Error("Недостатньо прав для складських операцій");
  return me;
}

// Надходження
export async function receipt(formData: FormData) {
  const me = await guard("create");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty <= 0) return;

  await ensureItem(productId, warehouseId);
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: { increment: qty } },
  });
  await logMovement("RECEIPT", productId, warehouseId, qty, me.id, note);
  await recompute(productId);
  revalidatePath("/warehouse");
}

// Списання (не можна списати зарезервоване)
export async function writeoff(formData: FormData) {
  const me = await guard("edit");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty <= 0) return;

  const item = await ensureItem(productId, warehouseId);
  if (qty > item.quantity - item.reserved) return; // недостатньо доступного
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: { decrement: qty } },
  });
  await logMovement("WRITEOFF", productId, warehouseId, qty, me.id, note);
  await recompute(productId);
  revalidatePath("/warehouse");
}

// Переміщення між складами
export async function transfer(formData: FormData) {
  const me = await guard("edit");
  const { productId, warehouseId, toWarehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || !toWarehouseId || warehouseId === toWarehouseId || qty <= 0)
    return;

  const from = await ensureItem(productId, warehouseId);
  if (qty > from.quantity - from.reserved) return;
  await ensureItem(productId, toWarehouseId);

  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: { decrement: qty } },
  });
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
    data: { quantity: { increment: qty } },
  });
  await logMovement("TRANSFER", productId, warehouseId, qty, me.id, note, toWarehouseId);
  await recompute(productId);
  revalidatePath("/warehouse");
}

// Резервування
export async function reserve(formData: FormData) {
  const me = await guard("edit");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty <= 0) return;

  const item = await ensureItem(productId, warehouseId);
  if (qty > item.quantity - item.reserved) return; // не можна зарезервувати більше доступного
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { reserved: { increment: qty } },
  });
  await logMovement("RESERVE", productId, warehouseId, qty, me.id, note);
  revalidatePath("/warehouse");
}

// Зняття резерву
export async function unreserve(formData: FormData) {
  const me = await guard("edit");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty <= 0) return;

  const item = await ensureItem(productId, warehouseId);
  const dec = Math.min(qty, item.reserved);
  if (dec <= 0) return;
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { reserved: { decrement: dec } },
  });
  await logMovement("UNRESERVE", productId, warehouseId, dec, me.id, note);
  revalidatePath("/warehouse");
}

// Інвентаризація (встановити фактичний залишок)
export async function inventory(formData: FormData) {
  const me = await guard("edit");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty < 0) return;

  const item = await ensureItem(productId, warehouseId);
  if (qty < item.reserved) return; // не можна нижче зарезервованого
  const delta = qty - item.quantity;
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: qty },
  });
  await logMovement(
    "INVENTORY",
    productId,
    warehouseId,
    qty,
    me.id,
    `${note ? note + " · " : ""}коригування ${delta >= 0 ? "+" : ""}${delta}`
  );
  await recompute(productId);
  revalidatePath("/warehouse");
}

// Повернення товару на склад
export async function returnStock(formData: FormData) {
  const me = await guard("create");
  const { productId, warehouseId, qty, note } = parse(formData);
  if (!productId || !warehouseId || qty <= 0) return;

  await ensureItem(productId, warehouseId);
  await prisma.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { quantity: { increment: qty } },
  });
  await logMovement("RETURN", productId, warehouseId, qty, me.id, note);
  await recompute(productId);
  revalidatePath("/warehouse");
}
