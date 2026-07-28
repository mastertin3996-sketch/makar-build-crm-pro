import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, requestScopeWhere } from "@/lib/auth";
import { canFinance } from "@/lib/permissions";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
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

  // Розподіл за статусами
  const byStatus = STATUS_ORDER.map((status) => ({
    label: STATUS_LABELS[status],
    value: requests.filter((r) => r.status === status).length,
  })).filter((s) => s.value > 0);

  // Воронка за джерелами
  const sourceCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      label: SOURCE_LABELS[source as RequestSource],
      value: count,
    }));

  const stats = [
    // Фінансові показники — лише за наявності права на перегляд оплат
    ...(showPayments
      ? [
          { label: "Продажі (оплачені)", value: formatUAH(totalSales), accent: "text-emerald-600" },
          { label: "Очікування оплат", value: formatUAH(awaitingPayment), accent: "text-orange-600" },
        ]
      : []),
    { label: "Нові заявки", value: String(newLeads), accent: "text-blue-600" },
    { label: "Активні замовлення", value: String(activeOrders), accent: "text-teal-600" },
    { label: "Відправлень в дорозі", value: String(inTransit), accent: "text-lime-600" },
    { label: "Клієнтів у базі", value: String(clientsCount), accent: "text-violet-600" },
    { label: "Позицій у каталозі", value: String(productsCount), accent: "text-indigo-600" },
    { label: "Усього заявок", value: String(requests.length), accent: "text-slate-700" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ключові показники компанії в реальному часі"
      />

      <div className="p-8 space-y-8">
        {/* KPI картки */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className={`mt-2 text-2xl font-bold ${s.accent}`}>
                {s.value}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Заявки за статусами */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Заявки за статусами
            </h2>
            <BarChart data={byStatus} />
          </Card>

          {/* Джерела лідів */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Джерела лідів
            </h2>
            <BarChart data={bySource} barColor="bg-violet-500" barColorHover="bg-violet-600" />
          </Card>
        </div>

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
