import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button, Select as UiSelect, Input, Badge, EmptyRow } from "@/components/ui";
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
    { label: "Складів", value: String(warehouses.length), accent: "text-[#cfc9ba]" },
    { label: "Позицій на складах", value: String(items.length), accent: "text-indigo-400" },
    { label: "Загальний залишок", value: String(totalQty), accent: "text-brand" },
    { label: "Зарезервовано", value: String(totalReserved), accent: "text-amber-400" },
    { label: "Дефіцитних позицій", value: String(lowCount), accent: "text-red-400" },
  ];

  return (
    <>
      <PageHeader title="Складський облік" subtitle={`Складів: ${warehouses.length}`} icon="warehouse" />

      <div className="space-y-6 p-8">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-sm text-muted">{s.label}</div>
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
          <div className="border-b border-brand/10 px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">Залишки по складах</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Товар</th>
                <th className="px-6 py-3 font-medium">Склад</th>
                <th className="px-6 py-3 text-right font-medium">Залишок</th>
                <th className="px-6 py-3 text-right font-medium">Резерв</th>
                <th className="px-6 py-3 text-right font-medium">Доступно</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {items.map((i) => {
                const available = i.quantity - i.reserved;
                const low = available <= 20 && i.product.category !== "SERVICES";
                return (
                  <tr key={i.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-[#cfc9ba]">{i.product.name}</td>
                    <td className="px-6 py-3 text-muted">{i.warehouse.name}</td>
                    <td className="px-6 py-3 text-right text-[#cfc9ba]">
                      {i.quantity} {i.product.unit}
                    </td>
                    <td className="px-6 py-3 text-right text-amber-400">{i.reserved || "—"}</td>
                    <td className={`px-6 py-3 text-right font-medium ${low ? "text-red-400" : "text-foreground"}`}>
                      {available} {low && "⚠"}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <EmptyRow colSpan={5}>Залишків немає</EmptyRow>
              )}
            </tbody>
          </table>
        </Card>

        {/* Журнал рухів */}
        <Card>
          <div className="border-b border-brand/10 px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">Журнал рухів</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Дата</th>
                <th className="px-6 py-3 font-medium">Операція</th>
                <th className="px-6 py-3 font-medium">Товар</th>
                <th className="px-6 py-3 font-medium">Склад</th>
                <th className="px-6 py-3 text-right font-medium">К-сть</th>
                <th className="px-6 py-3 font-medium">Примітка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-6 py-3 text-muted">{fmtDateTime(m.createdAt)}</td>
                  <td className="px-6 py-3">
                    <Badge className={MOVEMENT_COLORS[m.type]}>
                      {MOVEMENT_ICONS[m.type]} {MOVEMENT_LABELS[m.type]}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-[#cfc9ba]">{m.product.name}</td>
                  <td className="px-6 py-3 text-muted">
                    {m.warehouse.name}
                    {m.toWarehouse ? ` → ${m.toWarehouse.name}` : ""}
                  </td>
                  <td className="px-6 py-3 text-right text-[#cfc9ba]">{m.quantity}</td>
                  <td className="px-6 py-3 text-muted">{m.note ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <EmptyRow colSpan={6}>Рухів ще не було</EmptyRow>
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
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-[#cfc9ba]">
          {title}
          <span className="text-muted transition-transform group-open:rotate-180">▾</span>
        </summary>
        <form action={action} className="space-y-3 border-t border-brand/10 px-5 py-4">
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
            <span className="mb-1 block text-xs font-medium text-muted">
              {qtyLabel ?? "Кількість"}
            </span>
            <Input name="qty" type="number" step="any" min="0" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Примітка</span>
            <Input name="note" />
          </label>
          <Button type="submit" className="w-full">
            Виконати
          </Button>
        </form>
      </details>
    </Card>
  );
}

// Локальна обгортка "підписаний select" — у спільному UI-кіті немає готового
// LabeledSelect, тож лишаємо тонку обгортку навколо базового Select із @/components/ui.
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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <UiSelect name={name}>{children}</UiSelect>
    </label>
  );
}
