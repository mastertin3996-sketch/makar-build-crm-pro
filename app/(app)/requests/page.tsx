import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, requestScopeWhere } from "@/lib/auth";
import { SCOPE_LABELS } from "@/lib/permissions";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { RequestStatus } from "@prisma/client";
import { createRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const me = await requireUser();
  const scopeWhere = await requestScopeWhere(me);
  const { status, q } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = STATUS_ORDER.includes(status as RequestStatus)
    ? (status as RequestStatus)
    : undefined;

  const [requests, clients, counts] = await Promise.all([
    prisma.request.findMany({
      where: {
        ...scopeWhere,
        status: statusFilter,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { manager: { contains: query } },
              ],
            }
          : {}),
      },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { fullName: "asc" } }),
    prisma.request.groupBy({ by: ["status"], where: scopeWhere, _count: true }),
  ]);

  const countOf = (s: RequestStatus) =>
    counts.find((c) => c.status === s)?._count ?? 0;
  const totalCount = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <>
      <PageHeader
        title="Заявки"
        subtitle={`Усього: ${totalCount} · Видимість: ${SCOPE_LABELS[me.requestScope]}`}
      />

      <div className="p-8 space-y-6">
        {/* Швидка заявка */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-teal-600">
              <span className="text-lg leading-none">＋</span>
              Швидка заявка
            </summary>
            <form
              action={createRequest}
              className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-2"
            >
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Опис заявки *
                </span>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <Select name="status" label="Статус">
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>

              <Select name="source" label="Джерело">
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>

              <Select name="clientId" label="Клієнт">
                <option value="">— без клієнта —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </Select>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Сума, грн
                </span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  defaultValue={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Менеджер
                </span>
                <input
                  name="manager"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <div className="md:col-span-2">
                <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Створити заявку
                </button>
              </div>
            </form>
          </details>
        </Card>

        {/* Фільтр за статусами */}
        <div className="flex flex-wrap gap-2">
          <FilterChip href="/requests" active={!statusFilter} label={`Усі (${totalCount})`} />
          {STATUS_ORDER.filter((s) => countOf(s) > 0).map((s) => (
            <FilterChip
              key={s}
              href={`/requests?status=${s}`}
              active={statusFilter === s}
              label={`${STATUS_LABELS[s]} (${countOf(s)})`}
            />
          ))}
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">№</th>
                <th className="px-6 py-3 font-medium">Опис</th>
                <th className="px-6 py-3 font-medium">Клієнт</th>
                <th className="px-6 py-3 font-medium">Джерело</th>
                <th className="px-6 py-3 font-medium">Менеджер</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
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
                    {r.client ? (
                      <Link
                        href={`/clients/${r.client.id}`}
                        className="hover:underline"
                      >
                        {r.client.fullName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {SOURCE_LABELS[r.source]}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{r.manager ?? "—"}</td>
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
              {requests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    Заявок не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-slate-800 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function Select({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        name={name}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
      >
        {children}
      </select>
    </label>
  );
}
