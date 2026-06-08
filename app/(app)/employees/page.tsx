import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import type { Role } from "@prisma/client";
import { createUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const me = await requireUser();
  if (!can(me, "employees", "view")) redirect("/");
  const canCreate = can(me, "employees", "create");

  const [users, managers] = await Promise.all([
    prisma.user.findMany({
      include: { manager: true, _count: { select: { ownedRequests: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "ADMIN", "SALES_HEAD"] } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const ROLES = Object.keys(ROLE_LABELS) as Role[];

  return (
    <>
      <PageHeader title="Співробітники" subtitle={`Усього: ${users.length}`} />

      <div className="space-y-6 p-8">
        {canCreate && (
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-teal-600">
                <span className="text-lg leading-none">＋</span>
                Додати співробітника
              </summary>
              <form
                action={createUser}
                className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-2"
              >
                <Field name="fullName" label="ПІБ *" required />
                <Field name="email" label="Email *" type="email" required />
                <Field name="login" label="Логін" />
                <Field name="password" label="Пароль * (мін. 6)" type="password" required />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Роль</span>
                  <select name="role" defaultValue="MANAGER" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    {ROLES.filter((r) => r !== "OWNER" || me.role === "OWNER").map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Керівник</span>
                  <select name="managerId" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    <option value="">— не призначено —</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
                  <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700">
                    Створити співробітника
                  </button>
                </div>
              </form>
            </details>
          </Card>
        )}

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">ПІБ</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Роль</th>
                <th className="px-6 py-3 font-medium">Керівник</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 font-medium">Останній вхід</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/employees/${u.id}`} className="font-medium text-teal-600 hover:underline">
                      {u.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{u.manager?.fullName ?? "—"}</td>
                  <td className="px-6 py-3">
                    {u.isActive ? (
                      <span className="text-xs font-medium text-emerald-600">● Активний</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">● Заблокований</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function Field({
  name, label, type = "text", required = false,
}: {
  name: string; label: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}
