import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canFinance } from "@/lib/permissions";
import { PageHeader, Card, Button, Select, Field, Badge, EmptyState } from "@/components/ui";
import { CATEGORY_LABELS, formatUAH } from "@/lib/labels";
import type { ProductCategory } from "@prisma/client";
import { createProduct } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as ProductCategory[];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const me = await requireUser();
  const showCost = canFinance(me, "costPrices");
  const showMargin = canFinance(me, "margin");
  const { cat } = await searchParams;
  const categoryFilter = CATEGORY_KEYS.includes(cat as ProductCategory)
    ? (cat as ProductCategory)
    : undefined;

  const [products, counts] = await Promise.all([
    prisma.product.findMany({
      where: { category: categoryFilter },
      orderBy: { name: "asc" },
    }),
    prisma.product.groupBy({ by: ["category"], _count: true }),
  ]);

  const countOf = (c: ProductCategory) =>
    counts.find((x) => x.category === c)?._count ?? 0;
  const total = counts.reduce((s, c) => s + c._count, 0);

  return (
    <>
      <PageHeader title="Каталог товарів" subtitle={`Позицій: ${total}`} icon="catalog" />

      <div className="p-8 space-y-6">
        {/* Додати товар */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand transition-colors hover:text-brand-light">
              <span className="text-lg leading-none">＋</span>
              Додати товар
            </summary>
            <form
              action={createProduct}
              className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-3"
            >
              <Field name="name" label="Назва *" required className="md:col-span-2" />
              <Field name="sku" label="Артикул" />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Категорія
                </span>
                <Select name="category">
                  {CATEGORY_KEYS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </label>
              <Field name="unit" label="Одиниця" placeholder="шт" />
              <Field name="stock" label="Залишок" type="number" step="any" />
              <Field name="costPrice" label="Собівартість" type="number" step="any" />
              <Field name="price" label="Ціна продажу" type="number" step="any" />
              <Field name="minPrice" label="Мінімальна ціна" type="number" step="any" />
              <Field name="description" label="Опис" className="md:col-span-3" />
              <div className="md:col-span-3">
                <Button type="submit">
                  Зберегти товар
                </Button>
              </div>
            </form>
          </details>
        </Card>

        {/* Категорії */}
        <div className="flex flex-wrap gap-2">
          <Chip href="/catalog" active={!categoryFilter} label={`Усі (${total})`} />
          {CATEGORY_KEYS.filter((c) => countOf(c) > 0).map((c) => (
            <Chip
              key={c}
              href={`/catalog?cat=${c}`}
              active={categoryFilter === c}
              label={`${CATEGORY_LABELS[c]} (${countOf(c)})`}
            />
          ))}
        </div>

        {/* Сітка товарів */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const margin =
              p.price > 0
                ? Math.round(((p.price - p.costPrice) / p.price) * 100)
                : 0;
            const lowStock = p.category !== "SERVICES" && p.stock <= 20;
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge className="bg-white/5 text-muted">
                    {CATEGORY_LABELS[p.category]}
                  </Badge>
                  {p.sku && (
                    <span className="text-xs text-muted">{p.sku}</span>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {p.name}
                </h3>
                {p.description && (
                  <p className="mt-1 text-xs text-muted">{p.description}</p>
                )}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {formatUAH(p.price)}
                    </div>
                    {(showCost || showMargin) && (
                      <div className="text-xs text-muted">
                        {showCost && <>собів. {formatUAH(p.costPrice)}</>}
                        {showCost && showMargin && " · "}
                        {showMargin && <>маржа {margin}%</>}
                      </div>
                    )}
                  </div>
                  {p.category !== "SERVICES" && (
                    <div
                      className={`text-right text-xs ${
                        lowStock ? "text-red-400" : "text-muted"
                      }`}
                    >
                      <div className="font-medium">
                        {p.stock} {p.unit}
                      </div>
                      <div>{lowStock ? "мало на складі" : "на складі"}</div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {products.length === 0 && (
            <div className="col-span-full">
              <EmptyState title="Товарів не знайдено" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-brand text-background"
          : "bg-white/5 text-muted ring-1 ring-brand/15 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}
