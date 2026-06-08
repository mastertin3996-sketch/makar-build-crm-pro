"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { RequestStatus, RequestSource } from "@prisma/client";

export async function createRequest(formData: FormData) {
  const me = await requireUser();
  if (!can(me, "requests", "create")) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const last = await prisma.request.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 1000) + 1;

  const clientId = String(formData.get("clientId") ?? "");
  const amount = Number(formData.get("amount") ?? 0) || 0;

  const request = await prisma.request.create({
    data: {
      number,
      title,
      amount,
      status: (String(formData.get("status")) || "NEW_LEAD") as RequestStatus,
      source: (String(formData.get("source")) || "MANUAL") as RequestSource,
      manager: String(formData.get("manager") ?? "").trim() || me.fullName,
      clientId: clientId || null,
      ownerId: me.id, // власник заявки — поточний користувач
    },
  });

  await audit("CREATE_REQUEST", {
    userId: me.id,
    entity: "Request",
    entityId: request.id,
    details: `#${number} ${title}`,
  });
  revalidatePath("/requests");
  redirect(`/requests/${request.id}`);
}

export async function updateStatus(formData: FormData) {
  const me = await requireUser();
  if (!can(me, "requests", "edit")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as RequestStatus;
  if (!id || !status) return;

  const before = await prisma.request.findUnique({ where: { id }, select: { status: true, number: true } });
  await prisma.request.update({ where: { id }, data: { status } });
  await audit("STATUS_CHANGE", {
    userId: me.id,
    entity: "Request",
    entityId: id,
    details: `#${before?.number}: ${before?.status} → ${status}`,
  });
  revalidatePath(`/requests/${id}`);
  revalidatePath("/requests");
}

export async function addRequestInteraction(formData: FormData) {
  const me = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const clientId = String(formData.get("clientId") ?? "") || null;
  const type = String(formData.get("type") ?? "NOTE") as
    | "NOTE"
    | "TASK"
    | "CALL"
    | "SMS"
    | "EMAIL"
    | "TELEGRAM"
    | "VIBER"
    | "INSTAGRAM";
  const content = String(formData.get("content") ?? "").trim();
  if (!requestId || !content) return;

  await prisma.interaction.create({
    data: { requestId, clientId, type, content },
  });
  await audit("ADD_INTERACTION", { userId: me.id, entity: "Request", entityId: requestId, details: type });
  revalidatePath(`/requests/${requestId}`);
}
