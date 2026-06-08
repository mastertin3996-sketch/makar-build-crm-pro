"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CHANNEL_LABELS } from "@/lib/labels";
import type { MessengerChannel, InteractionType } from "@prisma/client";

async function guard(action: "create" | "edit") {
  const me = await requireUser();
  if (!can(me, "messengers", action)) throw new Error("Недостатньо прав для месенджерів");
  return me;
}

// мапа каналу месенджера → тип взаємодії (для історії в картці клієнта)
const CHANNEL_TO_INTERACTION: Partial<Record<MessengerChannel, InteractionType>> = {
  TELEGRAM: "TELEGRAM",
  VIBER: "VIBER",
  INSTAGRAM: "INSTAGRAM",
  EMAIL: "EMAIL",
  SMS: "SMS",
};

export async function sendMessage(formData: FormData) {
  const me = await guard("create");
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const attachment = String(formData.get("attachment") ?? "").trim() || null;
  if (!conversationId || (!content && !attachment)) return;

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return;

  await prisma.message.create({
    data: { conversationId, direction: "OUT", content: content || "(вкладення)", attachment, authorId: me.id },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), unread: 0 },
  });

  // дублюємо у стрічку комунікацій клієнта
  const it = CHANNEL_TO_INTERACTION[conv.channel];
  if (conv.clientId && it) {
    await prisma.interaction.create({ data: { clientId: conv.clientId, type: it, content: content || "(вкладення)" } });
  }

  await audit("MESSAGE_SENT", { userId: me.id, entity: "Conversation", entityId: conversationId, details: CHANNEL_LABELS[conv.channel] });
  revalidatePath("/messengers");
}

export async function createConversation(formData: FormData) {
  const me = await guard("create");
  const channel = (String(formData.get("channel")) || "TELEGRAM") as MessengerChannel;
  const clientId = String(formData.get("clientId") ?? "") || null;
  const externalId = String(formData.get("externalId") ?? "").trim() || null;
  let title = String(formData.get("title") ?? "").trim();

  if (!title && clientId) {
    const c = await prisma.client.findUnique({ where: { id: clientId } });
    title = c?.fullName ?? "";
  }
  if (!title) title = externalId || CHANNEL_LABELS[channel];

  const conv = await prisma.conversation.create({
    data: { channel, clientId, externalId, title },
  });
  await audit("CONVERSATION_CREATED", { userId: me.id, entity: "Conversation", entityId: conv.id, details: `${CHANNEL_LABELS[channel]}: ${title}` });
  revalidatePath("/messengers");
  redirect(`/messengers?c=${conv.id}`);
}

// Демо: імітація вхідного повідомлення від клієнта
export async function simulateIncoming(formData: FormData) {
  const me = await guard("edit");
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim() || "Доброго дня! Цікавить ваша пропозиція 🙂";
  if (!conversationId) return;
  await prisma.message.create({ data: { conversationId, direction: "IN", content } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), unread: { increment: 1 } } });
  await audit("MESSAGE_RECEIVED", { userId: me.id, entity: "Conversation", entityId: conversationId });
  revalidatePath("/messengers");
}
