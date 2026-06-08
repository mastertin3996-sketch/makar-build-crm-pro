"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { InteractionType } from "@prisma/client";

export async function createClient(formData: FormData) {
  const me = await requireUser();
  if (!can(me, "clients", "create")) return;

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!fullName || !phone) return;

  const client = await prisma.client.create({
    data: {
      fullName,
      phone,
      email: emptyToNull(formData.get("email")),
      company: emptyToNull(formData.get("company")),
      edrpou: emptyToNull(formData.get("edrpou")),
      ipn: emptyToNull(formData.get("ipn")),
      address: emptyToNull(formData.get("address")),
      notes: emptyToNull(formData.get("notes")),
    },
  });

  await audit("CREATE_CLIENT", { userId: me.id, entity: "Client", entityId: client.id, details: fullName });
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function addInteraction(formData: FormData) {
  const me = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");
  const type = String(formData.get("type") ?? "NOTE") as InteractionType;
  const content = String(formData.get("content") ?? "").trim();
  if (!clientId || !content) return;

  await prisma.interaction.create({
    data: { clientId, type, content },
  });

  await audit("ADD_INTERACTION", { userId: me.id, entity: "Client", entityId: clientId, details: type });
  revalidatePath(`/clients/${clientId}`);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}
