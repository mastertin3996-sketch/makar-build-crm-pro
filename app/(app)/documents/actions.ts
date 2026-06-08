"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DOC_TYPE_PREFIX, DOC_TYPE_LABELS } from "@/lib/labels";
import type { DocumentType, DocumentStatus } from "@prisma/client";

type LineItem = { name: string; quantity: number; price: number };

async function guard(action: "create" | "edit" | "delete") {
  const me = await requireUser();
  if (!can(me, "documents", action)) throw new Error("Недостатньо прав для документів");
  return me;
}

async function nextNumber(type: DocumentType): Promise<string> {
  const count = await prisma.document.count({ where: { type } });
  return `${DOC_TYPE_PREFIX[type]}-${1001 + count}`;
}

export async function createDocument(formData: FormData) {
  const me = await guard("create");
  const type = (String(formData.get("type")) || "QUOTE") as DocumentType;
  const source = String(formData.get("source") ?? ""); // "", "order:ID", "request:ID"
  let clientId = String(formData.get("clientId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let items: LineItem[] = [];
  let total = 0;
  let requestId: string | null = null;
  let orderId: string | null = null;

  if (source.startsWith("order:")) {
    orderId = source.slice(6);
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, client: true } });
    if (order) {
      items = order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price }));
      total = order.totalAmount;
      clientId = clientId ?? order.clientId;
    }
  } else if (source.startsWith("request:")) {
    requestId = source.slice(8);
    const req = await prisma.request.findUnique({ where: { id: requestId }, include: { items: true, client: true } });
    if (req) {
      items = req.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price }));
      total = items.reduce((s, i) => s + i.price * i.quantity, 0) || req.amount;
      clientId = clientId ?? req.clientId;
    }
  }

  const number = await nextNumber(type);
  const title = String(formData.get("title") ?? "").trim() || `${DOC_TYPE_LABELS[type]} ${number}`;

  const doc = await prisma.document.create({
    data: {
      number,
      type,
      title,
      notes,
      total,
      items: items.length ? JSON.stringify(items) : null,
      clientId,
      requestId,
      orderId,
      ownerId: me.id,
    },
  });

  await audit("DOCUMENT_CREATED", { userId: me.id, entity: "Document", entityId: doc.id, details: `${number} (${DOC_TYPE_LABELS[type]})` });
  revalidatePath("/documents");
  redirect(`/documents/${doc.id}`);
}

export async function setDocumentStatus(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as DocumentStatus;
  await prisma.document.update({ where: { id }, data: { status } });
  await audit("DOCUMENT_STATUS", { userId: me.id, entity: "Document", entityId: id, details: status });
  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
}

export async function deleteDocument(formData: FormData) {
  const me = await guard("delete");
  const id = String(formData.get("id") ?? "");
  await prisma.document.delete({ where: { id } });
  await audit("DOCUMENT_DELETED", { userId: me.id, entity: "Document", entityId: id });
  revalidatePath("/documents");
  redirect("/documents");
}
