import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Badge, Button, LinkButton } from "@/components/ui";
import {
  CARRIER_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  formatUAH,
} from "@/lib/labels";
import { advanceStatus, returnShipment, cancelShipment } from "../actions";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function ShipmentCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "logistics", "view")) redirect("/");
  const canEdit = can(me, "logistics", "edit");
  const canPrint = can(me, "logistics", "print");

  const { id } = await params;
  const s = await prisma.shipment.findUnique({
    where: { id },
    include: {
      client: true,
      order: true,
      owner: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!s) notFound();

  const isFinal = s.status === "DELIVERED" || s.status === "CANCELLED" || s.status === "RETURNED";

  return (
    <>
      <PageHeader
        title={`ТТН ${s.ttn}`}
        subtitle={CARRIER_LABELS[s.carrier]}
        icon="🚚"
        action={
          <Link href="/logistics" className="text-sm text-slate-500 hover:text-slate-700">← До списку</Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className={SHIPMENT_STATUS_COLORS[s.status]}>
                {SHIPMENT_STATUS_LABELS[s.status]}
              </Badge>
              {canPrint && (
                <LinkButton href={`/ttn/${s.id}`} target="_blank" variant="secondary">
                  🖨 Друк ТТН
                </LinkButton>
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Отримувач" value={s.recipientName} />
              <Info label="Телефон" value={s.recipientPhone} />
              <Info label="Місто відправлення" value={s.cityFrom} />
              <Info label="Місто призначення" value={s.cityTo} />
              <Info label="Адреса / відділення" value={s.address} full />
              <Info label="Вага" value={s.weight ? `${s.weight} кг` : null} />
              <Info label="Оголошена вартість" value={s.declaredValue ? formatUAH(s.declaredValue) : null} />
              <Info label="Вартість доставки" value={s.cost ? formatUAH(s.cost) : null} />
              <Info label="Платник" value={s.payer} />
              <Info
                label="Замовлення"
                value={s.order ? `#${s.order.number}` : null}
                href={s.order ? `/orders/${s.order.id}` : undefined}
              />
              <Info label="Менеджер" value={s.owner?.fullName} />
            </dl>
          </Card>

          {/* Історія відстеження */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Історія відстеження</h2>
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5">
              {s.events.map((e, idx) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[27px] top-0.5 h-3 w-3 rounded-full ${
                      idx === 0 ? "bg-teal-500 ring-4 ring-teal-100" : "bg-slate-300"
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      {SHIPMENT_STATUS_LABELS[e.status]}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>
                  {e.location && <p className="text-xs text-slate-400">📍 {e.location}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Дії */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Керування</h2>
            <p className="mb-4 text-xs text-slate-500">
              «Оновити статус» імітує автоматичне відстеження перевізника (у проді —
              синхронізація через API Нової Пошти / Укрпошти).
            </p>
            {canEdit ? (
              <div className="space-y-3">
                {!isFinal && (
                  <form action={advanceStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" className="w-full">
                      🔄 Оновити статус
                    </Button>
                  </form>
                )}
                {!isFinal && s.status !== "CREATED" && (
                  <form action={returnShipment}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="danger" className="w-full">
                      ↩ Оформити повернення
                    </Button>
                  </form>
                )}
                {s.status !== "DELIVERED" && s.status !== "CANCELLED" && (
                  <form action={cancelShipment}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="danger" className="w-full">
                      ✖ Скасувати ТТН
                    </Button>
                  </form>
                )}
                {isFinal && <p className="text-sm text-slate-400">Відправлення завершено</p>}
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

function Info({
  label,
  value,
  full = false,
  href,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
  href?: string;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">
        {value ? (
          href ? (
            <Link href={href} className="text-teal-600 hover:underline">{value}</Link>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
