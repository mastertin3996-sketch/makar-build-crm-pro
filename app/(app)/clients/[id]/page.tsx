import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import {
  INTERACTION_LABELS,
  INTERACTION_ICONS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import { addInteraction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClientCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      requests: { orderBy: { createdAt: "desc" } },
      interactions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  const totalValue = client.requests.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title={client.fullName}
        subtitle={client.company ?? "Приватна особа"}
        action={
          <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-700">
            ← До списку
          </Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        {/* Ліва колонка — дані + заявки */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Контактні дані
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Телефон" value={client.phone} />
              <Info label="Email" value={client.email} />
              <Info label="Компанія" value={client.company} />
              <Info label="ЄДРПОУ" value={client.edrpou} />
              <Info label="ІПН" value={client.ipn} />
              <Info label="Адреса доставки" value={client.address} />
              <Info label="Примітки" value={client.notes} full />
            </dl>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Заявки клієнта
              </h2>
              <span className="text-sm text-slate-500">
                Сума: {formatUAH(totalValue)}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {client.requests.map((r) => (
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
                    <td className="px-6 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-3 text-right text-slate-700">
                      {formatUAH(r.amount)}
                    </td>
                  </tr>
                ))}
                {client.requests.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-400">
                      Заявок поки немає
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Права колонка — комунікації */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Комунікації з клієнтом
            </h2>

            <form action={addInteraction} className="space-y-3">
              <input type="hidden" name="clientId" value={client.id} />
              <select
                name="type"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                defaultValue="NOTE"
              >
                {Object.entries(INTERACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {INTERACTION_ICONS[value as keyof typeof INTERACTION_ICONS]}{" "}
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Текст повідомлення / нотатки…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                Додати запис
              </button>
            </form>

            {/* Канали з ТЗ (демо) */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Документи (скоро)
              </div>
              <div className="flex flex-wrap gap-2">
                {["Онлайн рахунок", "Комерційна пропозиція", "Договір", "Акт"].map(
                  (d) => (
                    <span
                      key={d}
                      className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-400"
                    >
                      {d}
                    </span>
                  )
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Історія взаємодій
            </h2>
            <ol className="space-y-4">
              {client.interactions.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="text-lg leading-none">
                    {INTERACTION_ICONS[i.type]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {INTERACTION_LABELS[i.type]}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(i.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700">{i.content}</p>
                  </div>
                </li>
              ))}
              {client.interactions.length === 0 && (
                <li className="text-sm text-slate-400">Записів поки немає</li>
              )}
            </ol>
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
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">{value || "—"}</dd>
    </div>
  );
}
