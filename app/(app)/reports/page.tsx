import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, canFinance, ROLE_LABELS } from "@/lib/permissions";
import { PageHeader, Card, EmptyRow } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  formatUAH,
  monthKey,
  monthLabel,
} from "@/lib/labels";
import type { RequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const REPORTS = [
  { key: "sales", label: "Продажі" },
  { key: "managers", label: "Менеджери" },
  { key: "products", label: "Товари" },
  { key: "cities", label: "Міста" },
  { key: "profit", label: "Прибуток" },
  { key: "conversion", label: "Конверсія" },
  { key: "sources", label: "Джерела лідів" },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

const WON: RequestStatus[] = ["PAID", "PRODUCTION", "PICKING", "SHIPPED", "COMPLETED"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "reports", "view")) redirect("/");

  const { r } = await searchParams;
  const active: ReportKey = REPORTS.some((x) => x.key === r) ? (r as ReportKey) : "sales";

  return (
    <>
      <PageHeader title="Звіти" subtitle="Аналітика продажів, фінансів та роботи команди" icon="reports" />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((rep) => (
            <Link
              key={rep.key}
              href={`/reports?r=${rep.key}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active === rep.key ? "bg-brand text-background" : "bg-white/5 text-muted ring-1 ring-brand/15 hover:bg-white/10"
              }`}
            >
              {rep.label}
            </Link>
          ))}
        </div>

        {active === "sales" && <SalesReport />}
        {active === "managers" && <ManagersReport />}
        {active === "products" && <ProductsReport />}
        {active === "cities" && <CitiesReport />}
        {active === "profit" && <ProfitReport canSeeProfit={canFinance(me, "profit")} />}
        {active === "conversion" && <ConversionReport />}
        {active === "sources" && <SourcesReport />}
      </div>
    </>
  );
}

// ---- Горизонтальний бар-чарт ----
function BarList({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <div className="w-40 shrink-0 truncate text-sm text-muted" title={row.label}>{row.label}</div>
          <div className="h-5 flex-1 rounded bg-white/5">
            <div className="h-5 rounded bg-brand" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <div className="w-28 text-right text-sm font-medium text-[#cfc9ba]">{row.display}</div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted">Немає даних</p>}
    </div>
  );
}

function Stat({ label, value, accent = "text-[#cfc9ba]" }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </Card>
  );
}

// ---- 1. Продажі ----
async function SalesReport() {
  const payments = await prisma.payment.findMany({ where: { direction: "INCOME", status: "PAID" } });
  const orders = await prisma.order.findMany({ where: { status: { not: "CANCELLED" } } });

  const byMonth = new Map<string, number>();
  for (const p of payments) {
    const k = monthKey(p.paidAt ?? p.createdAt);
    byMonth.set(k, (byMonth.get(k) ?? 0) + p.amount);
  }
  const rows = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ label: monthLabel(k), value: v, display: formatUAH(v) }));

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const ordersSum = orders.reduce((s, o) => s + o.totalAmount, 0);
  const avg = orders.length ? ordersSum / orders.length : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Дохід (оплачено)" value={formatUAH(revenue)} accent="text-emerald-400" />
        <Stat label="Сума замовлень" value={formatUAH(ordersSum)} accent="text-brand" />
        <Stat label="Замовлень" value={String(orders.length)} accent="text-indigo-400" />
        <Stat label="Середній чек" value={formatUAH(avg)} accent="text-violet-400" />
      </div>
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Дохід по місяцях</h2>
        <BarList rows={rows} />
      </Card>
    </>
  );
}

// ---- 2. Менеджери ----
async function ManagersReport() {
  const [users, orders, requests, payments] = await Promise.all([
    prisma.user.findMany(),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.request.findMany(),
    prisma.payment.findMany({ where: { direction: "INCOME", status: "PAID" } }),
  ]);

  const rows = users
    .map((u) => {
      const uOrders = orders.filter((o) => o.ownerId === u.id);
      const uReq = requests.filter((r) => r.ownerId === u.id);
      const paid = payments.filter((p) => p.ownerId === u.id).reduce((s, p) => s + p.amount, 0);
      return {
        user: u,
        requests: uReq.length,
        orders: uOrders.length,
        ordersSum: uOrders.reduce((s, o) => s + o.totalAmount, 0),
        paid,
      };
    })
    .filter((x) => x.requests || x.orders || x.paid)
    .sort((a, b) => b.ordersSum - a.ordersSum);

  return (
    <Card>
      <div className="border-b border-brand/10 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">KPI менеджерів</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-6 py-3 font-medium">Співробітник</th>
            <th className="px-6 py-3 font-medium">Роль</th>
            <th className="px-6 py-3 text-right font-medium">Заявок</th>
            <th className="px-6 py-3 text-right font-medium">Замовлень</th>
            <th className="px-6 py-3 text-right font-medium">Сума замовлень</th>
            <th className="px-6 py-3 text-right font-medium">Отримано оплат</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand/5">
          {rows.map((x) => (
            <tr key={x.user.id} className="hover:bg-white/5">
              <td className="px-6 py-3 font-medium text-[#cfc9ba]">{x.user.fullName}</td>
              <td className="px-6 py-3 text-muted">{ROLE_LABELS[x.user.role]}</td>
              <td className="px-6 py-3 text-right text-[#cfc9ba]">{x.requests}</td>
              <td className="px-6 py-3 text-right text-[#cfc9ba]">{x.orders}</td>
              <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">{formatUAH(x.ordersSum)}</td>
              <td className="px-6 py-3 text-right text-emerald-400">{formatUAH(x.paid)}</td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={6}>Немає даних</EmptyRow>}
        </tbody>
      </table>
    </Card>
  );
}

// ---- 3. Товари ----
async function ProductsReport() {
  const items = await prisma.orderItem.findMany({
    where: { order: { status: { not: "CANCELLED" } }, productId: { not: null } },
    include: { product: true },
  });
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const i of items) {
    const key = i.productId!;
    const cur = map.get(key) ?? { name: i.product?.name ?? i.name, qty: 0, revenue: 0 };
    cur.qty += i.quantity;
    cur.revenue += i.price * i.quantity;
    map.set(key, cur);
  }
  const top = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">Топ товарів за виручкою</h2>
      <BarList rows={top.map((t) => ({ label: t.name, value: t.revenue, display: `${formatUAH(t.revenue)} · ${t.qty} шт` }))} />
    </Card>
  );
}

