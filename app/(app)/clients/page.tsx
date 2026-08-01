import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Field, EmptyRow } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import { createClient } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query } },
            { phone: { contains: query } },
            { company: { contains: query } },
          ],
        }
      : undefined,
    include: { _count: { select: { requests: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Клієнти"
        subtitle={`Усього: ${clients.length}`}
        icon="clients"
      />

      <div className="p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form className="flex gap-2" action="/clients">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Пошук за ПІБ, телефоном, компанією…"
              className="w-80 rounded-lg border border-brand/15 bg-black/25 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-brand"
            />
            <Button type="submit" variant="secondary">
              Знайти
            </Button>
          </form>
        </div>

        {/* Додати клієнта */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand transition-colors hover:text-brand-light">
              <span className="text-lg leading-none transition-transform group-open:rotate-45">＋</span>
              Додати клієнта
            </summary>
            <form
              action={createClient}
              className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-2"
            >
              <Field name="fullName" label="ПІБ *" required />
              <Field name="phone" label="Телефон *" required placeholder="+380…" />
              <Field name="email" label="Email" type="email" />
              <Field name="company" label="Компанія" />
              <Field name="edrpou" label="ЄДРПОУ" />
              <Field name="ipn" label="ІПН" />
              <Field name="address" label="Адреса доставки" className="md:col-span-2" />
              <Field name="notes" label="Примітки" className="md:col-span-2" />
              <div className="md:col-span-2">
                <Button type="submit">Зберегти клієнта</Button>
              </div>
            </form>
          </details>
        </Card>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">ПІБ</th>
                <th className="px-6 py-3 font-medium">Телефон</th>
                <th className="px-6 py-3 font-medium">Компанія</th>
                <th className="px-6 py-3 font-medium">Заявок</th>
                <th className="px-6 py-3 font-medium">Додано</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {clients.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-3">
                    <Link
                      href={`/clients/${c.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {c.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#cfc9ba]">{c.phone}</td>
                  <td className="px-6 py-3 text-muted">{c.company ?? "—"}</td>
                  <td className="px-6 py-3 text-[#cfc9ba]">{c._count.requests}</td>
                  <td className="px-6 py-3 text-muted">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <EmptyRow colSpan={5}>Клієнтів не знайдено</EmptyRow>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
