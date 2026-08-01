import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, requestScopeWhere } from "@/lib/auth";
import { canFinance } from "@/lib/permissions";
import { PageHeader, Card, StatusBadge, PlatformIcon } from "@/components/ui";
import { RadialMeter } from "@/components/RadialMeter";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  SOURCE_ICONS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { RequestStatus, RequestSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await requireUser();
  const showPayments = canFinance(me, "payments");
  const scopeWhere = await requestScopeWhere(me);

  const [requests, clientsCount, productsCount] = await Promise.all([
    prisma.request.findMany({
      where: scopeWhere,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count(),
    prisma.product.count(),
  ]);

  const PAID: RequestStatus[] = ["PAID", "PRODUCTION", "PICKING", "SHIPPED", "COMPLETED"];
  const OPEN: RequestStatus[] = [
    "NEW_LEAD",
    "CALL_BACK",
    "CALCULATION",
    "QUOTE_SENT",
    "APPROVAL",
    "INVOICED",
    "AWAITING_PAYMENT",
  ];

  const totalSales = requests
    .filter((r) => PAID.includes(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const awaitingPayment = requests
    .filter((r) => r.status === "AWAITING_PAYMENT")
    .reduce((s, r) => s + r.amount, 0);
  const newLeads = requests.filter((r) => r.status === "NEW_LEAD").length;
  const activeOrders = requests.filter((r) => OPEN.includes(r.status)).length;
  const inTransit = requests.filter((r) => r.status === "SHIPPED").length;
  const paidCount = requests.filter((r) => PAID.includes(r.status)).length;
  const paidRatio = requests.length ? paidCount / requests.length : 0;

  // Розподіл за статусами
  const byStatus = STATUS_ORDER.map((status) => ({
    label: STATUS_LABELS[status],
    value: requests.filter((r) => r.status === status).length,
  })).filter((s) => s.value > 0);

  // Воронка за джерелами — рейтинг
  const sourceCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source: source as RequestSource,
      label: SOURCE_LABELS[source as RequestSource],
      value: count,
      icon: SOURCE_ICONS[source as RequestSource],
    }));
  const maxSource = Math.max(...bySource.map((s) => s.value), 1);

  const stats = [
    // Фінансові показники — лише за наявності права на перегляд оплат
    ...(showPayments
      ? [
          { label: "Продажі (оплачені)", value: formatUAH(totalSales), icon: "💰" },
          { label: "Очікування оплат", value: formatUAH(awaitingPayment), icon: "⏳" },
        ]
      : []),
    { label: "Нові заявки", value: String(newLeads), icon: "🆕" },
    { label: "Активні замовлення", value: String(activeOrders), icon: "📦" },
    { label: "Відправлень в дорозі", value: String(inTransit), icon: "🚚" },
    { label: "Клієнтів у базі", value: String(clientsCount), icon: "👥" },
    { label: "Позицій у каталозі", value: String(productsCount), icon: "🗂️" },
    { label: "Усього заявок", value: String(requests.length), icon: "📋" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ключові показники компанії в реальному часі"
        icon="📊"
      />

      <div className="p-8 space-y-8">
        {/* KPI показники */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-b-2 border-transparent px-1 py-3 transition-colors hover:border-teal-500"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {s.icon} {s.label}
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Кругова шкала — конверсія в оплату */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-6">
              <RadialMeter ratio={paidRatio} />
              <div className="mt-4 text-center">
                <div className="text-sm font-semibold text-slate-700">Оплачені заявки</div>
                <div className="text-xs text-slate-400">
                  {paidCount} від {requests.length} усього
                </div>
              </div>
            </div>

            <div>
              {/* Джерела лідів — рейтинг */}
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Джерела лідів — рейтинг
              </h2>
              <div className="space-y-3">
                {bySource.map((d, i) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                      {i + 1}
                    </div>
                    <span className="flex w-5 shrink-0 items-center justify-center">
                      <PlatformIcon id={d.source} fallback={d.icon} size={16} />
                    </span>
                    <div className="w-24 shrink-0 truncate text-sm text-slate-600" title={d.label}>
                      {d.label}
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-teal-500"
                        style={{ width: `${(d.value / maxSource) * 100}%` }}
                      />
                    </div>
                    <div className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Заявки за статусами — чіпи */}
              <h2 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Заявки за статусами
              </h2>
              <div className="flex flex-wrap gap-2">
                {byStatus.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm"
                  >
                    <span className="text-slate-600">{d.label}</span>
                    <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-white">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Останні заявки */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Останні заявки
            </h2>
            <Link
              href="/requests"
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Усі заявки →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">№</th>
                <th className="px-6 py-3 font-medium">Опис</th>
                <th className="px-6 py-3 font-medium">Клієнт</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.slice(0, 6).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-medium text-teal-600 hover:underline"
                    >
                      #{r.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-700">{r.title}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {r.client?.fullName ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-700">
                    {formatUAH(r.amount)}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {formatDate(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
