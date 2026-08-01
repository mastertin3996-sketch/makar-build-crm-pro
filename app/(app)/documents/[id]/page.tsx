import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Badge, Button, LinkButton, Select, EmptyRow } from "@/components/ui";
import {
  DOC_TYPE_LABELS,
  DOC_STATUS_LABELS,
  DOC_STATUS_COLORS,
  DOC_WITH_ITEMS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import type { DocumentStatus } from "@prisma/client";
import { setDocumentStatus, deleteDocument } from "../actions";

export const dynamic = "force-dynamic";

type LineItem = { name: string; quantity: number; price: number };
const STATUSES: DocumentStatus[] = ["DRAFT", "SENT", "SIGNED", "PAID", "CANCELLED"];

export default async function DocumentCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "documents", "view")) redirect("/");
  const canEdit = can(me, "documents", "edit");
  const canDelete = can(me, "documents", "delete");
  const canPrint = can(me, "documents", "print");

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { client: true, order: true, request: true, owner: true },
  });
  if (!doc) notFound();

  const items: LineItem[] = doc.items ? JSON.parse(doc.items) : [];
  const withItems = DOC_WITH_ITEMS.includes(doc.type);

  return (
    <>
      <PageHeader
        title={`${doc.number} · ${DOC_TYPE_LABELS[doc.type]}`}
        subtitle={doc.title}
        icon="documents"
        action={<Link href="/documents" className="text-sm text-muted hover:text-[#cfc9ba]">← До списку</Link>}
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className={DOC_STATUS_COLORS[doc.status]}>
                {DOC_STATUS_LABELS[doc.status]}
              </Badge>
              <span className="text-sm text-muted">Створено: {formatDate(doc.createdAt)}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Тип" value={DOC_TYPE_LABELS[doc.type]} />
              <Info label="Клієнт" value={doc.client?.fullName} href={doc.client ? `/clients/${doc.client.id}` : undefined} />
              <Info label="Замовлення" value={doc.order ? `#${doc.order.number}` : undefined} href={doc.order ? `/orders/${doc.order.id}` : undefined} />
              <Info label="Заявка" value={doc.request ? `#${doc.request.number}` : undefined} href={doc.request ? `/requests/${doc.request.id}` : undefined} />
              <Info label="Сума" value={doc.total ? formatUAH(doc.total) : undefined} />
              <Info label="Менеджер" value={doc.owner?.fullName} />
              {doc.notes && <Info label="Примітки" value={doc.notes} full />}
            </dl>
          </Card>

          {withItems && (
            <Card>
              <div className="border-b border-brand/10 px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Позиції</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-6 py-3 font-medium">Найменування</th>
                    <th className="px-6 py-3 text-right font-medium">К-сть</th>
                    <th className="px-6 py-3 text-right font-medium">Ціна</th>
                    <th className="px-6 py-3 text-right font-medium">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/5">
                  {items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-3 text-[#cfc9ba]">{i.name}</td>
                      <td className="px-6 py-3 text-right text-[#cfc9ba]">{i.quantity}</td>
                      <td className="px-6 py-3 text-right text-[#cfc9ba]">{formatUAH(i.price)}</td>
                      <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">{formatUAH(i.price * i.quantity)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <EmptyRow colSpan={4}>Позицій немає</EmptyRow>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-brand/10">
                      <td colSpan={3} className="px-6 py-3 text-right font-medium text-muted">Разом:</td>
                      <td className="px-6 py-3 text-right text-base font-bold text-foreground">{formatUAH(doc.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </Card>
          )}
        </div>

        {/* Дії */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Експорт</h2>
            <div className="space-y-2">
              {canPrint && (
                <LinkButton href={`/doc/${doc.id}`} target="_blank" variant="secondary" className="w-full">
                  🖨 Друк / PDF
                </LinkButton>
              )}
              <a
                href={`/documents/${doc.id}/export?format=doc`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand/25 bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand/10 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                📘 Експорт у Word
              </a>
              <a
                href={`/documents/${doc.id}/export?format=xls`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand/25 bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand/10 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                📗 Експорт у Excel
              </a>
            </div>
          </Card>

          {canEdit && (
            <Card className="p-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">Статус</h2>
              <form action={setDocumentStatus} className="flex gap-2">
                <input type="hidden" name="id" value={doc.id} />
                <Select name="status" defaultValue={doc.status} className="flex-1">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{DOC_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
                <Button type="submit">OK</Button>
              </form>
            </Card>
          )}

          {canDelete && (
            <Card className="p-6">
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={doc.id} />
                <Button type="submit" variant="danger" className="w-full">
                  🗑 Видалити документ
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value, full = false, href }: { label: string; value?: string | null; full?: boolean; href?: string }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-[#cfc9ba]">
        {value ? (href ? <Link href={href} className="text-brand hover:underline">{value}</Link> : value) : "—"}
      </dd>
    </div>
  );
}
