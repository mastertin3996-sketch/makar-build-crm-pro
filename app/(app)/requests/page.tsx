import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, requestScopeWhere } from "@/lib/auth";
import { can, SCOPE_LABELS } from "@/lib/permissions";
import { PageHeader, Card, StatusBadge, Button, Field, EmptyRow, Select as UiSelect } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { RequestStatus } from "@prisma/client";
import { createRequest } from "./actions";
import { RequestsBoard } from "./RequestsBoard";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; view?: string }>;
}) {
  const me = await requireUser();
  const scopeWhere = await requestScopeWhere(me);
  const { status, q, view } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = STATUS_ORDER.includes(status as RequestStatus)
    ? (status as RequestStatus)
    : undefined;
  const isBoard = view === "board";
  const canEditRequests = can(me, "requests", "edit");

  const [requests, clients, counts] = await Promise.all([
    prisma.request.findMany({
      where: {
        ...scopeWhere,
        // На дошці показуємо всі статуси одразу (кожен — окрема колонка),
        // тому фільтр за статусом застосовуємо лише в табличному вигляді.
        status: isBoard ? undefined : statusFilter,
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

  const viewHref = (v: "table" | "board") => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (v !== "table") params.set("view", v);
    const qs = params.toString();
    return `/requests${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Заявки"
        subtitle={`Усього: ${totalCount} · Видимість: ${SCOPE_LABELS[me.requestScope]}`}
        action={
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            <Link
              href={viewHref("table")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !isBoard ? "bg-brand text-background shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              ☰ Таблиця
            </Link>
            <Link
              href={viewHref("board")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isBoard ? "bg-brand text-background shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              ▤ Дошка
            </Link>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Швидка заявка */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand transition-colors hover:text-brand-light">
              <span className="text-lg leading-none">＋</span>
              Швидка заявка
            </summary>
            <form
              action={createRequest}
              className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-2"
            >
              <Field name="title" label="Опис заявки *" required className="md:col-span-2" />

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

              <Field name="amount" label="Сума, грн" type="number" step="any" defaultValue={0} />

              <Field name="manager" label="Менеджер" />

              <div className="md:col-span-2">
                <Button type="submit">Створити заявку</Button>
              </div>
            </form>
          </details>
        </Card>

        {isBoard ? (
          <RequestsBoard requests={requests} canEdit={canEditRequests} />
        ) : (
          <>
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
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
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
                <tbody className="divide-y divide-brand/5">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="px-6 py-3">
                        <Link
                          href={`/requests/${r.id}`}
                          className="font-medium text-brand hover:underline"
                        >
                          #{r.number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-[#cfc9ba]">{r.title}</td>
                      <td className="px-6 py-3 text-muted">
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
                      <td className="px-6 py-3 text-muted">
                        {SOURCE_LABELS[r.source]}
                      </td>
                      <td className="px-6 py-3 text-muted">{r.manager ?? "—"}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">
                        {formatUAH(r.amount)}
                      </td>
                      <td className="px-6 py-3 text-muted">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <EmptyRow colSpan={8}>Заявок не знайдено</EmptyRow>
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}
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
          ? "bg-brand text-background"
          : "bg-white/5 text-muted ring-1 ring-brand/15 hover:bg-white/10"
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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <UiSelect name={name}>{children}</UiSelect>
    </label>
  );
}