// ---- 4. Міста ----
async function CitiesReport() {
  const shipments = await prisma.shipment.findMany();
  const map = new Map<string, { count: number; value: number }>();
  for (const s of shipments) {
    const city = s.cityTo || "Невідомо";
    const cur = map.get(city) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += s.declaredValue ?? 0;
    map.set(city, cur);
  }
  const rows = [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([city, v]) => ({ label: city, value: v.count, display: `${v.count} відпр. · ${formatUAH(v.value)}` }));

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">Відправлення по містах</h2>
      <BarList rows={rows} />
    </Card>
  );
}

// ---- 5. Прибуток ----
async function ProfitReport({ canSeeProfit }: { canSeeProfit: boolean }) {
  if (!canSeeProfit) {
    return (
      <Card className="p-10 text-center">
        <div className="text-3xl">🔒</div>
        <p className="mt-2 text-sm text-muted">Немає права на перегляд прибутку</p>
      </Card>
    );
  }
  const [payments, items] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PAID" } }),
    prisma.orderItem.findMany({ where: { order: { status: { not: "CANCELLED" } }, productId: { not: null } }, include: { product: true } }),
  ]);
  const revenue = payments.filter((p) => p.direction === "INCOME").reduce((s, p) => s + p.amount, 0);
  const expenses = payments.filter((p) => p.direction === "EXPENSE").reduce((s, p) => s + p.amount, 0);
  const cogs = items.reduce((s, i) => s + (i.product?.costPrice ?? 0) * i.quantity, 0);
  const gross = revenue - cogs;
  const net = gross - expenses;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Дохід" value={formatUAH(revenue)} accent="text-emerald-400" />
        <Stat label="Собівартість (COGS)" value={formatUAH(cogs)} accent="text-orange-400" />
        <Stat label="Валовий прибуток" value={formatUAH(gross)} accent="text-brand" />
        <Stat label="Чистий прибуток" value={formatUAH(net)} accent={net >= 0 ? "text-green-400" : "text-red-400"} />
      </div>
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Структура</h2>
        <BarList rows={[
          { label: "Дохід", value: revenue, display: formatUAH(revenue) },
          { label: "Собівартість", value: cogs, display: formatUAH(cogs) },
          { label: "Інші видатки", value: expenses, display: formatUAH(expenses) },
          { label: "Чистий прибуток", value: Math.max(0, net), display: formatUAH(net) },
        ]} />
      </Card>
    </>
  );
}

// ---- 6. Конверсія ----
async function ConversionReport() {
  const requests = await prisma.request.findMany();
  const total = requests.length;
  const won = requests.filter((r) => WON.includes(r.status)).length;
  const lost = requests.filter((r) => r.status === "CANCELLED").length;
  const rate = total ? Math.round((won / total) * 100) : 0;

  const rows = STATUS_ORDER.map((s) => ({
    label: STATUS_LABELS[s],
    value: requests.filter((r) => r.status === s).length,
    display: String(requests.filter((r) => r.status === s).length),
  })).filter((x) => x.value > 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Усього заявок" value={String(total)} accent="text-indigo-400" />
        <Stat label="Виграно" value={String(won)} accent="text-green-400" />
        <Stat label="Втрачено" value={String(lost)} accent="text-red-400" />
        <Stat label="Конверсія" value={`${rate}%`} accent="text-brand" />
      </div>
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Воронка за статусами</h2>
        <BarList rows={rows} />
      </Card>
    </>
  );
}

// ---- 7. Джерела лідів ----
async function SourcesReport() {
  const requests = await prisma.request.findMany();
  const map = new Map<string, { total: number; won: number }>();
  for (const r of requests) {
    const cur = map.get(r.source) ?? { total: 0, won: 0 };
    cur.total += 1;
    if (WON.includes(r.status)) cur.won += 1;
    map.set(r.source, cur);
  }
  const rows = [...map.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <Card>
      <div className="border-b border-brand/10 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">Заявки за джерелами</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-6 py-3 font-medium">Джерело</th>
            <th className="px-6 py-3 text-right font-medium">Заявок</th>
            <th className="px-6 py-3 text-right font-medium">Виграно</th>
            <th className="px-6 py-3 text-right font-medium">Конверсія</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand/5">
          {rows.map(([source, v]) => (
            <tr key={source} className="hover:bg-white/5">
              <td className="px-6 py-3 text-[#cfc9ba]">{SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source}</td>
              <td className="px-6 py-3 text-right text-[#cfc9ba]">{v.total}</td>
              <td className="px-6 py-3 text-right text-green-400">{v.won}</td>
              <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">{v.total ? Math.round((v.won / v.total) * 100) : 0}%</td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={4}>Немає даних</EmptyRow>}
        </tbody>
      </table>
    </Card>
  );
}
