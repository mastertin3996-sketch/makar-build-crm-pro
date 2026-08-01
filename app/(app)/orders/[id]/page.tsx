import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button, Select, Input, Badge, EmptyRow } from "@/components/ui";
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
        icon="orders"
        action={
          <Link href="/orders" className="text-sm text-muted hover:text-[#cfc9ba]">← До списку</Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className={ORDER_STATUS_COLORS[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              <span className="text-sm text-muted">Створено: {formatDate(order.createdAt)}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Клієнт</dt>
                <dd className="mt-0.5">
                  {order.client ? (
                    <Link href={`/clients/${order.client.id}`} className="text-brand hover:underline">{order.client.fullName}</Link>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Менеджер</dt>
                <dd className="mt-0.5 text-[#cfc9ba]">{order.owner?.fullName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Склад резервування</dt>
                <dd className="mt-0.5 text-[#cfc9ba]">{order.warehouse?.name ?? "за замовчуванням"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Сума</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{formatUAH(order.totalAmount)}</dd>
              </div>
              {order.comment && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted">Коментар</dt>
                  <dd className="mt-0.5 text-[#cfc9ba]">{order.comment}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Позиції */}
          <Card>
            <div className="flex items-center justify-between border-b border-brand/10 px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">Позиції замовлення</h2>
              <span className="text-xs text-muted">Зарезервовано одиниць: {totalReserved}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Найменування</th>
                  <th className="px-6 py-3 text-right font-medium">К-сть</th>
                  <th className="px-6 py-3 text-right font-medium">Резерв</th>
                  <th className="px-6 py-3 text-right font-medium">Ціна</th>
                  <th className="px-6 py-3 text-right font-medium">Сума</th>
                  {canEdit && isOpen && <th className="px-6 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand/5">
                {order.items.map((i) => {
                  const short = i.productId && i.product?.category !== "SERVICES" && i.reservedQty < i.quantity;
                  return (
                    <tr key={i.id}>
                      <td className="px-6 py-3 text-[#cfc9ba]">{i.name}</td>
                      <td className="px-6 py-3 text-right text-[#cfc9ba]">{i.quantity}</td>
                      <td className="px-6 py-3 text-right">
                        {i.product?.category === "SERVICES" || !i.productId ? (
                          <span className="text-muted/50">—</span>
                        ) : (
                          <span className={short ? "text-red-400" : "text-emerald-400"}>
                            {i.reservedQty}
                            {short && " ⚠"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-[#cfc9ba]">{formatUAH(i.price)}</td>
                      <td className="px-6 py-3 text-right font-medium text-[#cfc9ba]">{formatUAH(i.price * i.quantity)}</td>
                      {canEdit && isOpen && (
                        <td className="px-6 py-3 text-right">
                          <form action={removeOrderItem}>
                            <input type="hidden" name="id" value={i.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10">видалити</Button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {order.items.length === 0 && (
                  <EmptyRow colSpan={6}>Позиції ще не додані</EmptyRow>
                )}
              </tbody>
            </table>

            {canEdit && isOpen && (
              <form action={addOrderItem} className="flex flex-wrap items-end gap-3 border-t border-brand/10 px-6 py-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="block flex-1 min-w-[200px]">
                  <span className="mb-1 block text-xs font-medium text-muted">Товар</span>
                  <Select name="productId">
                    {products.map((p) => {
                      const av = availMap.get(p.id);
                      const avTxt = p.category === "SERVICES" ? "послуга" : `дост. ${av ?? 0}`;
                      return (
                        <option key={p.id} value={p.id}>{p.name} ({avTxt})</option>
                      );
                    })}
                  </Select>
                </label>
                <label className="block w-24">
                  <span className="mb-1 block text-xs font-medium text-muted">К-сть</span>
                  <Input name="qty" type="number" step="any" min="0" defaultValue={1} />
                </label>
                <Button type="submit">
                  Додати + зарезервувати
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Дії */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Статус замовлення</h2>
            <p className="mb-4 text-xs text-muted">
              При додаванні позицій товар автоматично резервується на складі. Відвантаження
              списує резерв зі складу; скасування — повертає резерв.
            </p>

            {canEdit ? (
              <div className="space-y-3">
                {isOpen && (
                  <form action={setOrderStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={order.id} />
                    <Select name="status" defaultValue={order.status} className="flex-1">
                      <option value="NEW">Нове</option>
                      <option value="CONFIRMED">Підтверджено</option>
                      <option value="RESERVED">Зарезервовано</option>
                      <option value="PACKING">Комплектація</option>
                    </Select>
                    <Button type="submit" variant="secondary">OK</Button>
                  </form>
                )}

                {(isOpen) && (
                  <form action={shipOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <Button type="submit" className="w-full">
                      🚚 Відправити (списати резерв)
                    </Button>
                  </form>
                )}

                {order.status === "SHIPPED" && (
                  <form action={completeOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <Button type="submit" className="w-full">
                      ✅ Виконати
                    </Button>
                  </form>
                )}

                {!isFinal && (
                  <form action={cancelOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <Button type="submit" variant="danger" className="w-full">
                      ✖ Скасувати
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Немає прав на редагування</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
