"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CALL_PROVIDER_LABELS } from "@/lib/labels";
import type { CallProvider, CallDirection, CallStatus } from "@prisma/client";

const COMPANY_NUMBER = "+380443030303";

async function guard(action: "create" | "edit") {
  const me = await requireUser();
  if (!can(me, "telephony", action)) throw new Error("Недостатньо прав для телефонії");
  return me;
}

async function nextLeadNumber() {
  const last = await prisma.request.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 1000) + 1;
}

// Ручний запис дзвінка
export async function logCall(formData: FormData) {
  const me = await guard("create");
  const provider = (String(formData.get("provider")) || "BINOTEL") as CallProvider;
  const direction = (String(formData.get("direction")) || "OUTBOUND") as CallDirection;
  const status = (String(formData.get("status")) || "ANSWERED") as CallStatus;
  const fromNumber = String(formData.get("fromNumber") ?? "").trim();
  const toNumber = String(formData.get("toNumber") ?? "").trim();
  const duration = Math.max(0, Math.round(Number(formData.get("duration") ?? 0) || 0));
  const clientId = String(formData.get("clientId") ?? "") || null;
  if (!fromNumber || !toNumber) return;

  const call = await prisma.call.create({
    data: {
      provider, direction, status, fromNumber, toNumber, duration,
      recordingUrl: String(formData.get("recordingUrl") ?? "").trim() || null,
      comment: String(formData.get("comment") ?? "").trim() || null,
      clientId, managerId: me.id,
    },
  });
  await audit("CALL_LOGGED", { userId: me.id, entity: "Call", entityId: call.id, details: `${CALL_PROVIDER_LABELS[provider]} ${direction}` });
  revalidatePath("/telephony");
}

// Демо: вхідний дзвінок з автоматичним створенням ліда
export async function simulateIncomingCall() {
  const me = await guard("create");
  const providers: CallProvider[] = ["BINOTEL", "RINGOSTAT", "UNITALK"];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const phone = "+38067" + Math.floor(1000000 + Math.random() * 8999999);
  const answered = Math.random() > 0.25;
  const duration = answered ? 30 + Math.floor(Math.random() * 300) : 0;

  // чи відомий номер?
  const existing = await prisma.client.findFirst({ where: { phone: { contains: phone.slice(-7) } } });

  const call = await prisma.call.create({
    data: {
      provider,
      direction: "INBOUND",
      status: answered ? "ANSWERED" : "MISSED",
      fromNumber: phone,
      toNumber: COMPANY_NUMBER,
      duration,
      recordingUrl: answered ? `https://rec.${provider.toLowerCase()}.ua/${call_token()}` : null,
      clientId: existing?.id ?? null,
      managerId: me.id,
    },
  });

  // Автоматичне створення ліда для нового номера
  if (!existing) {
    const number = await nextLeadNumber();
    const lead = await prisma.request.create({
      data: {
        number,
        title: `Вхідний дзвінок ${phone}`,
        status: "NEW_LEAD",
        source: "PHONE",
        manager: me.fullName,
        ownerId: me.id,
        comment: `Автоматичний лід із дзвінка (${CALL_PROVIDER_LABELS[provider]}). Телефон: ${phone}`,
      },
    });
    await prisma.call.update({ where: { id: call.id }, data: { requestId: lead.id } });
    await audit("CALL_AUTO_LEAD", { userId: me.id, entity: "Request", entityId: lead.id, details: `Лід #${number} з дзвінка ${phone}` });
  }

  await audit("CALL_RECEIVED", { userId: me.id, entity: "Call", entityId: call.id, details: phone });
  revalidatePath("/telephony");
  revalidatePath("/requests");
}

// Створити лід вручну з наявного дзвінка
export async function createLeadFromCall(formData: FormData) {
  const me = await guard("create");
  const callId = String(formData.get("callId") ?? "");
  const call = await prisma.call.findUnique({ where: { id: callId }, include: { client: true } });
  if (!call || call.requestId) return;

  const number = await nextLeadNumber();
  const phone = call.direction === "INBOUND" ? call.fromNumber : call.toNumber;
  const lead = await prisma.request.create({
    data: {
      number,
      title: call.client ? `Звернення: ${call.client.fullName}` : `Лід із дзвінка ${phone}`,
      status: "NEW_LEAD",
      source: "PHONE",
      manager: me.fullName,
      ownerId: me.id,
      clientId: call.clientId,
      comment: `Створено з дзвінка. Телефон: ${phone}`,
    },
  });
  await prisma.call.update({ where: { id: callId }, data: { requestId: lead.id } });
  await audit("CALL_LEAD_CREATED", { userId: me.id, entity: "Request", entityId: lead.id, details: `Лід #${number}` });
  revalidatePath("/telephony");
  revalidatePath("/requests");
}

function call_token() {
  return Math.random().toString(36).slice(2, 10);
}
