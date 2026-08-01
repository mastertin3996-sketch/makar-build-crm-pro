"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { SHIPMENT_FLOW, CARRIER_LABELS } from "@/lib/labels";
import type { Carrier, ShipmentStatus } from "@prisma/client";

async function guard(action: "create" | "edit") {
  const me = await requireUser();
  if (!can(me, "logistics", action)) throw new Error("Недостатньо прав для логістики");
  return me;
}

// Генерація номера ТТН (демо; у проді — повертає API перевізника)
function genTtn(carrier: Carrier): string {
  const prefix: Record<Carrier, string> = {
    NOVA_POSHTA: "20",
    UKRPOSHTA: "05",
    MEEST: "30",
    DELIVERY: "40",
    SAT: "70",
  };
  let rest = "";
  for (let i = 0; i < 12; i++) rest += Math.floor(Math.random() * 10);
  return prefix[carrier] + rest;
}

function describe(status: ShipmentStatus, cityFrom?: string | null, cityTo?: string | null) {
  switch (status) {
    case "CREATED":
      return { text: "ТТН створено, очікує відправлення", loc: cityFrom ?? null };
    case "ACCEPTED":
      return { text: `Відправлення прийнято${cityFrom ? ` у м. ${cityFrom}` : ""}`, loc: cityFrom ?? null };
    case "IN_TRANSIT":
      return { text: `Прямує${cityTo ? ` до м. ${cityTo}` : ""}`, loc: cityTo ?? null };
    case "ARRIVED":
      return { text: `Прибуло у відділення${cityTo ? ` м. ${cityTo}` : ""}`, loc: cityTo ?? null };
    case "DELIVERED":
      return { text: "Вручено отримувачу", loc: cityTo ?? null };
    case "RETURNED":
      return { text: "Оформлено повернення відправнику", loc: cityTo ?? null };
    case "CANCELLED":
      return { text: "ТТН скасовано", loc: null };
    default:
      return { text: "", loc: null };
  }
}

export async function createShipment(formData: FormData) {
  const me = await guard("create");
  const carrier = (String(formData.get("carrier")) || "NOVA_POSHTA") as Carrier;
  const orderId = String(formData.get("orderId") ?? "") || null;

  let recipientName = String(formData.get("recipientName") ?? "").trim();
  let recipientPhone = String(formData.get("recipientPhone") ?? "").trim() || null;
  const cityTo = String(formData.get("cityTo") ?? "").trim() || null;
  let address = String(formData.get("address") ?? "").trim() || null;
  let clientId: string | null = null;

  // Автозаповнення з замовлення/клієнта
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
    if (order?.client) {
      clientId = order.client.id;
      if (!recipientName) recipientName = order.client.fullName;
      if (!recipientPhone) recipientPhone = order.client.phone;
      if (!address) address = order.client.address;
    }
  }
  if (!recipientName) return;

  const cityFrom = String(formData.get("cityFrom") ?? "").trim() || "Київ";
  const ttn = genTtn(carrier);

  const shipment = await prisma.shipment.create({
    data: {
      ttn,
      carrier,
      status: "CREATED",
      recipientName,
      recipientPhone,
      cityFrom,
      cityTo,
      address,
      weight: Number(formData.get("weight") ?? 0) || null,
      declaredValue: Number(formData.get("declaredValue") ?? 0) || null,
      cost: Number(formData.get("cost") ?? 0) || null,
      payer: String(formData.get("payer") ?? "Отримувач"),
      orderId,
      clientId,
      ownerId: me.id,
      events: {
        create: { status: "CREATED", description: describe("CREATED", cityFrom, cityTo).text, location: cityFrom },
      },
    },
  });

  await audit("SHIPMENT_CREATED", { userId: me.id, entity: "Shipment", entityId: shipment.id, details: `${CARRIER_LABELS[carrier]} ${ttn}` });
  revalidatePath("/logistics");
  redirect(`/logistics/${shipment.id}`);
}

// Авто-оновлення статусу (демо-симуляція трекінгу перевізника)
export async function advanceStatus(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const s = await prisma.shipment.findUnique({ where: { id } });
  if (!s) return;
  const idx = SHIPMENT_FLOW.indexOf(s.status as (typeof SHIPMENT_FLOW)[number]);
  if (idx < 0 || idx >= SHIPMENT_FLOW.length - 1) return; // вже доставлено або фінальний
  const next = SHIPMENT_FLOW[idx + 1] as ShipmentStatus;
  const d = describe(next, s.cityFrom, s.cityTo);

  await prisma.shipment.update({ where: { id }, data: { status: next } });
  await prisma.trackingEvent.create({
    data: { shipmentId: id, status: next, description: d.text, location: d.loc },
  });
  await audit("SHIPMENT_STATUS", { userId: me.id, entity: "Shipment", entityId: id, details: next });
  revalidatePath(`/logistics/${id}`);
  revalidatePath("/logistics");
}

export async function returnShipment(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const s = await prisma.shipment.findUnique({ where: { id } });
  if (!s || s.status === "CANCELLED") return;
  const d = describe("RETURNED", s.cityFrom, s.cityTo);
  await prisma.shipment.update({ where: { id }, data: { status: "RETURNED" } });
  await prisma.trackingEvent.create({ data: { shipmentId: id, status: "RETURNED", description: d.text, location: d.loc } });
  await audit("SHIPMENT_RETURNED", { userId: me.id, entity: "Shipment", entityId: id });
  revalidatePath(`/logistics/${id}`);
  revalidatePath("/logistics");
}

export async function cancelShipment(formData: FormData) {
  const me = await guard("edit");
  const id = String(formData.get("id") ?? "");
  const s = await prisma.shipment.findUnique({ where: { id } });
  if (!s || s.status === "DELIVERED" || s.status === "CANCELLED") return;
  await prisma.shipment.update({ where: { id }, data: { status: "CANCELLED" } });
  await prisma.trackingEvent.create({ data: { shipmentId: id, status: "CANCELLED", description: "ТТН скасовано" } });
  await audit("SHIPMENT_CANCELLED", { userId: me.id, entity: "Shipment", entityId: id });
  revalidatePath(`/logistics/${id}`);
  revalidatePath("/logistics");
}
