import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/ui";
import {
  SOURCE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatUAH,
  formatDate,
} from "@/lib/labels";
import {
  addOrderItem,
  removeOrderItem,
  setOrderStatus,
  shipOrder,
  completeOrder,
  cancelOrder,
} from "../actions";

export const dynamic = "force-dynamic";

const EDITABLE = ["NEW", "CONFIRMED", "RESERVED", "PACKING"];

export default async function OrderCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "orders", "view")) redirect("/");
  const canEdit = can(me, "orders", "edit");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { client: true, owner: true, warehouse: true, items: { include: { product: true } } },
  });
  if (!order) notFound();

  // склад резервування
  const whId =
    order.warehouseId ??
    (await prisma.warehouse.findFirst({ where: { isDefault: true } }))?.id ??
    null;

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const stockItems = whId
    ? await prisma.stockItem.findMany({ where: { warehouseId: whId } })
    : [];
  const availMap = new Map(stockItems.map((s) => [s.productId, s.quantity - s.reserved]));

  const isOpen = EDITABLE.includes(order.status);
  const isFinal = order.status === "COMPLETED" || order.status === "CANCELLED";
  const totalReserved = order.items.reduce((s, i) => s + i.reservedQty, 0);

  return (
    <>
      <PageHeader
        title={`Замовлення #${order.number}`}
        subtitle={`Канал: ${SOURCE_LABELS[order.channel]}`}
        action={
          <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700">← До списку</Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="text-sm text-slate-400">Створено: {formatDate(order.createdAt)}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Клієнт</dt>
                <dd className="mt-0.5">
                  {order.client ? (
                    <Link href={`/clients/${order.client.id}`} className="text-teal-600 hover:underline">{order.client.fullName}</Link>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Менеджер</dt>
                <dd className="mt-0.5 text-slate-700">{order.owner?.fullName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Склад резервування</dt>
                <dd className="mt-0.5 text-slate-700">{order.warehouse?.name ?? "за замовчуванням"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Сума</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{formatUAH(order.totalAmount)}</dd>
              </div>
              {order.comment && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-400">Коментар</dt>
                  <dd className="mt-0.5 text-slate-700">{order.comment}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Позиції */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Позиції замовлення</h2>
              <span className="text-xs text-slate-400">Зарезервовано одиниць: {totalReserved}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Найменування</th>
                  <th className="px-6 py-3 text-right font-medium">К-сть</th>
                  <th className="px-6 py-3 text-right font-medium">Резерв</th>
                  <th className="px-6 py-3 text-right font-medium">Ціна</th>
                  <th className="px-6 py-3 text-right font-medium">Сума</th>
                  {canEdit && isOpen && <th className="px-6 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((i) => {
                  const short = i.productId && i.product?.category !== "SERVICES" && i.reservedQty < i.quantity;
                  return (
                    <tr key={i.id}>
                      <td className="px-6 py-3 text-slate-700">{i.name}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{i.quantity}</td>
                      <td className="px-6 py-3 text-right">
                        {i.product?.category === "SERVICES" || !i.productId ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={short ? "text-red-600" : "text-emerald-600"}>
                            {i.reservedQty}
                            {short && " ⚠"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">{formatUAH(i.price)}</td>
                      <td className="px-6 py-3 text-right font-medium text-slate-700">{formatUAH(i.price * i.quantity)}</td>
                      {canEdit && isOpen && (
                        <td className="px-6 py-3 text-right">
                          <form action={removeOrderItem}>
                            <input type="hidden" name="id" value={i.id} />
                            <button className="text-xs text-red-500 hover:underline">видалити</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {order.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Позиції ще не додані</td>
                  </tr>
                )}
              </tbody>
            </table>

            {canEdit && isOpen && (
              <form action={addOrderItem} className="flex flex-wrap items-end gap-3 border-t border-slate-100 px-6 py-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="block flex-1 min-w-[200px]">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Товар</span>
                  <select name="productId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    {products.map((p) => {
                      const av = availMap.get(p.id);
                      const avTxt = p.category === "SERVICES" ? "послуга" : `дост. ${av ?? 0}`;
                      return (
                        <option key={p.id} value={p.id}>{p.name} ({avTxt})</option>
                      );
                    })}
                  </select>
                </label>
                <label className="block w-24">
                  <span className="mb-1 block text-xs font-medium text-slate-600">К-сть</span>
                  <input name="qty" type="number" step="any" min="0" defaultValue={1} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
                </label>
                <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Додати + зарезервувати
                </button>
              </form>
            )}
          </Card>
        </div>

        {/* Дії */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Статус замовлення</h2>
            <p className="mb-4 text-xs text-slate-500">
              При додаванні позицій товар автоматично резервується на складі. Відвантаження
              списує резерв зі складу; скасування — повертає резерв.
            </p>

            {canEdit ? (
              <div className="space-y-3">
                {isOpen && (
                  <form action={setOrderStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={order.id} />
                    <select name="status" defaultValue={order.status} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                      <option value="NEW">Нове</option>
                      <option value="CONFIRMED">Підтверджено</option>
                      <option value="RESERVED">Зарезервовано</option>
                      <option value="PACKING">Комплектація</option>
                    </select>
                    <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">OK</button>
                  </form>
                )}

                {(isOpen) && (
                  <form action={shipOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <button className="w-full rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700">
                      🚚 Відправити (списати резерв)
                    </button>
                  </form>
                )}

                {order.status === "SHIPPED" && (
                  <form action={completeOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      ✅ Виконати
                    </button>
                  </form>
                )}

                {!isFinal && (
                  <form action={cancelOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <button className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                      ✖ Скасувати
                    </button>
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
