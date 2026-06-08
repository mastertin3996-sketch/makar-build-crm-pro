"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/labels";
import type { PaymentMethod, PaymentProvider, PaymentDirection } from "@prisma/client";

async function guard(action: "create" | "edit") {
  const me = await requireUser();
  if (!can(me, "finance", action)) throw new Error("Недостатньо прав для фінансів");
  return me;
}

async function nextNumber() {
  const last = await prisma.payment.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 7000) + 1;
}

export async function createPayment(formData: FormData) {
  const me = await guard("create");
  const direction = (String(formData.get("direction")) || "INCOME") as PaymentDirection;
  const method = (String(formData.get("method")) || "CASH") as PaymentMethod;
  const provider = method === "ONLINE" ? ((String(formData.get("provider")) || "LIQPAY") as PaymentProvider) : null;
  const source = String(formData.get("source") ?? ""); // "", order:ID, document:ID, client:ID
  const comment = String(formData.get("comment") ?? "").trim() || null;
  let amount = Number(formData.get("amount") ?? 0) || 0;

  let clientId: string | null = null;
  let orderId: string | null = null;
  let documentId: string | null = null;

  if (source.startsWith("order:")) {
    orderId = source.slice(6);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      clientId = order.clientId;
      if (!amount) amount = order.totalAmount;
    }
  } else if (source.startsWith("document:")) {
    documentId = source.slice(9);
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (doc) {
      clientId = doc.clientId;
      orderId = doc.orderId;
      if (!amount) amount = doc.total;
    }
  } else if (source.startsWith("client:")) {
    clientId = source.slice(7);
  }
  if (amount <= 0) return;

  // Онлайн-оплата: очікує підтвердження (імітація платіжного шлюзу)
  const isOnline = method === "ONLINE";
  const payUrl = isOnline
    ? `https://pay.${(provider ?? "LIQPAY").toLowerCase()}.ua/inv/${randomBytes(6).toString("hex")}`
    : null;

  const payment = await prisma.payment.create({
    data: {
      number: await nextNumber(),
      amount,
      direction,
      method,
      provider,
      status: isOnline ? "PENDING" : "PAID",
      paidAt: isOnline ? null : new Date(),
      payUrl,
      comment,
      clientId,
      orderId,
      documentId,
      ownerId: me.id,
    },
  });

  await audit("PAYMENT_CREATED", {
    userId: me.id,
    entity: "Payment",
    entityId: payment.id,
    details: `#${payment.number} ${amount}${isOnline ? ` (${PAYMENT_PROVIDER_LABELS[provider!]})` : ""}`,
  });
  revalidatePath("/finance");
  redirect(`/finance/${payment.id}`);
}

// Підтвердження оплати (імітація webhook платіжного шлюзу / отримання післяплати)
export async function markPaid(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  await prisma.payment.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  await audit("PAYMENT_CONFIRMED", { userId: me.id, entity: "Payment", entityId: id });
  revalidatePath(`/finance/${id}`);
  revalidatePath("/finance");
}

export async function refundPayment(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  await prisma.payment.update({ where: { id }, data: { status: "REFUNDED" } });
  await audit("PAYMENT_REFUNDED", { userId: me.id, entity: "Payment", entityId: id });
  revalidatePath(`/finance/${id}`);
  revalidatePath("/finance");
}

export async function failPayment(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  await prisma.payment.update({ where: { id }, data: { status: "FAILED" } });
  await audit("PAYMENT_FAILED", { userId: me.id, entity: "Payment", entityId: id });
  revalidatePath(`/finance/${id}`);
  revalidatePath("/finance");
}
