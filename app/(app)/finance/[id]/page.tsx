import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_DIRECTION_LABELS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import { markPaid, refundPayment, failPayment } from "../actions";

export const dynamic = "force-dynamic";

export default async function PaymentCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "finance", "view")) redirect("/");
  const canEdit = can(me, "finance", "edit");

  const { id } = await params;
  const p = await prisma.payment.findUnique({
    where: { id },
    include: { client: true, order: true, document: true, owner: true },
  });
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={`Оплата #${p.number}`}
        subtitle={`${PAYMENT_DIRECTION_LABELS[p.direction]} · ${PAYMENT_METHOD_LABELS[p.method]}`}
        icon="💰"
        action={<Link href="/finance" className="text-sm text-slate-500 hover:text-slate-700">← До списку</Link>}
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className={PAYMENT_STATUS_COLORS[p.status]}>
                {PAYMENT_STATUS_LABELS[p.status]}
              </Badge>
              <span className="text-2xl font-bold text-slate-900">
                {p.direction === "EXPENSE" ? "−" : ""}{formatUAH(p.amount)}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Спосіб оплати" value={PAYMENT_METHOD_LABELS[p.method]} />
              <Info label="Провайдер" value={p.provider ? PAYMENT_PROVIDER_LABELS[p.provider] : null} />
              <Info label="Клієнт" value={p.client?.fullName} href={p.client ? `/clients/${p.client.id}` : undefined} />
              <Info label="Замовлення" value={p.order ? `#${p.order.number}` : null} href={p.order ? `/orders/${p.order.id}` : undefined} />
              <Info label="Рахунок" value={p.document ? p.document.number : null} href={p.document ? `/documents/${p.document.id}` : undefined} />
              <Info label="Створено" value={formatDate(p.createdAt)} />
              <Info label="Дата оплати" value={p.paidAt ? formatDate(p.paidAt) : null} />
              <Info label="Менеджер" value={p.owner?.fullName} />
              {p.comment && <Info label="Коментар" value={p.comment} full />}
            </dl>

            {p.payUrl && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-400">Платіжне посилання</div>
                <a href={p.payUrl} target="_blank" className="break-all text-sm text-teal-600 hover:underline">{p.payUrl}</a>
                <p className="mt-1 text-xs text-slate-400">Демо-посилання. У проді — реальний чекаут провайдера; статус оновлюється через webhook.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Дії</h2>
            {canEdit ? (
              <div className="space-y-3">
                {p.status !== "PAID" && (
                  <form action={markPaid}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" className="w-full">
                      ✅ Підтвердити оплату
                    </Button>
                  </form>
                )}
                {p.status === "PAID" && (
                  <form action={refundPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="danger" className="w-full">
                      ↩ Повернути кошти
                    </Button>
                  </form>
                )}
                {p.status === "PENDING" && (
                  <form action={failPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="danger" className="w-full">
                      ✖ Позначити відхиленою
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Немає прав на редагування</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value, full = false, href }: { label: string; value?: string | null; full?: boolean; href?: string }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">
        {value ? (href ? <Link href={href} className="text-teal-600 hover:underline">{value}</Link> : value) : "—"}
      </dd>
    </div>
  );
}
