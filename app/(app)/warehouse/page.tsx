import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/ui";
import {
  MOVEMENT_LABELS,
  MOVEMENT_ICONS,
  MOVEMENT_COLORS,
} from "@/lib/labels";
import {
  receipt,
  writeoff,
  transfer,
  reserve,
  unreserve,
  inventory,
  returnStock,
} from "./actions";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function WarehousePage() {
  const me = await requireUser();
  if (!can(me, "warehouse", "view")) redirect("/");
  const canCreate = can(me, "warehouse", "create");
  const canEdit = can(me, "warehouse", "edit");

  const [warehouses, products, items, movements] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({
      where: { category: { not: "SERVICES" } },
      orderBy: { name: "asc" },
    }),
    prisma.stockItem.findMany({
      include: { product: true, warehouse: true },
      orderBy: [{ warehouse: { createdAt: "asc" } }, { product: { name: "asc" } }],
    }),
    prisma.stockMovement.findMany({
      include: { product: true, warehouse: true, toWarehouse: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalReserved = items.reduce((s, i) => s + i.reserved, 0);
  const lowCount = items.filter(
    (i) => i.quantity - i.reserved <= 20 && i.product.category !== "SERVICES"
  ).length;

  const stats = [
    { label: "Складів", value: String(warehouses.length), accent: "text-slate-700" },
    { label: "Позицій на складах", value: String(items.length), accent: "text-indigo-600" },
    { label: "Загальний залишок", value: String(totalQty), accent: "text-teal-600" },
    { label: "Зарезервовано", value: String(totalReserved), accent: "text-amber-600" },
    { label: "Дефіцитних позицій", value: String(lowCount), accent: "text-red-600" },
  ];

  return (
    <>
      <PageHeader title="Складський облік" subtitle={`Складів: ${warehouses.length}`} />

      <div className="space-y-6 p-8">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className={`mt-2 text-2xl font-bold ${s.accent}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Операції */}
        {(canCreate || canEdit) && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {canCreate && (
              <Op title="📥 Надходження" action={receipt} products={products} warehouses={warehouses} />
            )}
            {canEdit && (
              <Op title="📤 Списання" action={writeoff} products={products} warehouses={warehouses} />
            )}
            {canEdit && (
              <Op title="🔁 Переміщення" action={transfer} products={products} warehouses={warehouses} withTarget />
            )}
            {canEdit && (
              <Op title="🔒 Резервування" action={reserve} products={products} warehouses={warehouses} />
            )}
            {canEdit && (
              <Op title="🔓 Зняти резерв" action={unreserve} products={products} warehouses={warehouses} />
            )}
            {canEdit && (
              <Op title="🧮 Інвентаризація" action={inventory} products={products} warehouses={warehouses} qtyLabel="Фактичний залишок" />
            )}
            {canCreate && (
              <Op title="↩️ Повернення" action={returnStock} products={products} warehouses={warehouses} />
            )}
          </div>
        )}

        {/* Залишки */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Залишки по складах</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Товар</th>
                <th className="px-6 py-3 font-medium">Склад</th>
                <th className="px-6 py-3 text-right font-medium">Залишок</th>
                <th className="px-6 py-3 text-right font-medium">Резерв</th>
                <th className="px-6 py-3 text-right font-medium">Доступно</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => {
                const available = i.quantity - i.reserved;
                const low = available <= 20 && i.product.category !== "SERVICES";
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{i.product.name}</td>
                    <td className="px-6 py-3 text-slate-500">{i.warehouse.name}</td>
                    <td className="px-6 py-3 text-right text-slate-700">
                      {i.quantity} {i.product.unit}
                    </td>
                    <td className="px-6 py-3 text-right text-amber-600">{i.reserved || "—"}</td>
                    <td className={`px-6 py-3 text-right font-medium ${low ? "text-red-600" : "text-slate-900"}`}>
                      {available} {low && "⚠"}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Залишків немає
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Журнал рухів */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Журнал рухів</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Дата</th>
                <th className="px-6 py-3 font-medium">Операція</th>
                <th className="px-6 py-3 font-medium">Товар</th>
                <th className="px-6 py-3 font-medium">Склад</th>
                <th className="px-6 py-3 text-right font-medium">К-сть</th>
                <th className="px-6 py-3 font-medium">Примітка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-3 text-slate-500">{fmtDateTime(m.createdAt)}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${MOVEMENT_COLORS[m.type]}`}>
                      {MOVEMENT_ICONS[m.type]} {MOVEMENT_LABELS[m.type]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-700">{m.product.name}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {m.warehouse.name}
                    {m.toWarehouse ? ` → ${m.toWarehouse.name}` : ""}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">{m.quantity}</td>
                  <td className="px-6 py-3 text-slate-400">{m.note ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Рухів ще не було
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

type OpProps = {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  products: { id: string; name: string; unit: string }[];
  warehouses: { id: string; name: string }[];
  withTarget?: boolean;
  qtyLabel?: string;
};

function Op({ title, action, products, warehouses, withTarget, qtyLabel }: OpProps) {
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-slate-800">
          {title}
          <span className="text-slate-400 group-open:rotate-180">▾</span>
        </summary>
        <form action={action} className="space-y-3 border-t border-slate-100 px-5 py-4">
          <Select name="productId" label="Товар">
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select name="warehouseId" label={withTarget ? "Зі складу" : "Склад"}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
          {withTarget && (
            <Select name="toWarehouseId" label="На склад">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {qtyLabel ?? "Кількість"}
            </span>
            <input
              name="qty"
              type="number"
              step="any"
              min="0"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Примітка</span>
            <input
              name="note"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <button className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Виконати
          </button>
        </form>
      </details>
    </Card>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        name={name}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
      >
        {children}
      </select>
    </label>
  );
}
