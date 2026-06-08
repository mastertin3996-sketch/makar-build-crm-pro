import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/ui";
import {
  CARRIER_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { ShipmentStatus } from "@prisma/client";
import { createShipment } from "./actions";

export const dynamic = "force-dynamic";

const CARRIERS = ["NOVA_POSHTA", "UKRPOSHTA", "MEEST", "DELIVERY", "SAT"] as const;
const STATUS_ORDER = ["CREATED", "ACCEPTED", "IN_TRANSIT", "ARRIVED", "DELIVERED", "RETURNED", "CANCELLED"] as const;

export default async function LogisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "logistics", "view")) redirect("/");
  const canCreate = can(me, "logistics", "create");

  const { status } = await searchParams;
  const statusFilter = (STATUS_ORDER as readonly string[]).includes(status ?? "")
    ? (status as ShipmentStatus)
    : undefined;

  const [shipments, orders, counts] = await Promise.all([
    prisma.shipment.findMany({
      where: { status: statusFilter },
      include: { client: true, order: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["RESERVED", "PACKING", "SHIPPED"] } },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shipment.groupBy({ by: ["status"], _count: true }),
  ]);

  const total = counts.reduce((s, c) => s + c._count, 0);
  const countOf = (s: ShipmentStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const inTransit = countOf("ACCEPTED") + countOf("IN_TRANSIT") + countOf("ARRIVED");
  const totalCost = shipments.reduce((s, sh) => s + (sh.cost ?? 0), 0);

  const stats = [
    { label: "Усього відправлень", value: String(total), accent: "text-slate-700" },
    { label: "У дорозі", value: String(inTransit), accent: "text-sky-600" },
    { label: "Вручено", value: String(countOf("DELIVERED")), accent: "text-green-600" },
    { label: "Вартість доставки", value: formatUAH(totalCost), accent: "text-teal-600" },
  ];

  return (
    <>
      <PageHeader title="Логістика" subtitle={`Відправлень: ${total}`} />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className={`mt-2 text-2xl font-bold ${s.accent}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {canCreate && (
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-teal-600">
                <span className="text-lg leading-none">＋</span>
                Створити ТТН
              </summary>
              <form action={createShipment} className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Перевізник</span>
                  <select name="carrier" defaultValue="NOVA_POSHTA" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>{CARRIER_LABELS[c]}</option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Замовлення (автозаповнення отримувача)</span>
                  <select name="orderId" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    <option value="">— без прив'язки —</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>#{o.number} · {o.client?.fullName ?? "без клієнта"}</option>
                    ))}
                  </select>
                </label>
                <Field name="recipientName" label="Отримувач (ПІБ)" />
                <Field name="recipientPhone" label="Телефон" />
                <Field name="cityFrom" label="Місто відправлення" placeholder="Київ" />
                <Field name="cityTo" label="Місто призначення" />
                <Field name="address" label="Адреса / відділення" className="md:col-span-2" />
                <Field name="weight" label="Вага, кг" type="number" />
                <Field name="declaredValue" label="Оголошена вартість" type="number" />
                <Field name="cost" label="Вартість доставки" type="number" />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Платник</span>
                  <select name="payer" defaultValue="Отримувач" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    <option value="Отримувач">Отримувач</option>
                    <option value="Відправник">Відправник</option>
                  </select>
                </label>
                <div className="md:col-span-3">
                  <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700">
                    Створити ТТН
                  </button>
                </div>
              </form>
            </details>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Chip href="/logistics" active={!statusFilter} label={`Усі (${total})`} />
          {STATUS_ORDER.filter((s) => countOf(s as ShipmentStatus) > 0).map((s) => (
            <Chip key={s} href={`/logistics?status=${s}`} active={statusFilter === s} label={`${SHIPMENT_STATUS_LABELS[s]} (${countOf(s as ShipmentStatus)})`} />
          ))}
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">ТТН</th>
                <th className="px-6 py-3 font-medium">Перевізник</th>
                <th className="px-6 py-3 font-medium">Отримувач</th>
                <th className="px-6 py-3 font-medium">Маршрут</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Доставка</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/logistics/${s.id}`} className="font-mono text-xs font-medium text-teal-600 hover:underline">{s.ttn}</Link>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{CARRIER_LABELS[s.carrier]}</td>
                  <td className="px-6 py-3 text-slate-600">{s.recipientName}</td>
                  <td className="px-6 py-3 text-slate-500">{s.cityFrom ?? "—"} → {s.cityTo ?? "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SHIPMENT_STATUS_COLORS[s.status]}`}>
                      {SHIPMENT_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">{s.cost ? formatUAH(s.cost) : "—"}</td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">Відправлень не знайдено</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function Field({
  name, label, type = "text", placeholder, className = "",
}: {
  name: string; label: string; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}
