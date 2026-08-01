import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button, Field, Select, Badge, EmptyRow } from "@/components/ui";
import {
  DOC_TYPE_LABELS,
  DOC_TYPE_SHORT,
  DOC_STATUS_LABELS,
  DOC_STATUS_COLORS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { DocumentType } from "@prisma/client";
import { createDocument } from "./actions";

export const dynamic = "force-dynamic";

const DOC_TYPES = ["QUOTE", "INVOICE", "CONTRACT", "ACT", "WAYBILL", "WARRANTY"] as const;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "documents", "view")) redirect("/");
  const canCreate = can(me, "documents", "create");

  const { type } = await searchParams;
  const typeFilter = (DOC_TYPES as readonly string[]).includes(type ?? "")
    ? (type as DocumentType)
    : undefined;

  const [docs, orders, requests, counts] = await Promise.all([
    prisma.document.findMany({
      where: { type: typeFilter },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({ include: { client: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.request.findMany({ include: { client: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.document.groupBy({ by: ["type"], _count: true }),
  ]);

  const total = counts.reduce((s, c) => s + c._count, 0);
  const countOf = (t: DocumentType) => counts.find((c) => c.type === t)?._count ?? 0;

  return (
    <>
      <PageHeader title="Документообіг" subtitle={`Документів: ${total}`} icon="documents" />

      <div className="space-y-6 p-8">
        {canCreate && (
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand transition-colors hover:text-brand-light">
                <span className="text-lg leading-none">＋</span>
                Створити документ
              </summary>
              <form action={createDocument} className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Тип документа</span>
                  <Select name="type" defaultValue="QUOTE">
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Джерело (автозаповнення позицій)</span>
                  <Select name="source" defaultValue="">
                    <option value="">— вручну, без джерела —</option>
                    <optgroup label="Замовлення">
                      {orders.map((o) => (
                        <option key={o.id} value={`order:${o.id}`}>Замовлення #{o.number} · {o.client?.fullName ?? "—"}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Заявки">
                      {requests.map((r) => (
                        <option key={r.id} value={`request:${r.id}`}>Заявка #{r.number} · {r.client?.fullName ?? "—"}</option>
                      ))}
                    </optgroup>
                  </Select>
                </label>
                <Field name="title" label="Назва (необов'язково)" className="md:col-span-2" />
                <Field name="notes" label="Примітки" className="md:col-span-2" />
                <div className="md:col-span-2">
                  <Button type="submit">Згенерувати документ</Button>
                </div>
              </form>
            </details>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Chip href="/documents" active={!typeFilter} label={`Усі (${total})`} />
          {DOC_TYPES.filter((t) => countOf(t) > 0).map((t) => (
            <Chip key={t} href={`/documents?type=${t}`} active={typeFilter === t} label={`${DOC_TYPE_SHORT[t]} (${countOf(t)})`} />
          ))}
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Номер</th>
                <th className="px-6 py-3 font-medium">Тип</th>
                <th className="px-6 py-3 font-medium">Назва</th>
                <th className="px-6 py-3 font-medium">Клієнт</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 text-right font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-white/5">
                  <td className="px-6 py-3">
                    <Link href={`/documents/${d.id}`} className="font-medium text-brand hover:underline">{d.number}</Link>
                  </td>
                  <td className="px-6 py-3 text-muted">{DOC_TYPE_SHORT[d.type]}</td>
                  <td className="px-6 py-3 text-[#cfc9ba]">{d.title}</td>
                  <td className="px-6 py-3 text-muted">{d.client?.fullName ?? "—"}</td>
                  <td className="px-6 py-3">
                    <Badge className={DOC_STATUS_COLORS[d.status]}>
                      {DOC_STATUS_LABELS[d.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">{d.total ? formatUAH(d.total) : "—"}</td>
                  <td className="px-6 py-3 text-muted">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
              {docs.length === 0 && (
                <EmptyRow colSpan={7}>Документів не знайдено</EmptyRow>
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
        active ? "bg-brand text-background" : "bg-white/5 text-muted ring-1 ring-brand/15 hover:bg-white/10 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
