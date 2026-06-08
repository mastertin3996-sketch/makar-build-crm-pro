import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
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
      />

      <div className="p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form className="flex gap-2" action="/clients">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Пошук за ПІБ, телефоном, компанією…"
              className="w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
              Знайти
            </button>
          </form>
        </div>

        {/* Додати клієнта */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-teal-600">
              <span className="text-lg leading-none">＋</span>
              Додати клієнта
            </summary>
            <form
              action={createClient}
              className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-2"
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
                <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Зберегти клієнта
                </button>
              </div>
            </form>
          </details>
        </Card>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">ПІБ</th>
                <th className="px-6 py-3 font-medium">Телефон</th>
                <th className="px-6 py-3 font-medium">Компанія</th>
                <th className="px-6 py-3 font-medium">Заявок</th>
                <th className="px-6 py-3 font-medium">Додано</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link
                      href={`/clients/${c.id}`}
                      className="font-medium text-teal-600 hover:underline"
                    >
                      {c.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{c.phone}</td>
                  <td className="px-6 py-3 text-slate-500">{c.company ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-600">{c._count.requests}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Клієнтів не знайдено
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

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}
