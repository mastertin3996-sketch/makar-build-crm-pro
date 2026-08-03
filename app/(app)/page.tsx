import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, requestScopeWhere } from "@/lib/auth";
import { canFinance } from "@/lib/permissions";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { RadialMeter } from "@/components/RadialMeter";
import { AreaTrendChart, BarChartVertical, DonutChart, KpiDelta } from "@/components/charts";
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

  // Тренд продажів за останні 30 днів — hero-графік і дельта для KPI "Продажі"
  const TREND_DAYS = 30;
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: TREND_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (TREND_DAYS - 1 - i));
    return d;
  });
  const salesByDay = new Map<string, number>();
  for (const r of requests) {
    if (!PAID.includes(r.status)) continue;
    const key = dayKey(new Date(r.createdAt));
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + r.amount);
  }
  const salesTrend = days.map((d) => {
    const value = salesByDay.get(dayKey(d)) ?? 0;
    return {
      label: d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
      value,
      displayValue: formatUAH(value),
    };
  });
  const trendHalf = Math.floor(TREND_DAYS / 2);
  const salesPrevHalf = salesTrend.slice(0, trendHalf).reduce((s, d) => s + d.value, 0);
  const salesRecentHalf = salesTrend.slice(trendHalf).reduce((s, d) => s + d.value, 0);

  const stats: { label: string; value: string; icon: IconName; delta?: { current: number; previous: number } }[] = [
    // Фінансові показники — лише за наявності права на перегляд оплат
    ...(showPayments
      ? [
          {
            label: "Продажі (оплачені)",
            value: formatUAH(totalSales),
            icon: "finance" as const,
            delta: { current: salesRecentHalf, previous: salesPrevHalf },
          },
          { label: "Очікування оплат", value: formatUAH(awaitingPayment), icon: "clock" as const },
        ]
      : []),
    { label: "Нові заявки", value: String(newLeads), icon: "plus" as const },
    { label: "Активні замовлення", value: String(activeOrders), icon: "orders" as const },
    { label: "Відправлень в дорозі", value: String(inTransit), icon: "logistics" as const },
    { label: "Клієнтів у базі", value: String(clientsCount), icon: "clients" as const },
    { label: "Позицій у каталозі", value: String(productsCount), icon: "catalog" as const },
    { label: "Усього заявок", value: String(requests.length), icon: "requests" as const },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ключові показники компанії в реальному часі"
        icon="dashboard"
      />

      <div className="p-8 space-y-8">
        {/* KPI показники */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                <Icon name={s.icon} className="h-3.5 w-3.5 text-brand" />
                {s.label}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">{s.value}</span>
                {s.delta && <KpiDelta current={s.delta.current} previous={s.delta.previous} />}
              </div>
            </div>
          ))}
        </div>

        {/* Тренд продажів — hero-графік на всю ширину */}
        {showPayments && (
          <Card className="p-6 md:p-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Продажі, останні {TREND_DAYS} днів
            </h2>
            <AreaTrendChart data={salesTrend} color="#d4af37" height={130} />
          </Card>
        )}

        <Card className="p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Кругова шкала — конверсія в оплату */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 p-6">
              <RadialMeter ratio={paidRatio} />
              <div className="mt-4 text-center">
                <div className="text-sm font-semibold text-[#b8935a]">Оплачені заявки</div>
                <div className="text-xs text-muted">
                  {paidCount} від {requests.length} усього
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                  Джерела лідів
                </h2>
                <DonutChart data={bySource} size={120} />
              </div>

              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                  Заявки за статусами
                </h2>
                <BarChartVertical data={byStatus} height={160} />
              </div>
            </div>
          </div>
        </Card>

        {/* Останні заявки */}
        <Card>
          <div className="flex items-center justify-between border-b border-brand/10 px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Останні заявки
            </h2>
            <Link
              href="/requests"
              className="text-sm font-medium text-brand hover:text-brand-light"
            >
              Усі заявки →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">№</th>
                <th className="px-6 py-3 font-medium">Опис</th>
                <th className="px-6 py-3 font-medium">Клієнт</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {requests.slice(0, 6).map((r) => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="px-6 py-3">
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      #{r.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#b8935a]">{r.title}</td>
                  <td className="px-6 py-3 text-muted">
                    {r.client?.fullName ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-[#b8935a]">
                    {formatUAH(r.amount)}
                  </td>
                  <td className="px-6 py-3 text-muted">
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
