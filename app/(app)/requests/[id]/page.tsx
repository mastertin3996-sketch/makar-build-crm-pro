import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  INTERACTION_LABELS,
  INTERACTION_ICONS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import { updateStatus, addRequestInteraction } from "../actions";

export const dynamic = "force-dynamic";

export default async function RequestCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      interactions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!request) notFound();

  const itemsTotal = request.items.reduce(
    (s, i) => s + i.price * i.quantity,
    0
  );

  return (
    <>
      <PageHeader
        title={`Заявка #${request.number}`}
        subtitle={request.title}
        action={
          <Link
            href="/requests"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← До списку
          </Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Параметри */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={request.status} />
                <span className="text-sm text-slate-400">
                  Джерело: {SOURCE_LABELS[request.source]}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Створено: {formatDate(request.createdAt)}
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Клієнт</dt>
                <dd className="mt-0.5">
                  {request.client ? (
                    <Link
                      href={`/clients/${request.client.id}`}
                      className="text-teal-600 hover:underline"
                    >
                      {request.client.fullName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Менеджер</dt>
                <dd className="mt-0.5 text-slate-700">{request.manager ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Сума заявки</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {formatUAH(request.amount)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Позиції / прорахунок */}
          <Card>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Позиції (прорахунок)
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Найменування</th>
                  <th className="px-6 py-3 text-right font-medium">К-сть</th>
                  <th className="px-6 py-3 text-right font-medium">Ціна</th>
                  <th className="px-6 py-3 text-right font-medium">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {request.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-6 py-3 text-slate-700">{i.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {i.quantity}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {formatUAH(i.price)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-700">
                      {formatUAH(i.price * i.quantity)}
                    </td>
                  </tr>
                ))}
                {request.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      Позиції ще не додані
                    </td>
                  </tr>
                )}
              </tbody>
              {request.items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td colSpan={3} className="px-6 py-3 text-right font-medium text-slate-500">
                      Разом:
                    </td>
                    <td className="px-6 py-3 text-right text-base font-bold text-slate-900">
                      {formatUAH(itemsTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>
        </div>

        {/* Права колонка */}
        <div className="space-y-6">
          {/* Зміна статусу */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Статус заявки
            </h2>
            <form action={updateStatus} className="space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <select
                name="status"
                defaultValue={request.status}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
                Оновити статус
              </button>
            </form>
          </Card>

          {/* Комунікації */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Комунікації з клієнтом
            </h2>
            <form action={addRequestInteraction} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <input
                type="hidden"
                name="clientId"
                value={request.clientId ?? ""}
              />
              <select
                name="type"
                defaultValue="NOTE"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
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

            <ol className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              {request.interactions.map((i) => (
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
              {request.interactions.length === 0 && (
                <li className="text-sm text-slate-400">Записів поки немає</li>
              )}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
