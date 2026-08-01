import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, canFinance } from "@/lib/permissions";
import { PageHeader, Card, Button, Field, Select, Badge, EmptyRow } from "@/components/ui";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_DIRECTION_LABELS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { PaymentStatus } from "@prisma/client";
import { createPayment } from "./actions";

export const dynamic = "force-dynamic";

const METHODS = ["CASH", "BANK_TRANSFER", "COD", "ONLINE"] as const;
const PROVIDERS = ["LIQPAY", "WAYFORPAY", "FONDY", "MONOBANK", "PRIVATBANK"] as const;
const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "finance", "view")) redirect("/");
  const canCreate = can(me, "finance", "create");
  const showProfit = canFinance(me, "profit");

  const { status } = await searchParams;
  const statusFilter = (STATUSES as readonly string[]).includes(status ?? "")
    ? (status as PaymentStatus)
    : undefined;

  const [payments, clients, orders, documents, allPayments, allOrders] = await Promise.all([
    prisma.payment.findMany({
      where: { status: statusFilter },
      include: { client: true, order: true, document: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { fullName: "asc" } }),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } }, include: { client: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.document.findMany({ where: { type: "INVOICE" }, include: { client: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payment.findMany(),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } } }),
  ]);

  const income = allPayments.filter((p) => p.direction === "INCOME" && p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const expense = allPayments.filter((p) => p.direction === "EXPENSE" && p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const pending = allPayments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);

  // Заборгованість по клієнтах: (сума замовлень) − (оплачені надходження)
  const orderedByClient = new Map<string, number>();
  for (const o of allOrders) {
    if (!o.clientId) continue;
    orderedByClient.set(o.clientId, (orderedByClient.get(o.clientId) ?? 0) + o.totalAmount);
  }
  const paidByClient = new Map<string, number>();
  for (const p of allPayments) {
    if (p.direction !== "INCOME" || p.status !== "PAID" || !p.clientId) continue;
    paidByClient.set(p.clientId, (paidByClient.get(p.clientId) ?? 0) + p.amount);
  }
  const debts = clients
    .map((c) => ({ client: c, debt: (orderedByClient.get(c.id) ?? 0) - (paidByClient.get(c.id) ?? 0) }))
    .filter((d) => d.debt > 0.5)
    .sort((a, b) => b.debt - a.debt);
  const totalDebt = debts.reduce((s, d) => s + d.debt, 0);

  const stats = [
    { label: "Надходження (оплачено)", value: formatUAH(income), accent: "text-emerald-600" },
    { label: "Очікувані оплати", value: formatUAH(pending), accent: "text-amber-600" },
    { label: "Заборгованість клієнтів", value: formatUAH(totalDebt), accent: "text-red-600" },
    ...(showProfit ? [{ label: "Чистий потік", value: formatUAH(income - expense), accent: "text-teal-600" }] : []),
  ];

  return (
    <>
      <PageHeader title="Фінанси" subtitle="Облік оплат і контроль заборгованості" icon="💰" />

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
                Додати оплату
              </summary>
              <form action={createPayment} className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Напрям</span>
                  <Select name="direction" defaultValue="INCOME">
                    <option value="INCOME">Надходження</option>
                    <option value="EXPENSE">Видаток</option>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Спосіб оплати</span>
                  <Select name="method" defaultValue="CASH">
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Провайдер (для онлайн)</span>
                  <Select name="provider" defaultValue="LIQPAY">
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{PAYMENT_PROVIDER_LABELS[p]}</option>
                    ))}
                  </Select>
                </label>
                <Field name="amount" label="Сума, грн (порожньо = з джерела)" type="number" step="any" min="0" />
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Джерело</span>
                  <Select name="source" defaultValue="">
                    <option value="">— без прив&apos;язки —</option>
                    <optgroup label="Рахунки">
                      {documents.map((d) => (
                        <option key={d.id} value={`document:${d.id}`}>{d.number} · {d.client?.fullName ?? "—"} · {formatUAH(d.total)}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Замовлення">
                      {orders.map((o) => (
                        <option key={o.id} value={`order:${o.id}`}>#{o.number} · {o.client?.fullName ?? "—"} · {formatUAH(o.totalAmount)}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Клієнти">
                      {clients.map((c) => (
                        <option key={c.id} value={`client:${c.id}`}>{c.fullName}</option>
                      ))}
                    </optgroup>
                  </Select>
                </label>
                <Field name="comment" label="Коментар" className="md:col-span-3" />
                <div className="md:col-span-3">
                  <Button type="submit">Зберегти оплату</Button>
                  <span className="ml-3 text-xs text-slate-400">Онлайн-оплата створюється зі статусом «Очікує» + платіжне посилання.</span>
                </div>
              </form>
            </details>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Оплати */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Chip href="/finance" active={!statusFilter} label="Усі" />
              {STATUSES.map((s) => (
                <Chip key={s} href={`/finance?status=${s}`} active={statusFilter === s} label={PAYMENT_STATUS_LABELS[s]} />
              ))}
            </div>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">№</th>
                    <th className="px-5 py-3 font-medium">Клієнт</th>
                    <th className="px-5 py-3 font-medium">Спосіб</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                    <th className="px-5 py-3 text-right font-medium">Сума</th>
                    <th className="px-5 py-3 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/finance/${p.id}`} className="font-medium text-teal-600 hover:underline">#{p.number}</Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{p.client?.fullName ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {PAYMENT_METHOD_LABELS[p.method]}
                        {p.provider ? ` · ${PAYMENT_PROVIDER_LABELS[p.provider]}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={PAYMENT_STATUS_COLORS[p.status]}>
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </Badge>
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${p.direction === "EXPENSE" ? "text-red-600" : "text-slate-700"}`}>
                        {p.direction === "EXPENSE" ? "−" : ""}{formatUAH(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <EmptyRow colSpan={6}>Оплат не знайдено</EmptyRow>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Заборгованість */}
          <Card className="p-6">
            <h2 className="mb-1 text-base font-semibold text-slate-900">Контроль заборгованості</h2>
            <p className="mb-4 text-xs text-slate-500">Сума замовлень мінус оплачені надходження</p>
            <div className="space-y-2">
              {debts.map(({ client, debt }) => (
                <div key={client.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                  <Link href={`/clients/${client.id}`} className="text-sm text-slate-700 hover:underline">{client.fullName}</Link>
                  <span className="text-sm font-semibold text-red-600">{formatUAH(debt)}</span>
                </div>
              ))}
              {debts.length === 0 && <p className="text-sm text-slate-400">Заборгованості немає 🎉</p>}
            </div>
          </Card>
        </div>
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
