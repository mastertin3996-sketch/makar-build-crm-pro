import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button, Select, Field, Badge, EmptyRow } from "@/components/ui";
import {
  SOURCE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_ORDER,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { OrderStatus } from "@prisma/client";
import { createOrder, importDemoOrder } from "./actions";

export const dynamic = "force-dynamic";

const CHANNELS = ["WEBSITE", "PROM", "ROZETKA", "EPICENTR", "OLX", "INSTAGRAM", "FACEBOOK", "TELEGRAM", "MANUAL"] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "orders", "view")) redirect("/");
  const canCreate = can(me, "orders", "create");

  const { status } = await searchParams;
  const statusFilter = (ORDER_STATUS_ORDER as readonly string[]).includes(status ?? "")
    ? (status as OrderStatus)
    : undefined;

  const [orders, clients, warehouses, counts] = await Promise.all([
    prisma.order.findMany({
      where: { status: statusFilter },
      include: { client: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { fullName: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const total = counts.reduce((s, c) => s + c._count, 0);
  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const revenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <>
      <PageHeader title="Замовлення" subtitle={`Усього: ${total} · Сума: ${formatUAH(revenue)}`} icon="🧾" />

      <div className="space-y-6 p-8">
        {canCreate && (
          <div className="flex flex-wrap items-stretch gap-4">
            <Card className="flex-1">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-teal-600">
                  <span className="text-lg leading-none">＋</span>
                  Нове замовлення
                </summary>
                <form action={createOrder} className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Канал / джерело</span>
                    <Select name="channel" defaultValue="MANUAL">
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>{SOURCE_LABELS[c]}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Клієнт</span>
                    <Select name="clientId" defaultValue="">
                      <option value="">— без клієнта —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Склад резервування</span>
                    <Select name="warehouseId" defaultValue="">
                      <option value="">Склад за замовчуванням</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </Select>
                  </label>
                  <Field name="comment" label="Коментар" />
                  <div className="md:col-span-2">
                    <Button type="submit">
                      Створити (позиції додасте на картці)
                    </Button>
                  </div>
                </form>
              </details>
            </Card>

            <Card className="flex items-center px-6 py-4">
              <form action={importDemoOrder}>
                <Button type="submit" variant="secondary" title="Імітація автоматичного імпорту з маркетплейсу">
                  ⚡ Імпорт з каналу (демо)
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Фільтр статусів */}
        <div className="flex flex-wrap gap-2">
          <Chip href="/orders" active={!statusFilter} label={`Усі (${total})`} />
          {ORDER_STATUS_ORDER.filter((s) => countOf(s as OrderStatus) > 0).map((s) => (
            <Chip key={s} href={`/orders?status=${s}`} active={statusFilter === s} label={`${ORDER_STATUS_LABELS[s]} (${countOf(s as OrderStatus)})`} />
          ))}
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">№</th>
                <th className="px-6 py-3 font-medium">Канал</th>
                <th className="px-6 py-3 font-medium">Клієнт</th>
                <th className="px-6 py-3 font-medium">Позицій</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/orders/${o.id}`} className="font-medium text-teal-600 hover:underline">#{o.number}</Link>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{SOURCE_LABELS[o.channel]}</td>
                  <td className="px-6 py-3 text-slate-600">{o.client?.fullName ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-500">{o._count.items}</td>
                  <td className="px-6 py-3">
                    <Badge className={ORDER_STATUS_COLORS[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-700">{formatUAH(o.totalAmount)}</td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <EmptyRow colSpan={7}>Замовлень не знайдено</EmptyRow>
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
