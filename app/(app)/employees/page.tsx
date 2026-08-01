import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { PageHeader, Card, Button, Field, Select, Badge } from "@/components/ui";
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
      <PageHeader title="Співробітники" subtitle={`Усього: ${users.length}`} icon="employees" />

      <div className="space-y-6 p-8">
        {canCreate && (
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-brand">
                <span className="text-lg leading-none">＋</span>
                Додати співробітника
              </summary>
              <form
                action={createUser}
                className="grid grid-cols-1 gap-4 border-t border-brand/10 px-6 py-5 md:grid-cols-2"
              >
                <Field name="fullName" label="ПІБ *" required />
                <Field name="email" label="Email *" type="email" required />
                <Field name="login" label="Логін" />
                <Field name="password" label="Пароль * (мін. 6)" type="password" required />
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Роль</span>
                  <Select name="role" defaultValue="MANAGER">
                    {ROLES.filter((r) => r !== "OWNER" || me.role === "OWNER").map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Керівник</span>
                  <Select name="managerId" defaultValue="">
                    <option value="">— не призначено —</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </Select>
                </label>
                <div className="md:col-span-2">
                  <Button type="submit">Створити співробітника</Button>
                </div>
              </form>
            </details>
          </Card>
        )}

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">ПІБ</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Роль</th>
                <th className="px-6 py-3 font-medium">Керівник</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 font-medium">Останній вхід</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-6 py-3">
                    <Link href={`/employees/${u.id}`} className="font-medium text-brand hover:underline">
                      {u.fullName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#cfc9ba]">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge className="bg-white/5 text-muted">{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="px-6 py-3 text-muted">{u.manager?.fullName ?? "—"}</td>
                  <td className="px-6 py-3">
                    {u.isActive ? (
                      <span className="text-xs font-medium text-emerald-400">● Активний</span>
                    ) : (
                      <span className="text-xs font-medium text-red-400">● Заблокований</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted">
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
