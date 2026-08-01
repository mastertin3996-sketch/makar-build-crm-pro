import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button, Field, Select, Badge, EmptyRow } from "@/components/ui";
import {
  CALL_PROVIDER_LABELS,
  CALL_DIRECTION_LABELS,
  CALL_DIRECTION_ICONS,
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  formatDuration,
} from "@/lib/labels";
import type { CallStatus } from "@prisma/client";
import { logCall, simulateIncomingCall, createLeadFromCall } from "./actions";

export const dynamic = "force-dynamic";

const PROVIDERS = ["BINOTEL", "RINGOSTAT", "UNITALK"] as const;
const STATUSES = ["ANSWERED", "MISSED", "NO_ANSWER"] as const;

function fmt(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function TelephonyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "telephony", "view")) redirect("/");
  const canCreate = can(me, "telephony", "create");

  const { status } = await searchParams;
  const statusFilter = (STATUSES as readonly string[]).includes(status ?? "") ? (status as CallStatus) : undefined;

  const [calls, clients, users, all] = await Promise.all([
    prisma.call.findMany({
      where: { status: statusFilter },
      include: { client: true, manager: true, request: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.client.findMany({ orderBy: { fullName: "asc" } }),
    prisma.user.findMany(),
    prisma.call.findMany(),
  ]);

  const inbound = all.filter((c) => c.direction === "INBOUND").length;
  const outbound = all.filter((c) => c.direction === "OUTBOUND").length;
  const missed = all.filter((c) => c.status === "MISSED").length;
  const autoLeads = all.filter((c) => c.requestId).length;
  const avgDur = all.length ? Math.round(all.reduce((s, c) => s + c.duration, 0) / all.filter((c) => c.duration > 0).length || 0) : 0;

  // KPI менеджерів
  const mgrStats = users
    .map((u) => {
      const uc = all.filter((c) => c.managerId === u.id);
      return { user: u, total: uc.length, talk: uc.reduce((s, c) => s + c.duration, 0), missed: uc.filter((c) => c.status === "MISSED").length };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const stats = [
    { label: "Усього дзвінків", value: String(all.length), accent: "text-foreground" },
    { label: "Вхідні", value: String(inbound), accent: "text-sky-400" },
    { label: "Вихідні", value: String(outbound), accent: "text-brand" },
    { label: "Пропущені", value: String(missed), accent: "text-red-400" },
    { label: "Сер. тривалість", value: formatDuration(avgDur || 0), accent: "text-indigo-400" },
    { label: "Авто-ліди", value: String(autoLeads), accent: "text-emerald-400" },
  ];

  return (
    <>
      <PageHeader title="Телефонія" subtitle="Binotel · Ringostat · UniTalk" icon="telephony" />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-sm text-muted">{s.label}</div>
              <div className={`mt-2 text-2xl font-bold ${s.accent}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {canCreate && (
          <div className="flex flex-wrap items-stretch gap-4">
            <Card className="flex-1">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand">
                  <span className="text-lg leading-none">＋</span> Записати дзвінок
                </summary>
                <form action={logCall} className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-3">
                  <Sel name="provider" label="АТС" opts={PROVIDERS.map((p) => [p, CALL_PROVIDER_LABELS[p]])} />
                  <Sel name="direction" label="Напрям" opts={[["OUTBOUND", "Вихідний"], ["INBOUND", "Вхідний"]]} />
                  <Sel name="status" label="Статус" opts={STATUSES.map((s) => [s, CALL_STATUS_LABELS[s]])} />
                  <Field name="fromNumber" label="Від кого" placeholder="+380..." />
                  <Field name="toNumber" label="Кому" placeholder="+380..." />
                  <Field name="duration" label="Тривалість, сек" type="number" step="1" />
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">Клієнт</span>
                    <Select name="clientId" defaultValue="">
                      <option value="">— невідомий —</option>
                      {clients.map((c) => (<option key={c.id} value={c.id}>{c.fullName}</option>))}
                    </Select>
                  </label>
                  <Field name="recordingUrl" label="Посилання на запис" className="md:col-span-2" />
                  <div className="md:col-span-3">
                    <Button type="submit">Зберегти</Button>
                  </div>
                </form>
              </details>
            </Card>
            <Card className="flex items-center px-6 py-4">
              <form action={simulateIncomingCall}>
                <Button type="submit" variant="secondary" title="Імітація вхідного дзвінка з авто-створенням ліда">
                  📞 Вхідний дзвінок (демо)
                </Button>
              </form>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Історія дзвінків */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Chip href="/telephony" active={!statusFilter} label="Усі" />
              {STATUSES.map((s) => (<Chip key={s} href={`/telephony?status=${s}`} active={statusFilter === s} label={CALL_STATUS_LABELS[s]} />))}
            </div>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Напрям</th>
                    <th className="px-5 py-3 font-medium">Номер / клієнт</th>
                    <th className="px-5 py-3 font-medium">АТС</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                    <th className="px-5 py-3 text-right font-medium">Трив.</th>
                    <th className="px-5 py-3 font-medium">Запис</th>
                    <th className="px-5 py-3 font-medium">Лід</th>
                    <th className="px-5 py-3 font-medium">Час</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/5">
                  {calls.map((c) => {
                    const number = c.direction === "INBOUND" ? c.fromNumber : c.toNumber;
                    return (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="px-5 py-3" title={CALL_DIRECTION_LABELS[c.direction]}>{CALL_DIRECTION_ICONS[c.direction]}</td>
                        <td className="px-5 py-3 text-[#cfc9ba]">
                          {c.client ? <Link href={`/clients/${c.client.id}`} className="text-brand hover:underline">{c.client.fullName}</Link> : <span className="font-mono text-xs">{number}</span>}
                        </td>
                        <td className="px-5 py-3 text-muted">{CALL_PROVIDER_LABELS[c.provider]}</td>
                        <td className="px-5 py-3"><Badge className={CALL_STATUS_COLORS[c.status]}>{CALL_STATUS_LABELS[c.status]}</Badge></td>
                        <td className="px-5 py-3 text-right text-[#cfc9ba]">{c.duration ? formatDuration(c.duration) : "—"}</td>
                        <td className="px-5 py-3">{c.recordingUrl ? <a href={c.recordingUrl} target="_blank" className="text-brand hover:underline">▶</a> : "—"}</td>
                        <td className="px-5 py-3">
                          {c.request ? (
                            <Link href={`/requests/${c.request.id}`} className="text-brand hover:underline">#{c.request.number}</Link>
                          ) : canCreate ? (
                            <form action={createLeadFromCall}>
                              <input type="hidden" name="callId" value={c.id} />
                              <Button type="submit" variant="ghost" size="sm" className="px-0 py-0 text-brand hover:underline">+ лід</Button>
                            </form>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted">{fmt(c.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {calls.length === 0 && (<EmptyRow colSpan={8}>Дзвінків не знайдено</EmptyRow>)}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Контроль менеджерів */}
          <Card className="p-6">
            <h2 className="mb-1 text-base font-semibold text-foreground">Контроль менеджерів</h2>
            <p className="mb-4 text-xs text-muted">Дзвінки, час розмов, пропущені</p>
            <div className="space-y-3">
              {mgrStats.map((m) => (
                <div key={m.user.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#cfc9ba]">{m.user.fullName}</span>
                    <span className="text-sm font-semibold text-foreground">{m.total}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    Розмови: {formatDuration(m.talk)} · Пропущені: {m.missed}
                  </div>
                </div>
              ))}
              {mgrStats.length === 0 && <p className="text-sm text-muted">Немає даних</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-brand text-background" : "bg-white/5 text-muted ring-1 ring-brand/10 hover:bg-white/10"}`}>{label}</Link>
  );
}

function Sel({ name, label, opts }: { name: string; label: string; opts: [string, string][] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select name={name}>
        {opts.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
      </Select>
    </label>
  );
}
