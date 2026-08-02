import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  can,
  ROLE_LABELS,
  SCOPE_LABELS,
  MODULES,
  ACTIONS,
  FINANCE_PERMS,
  effectiveMatrix,
  effectiveFinance,
} from "@/lib/permissions";
import { PageHeader, Card, Button, Select, Input, Badge } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import type { Role, RequestScope } from "@prisma/client";
import {
  changeRole,
  toggleBlock,
  resetPassword,
  assignManager,
  updatePermissions,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EmployeeCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "employees", "view")) redirect("/");
  const canEdit = can(me, "employees", "edit");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { manager: true },
  });
  if (!user) notFound();

  const matrix = effectiveMatrix(user);
  const finance = effectiveFinance(user);
  const managers = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "ADMIN", "SALES_HEAD"] }, id: { not: user.id } },
    orderBy: { fullName: "asc" },
  });
  const ROLES = Object.keys(ROLE_LABELS) as Role[];
  const SCOPES = Object.keys(SCOPE_LABELS) as RequestScope[];
  const usingDefaults = !user.permissions;

  return (
    <>
      <PageHeader
        title={user.fullName}
        subtitle={`${ROLE_LABELS[user.role]} · ${user.email}`}
        icon="employees"
        action={
          <Link href="/employees" className="text-sm text-muted hover:text-[#b8935a]">
            ← До списку
          </Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-3">
        {/* Ліворуч — швидкі дії */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">Обліковий запис</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Статус" value={user.isActive ? "Активний" : "Заблокований"} />
              <Row label="Логін" value={user.login ?? "—"} />
              <Row label="Керівник" value={user.manager?.fullName ?? "—"} />
              <Row label="Останній вхід" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"} />
              <Row label="2FA" value={user.twoFactorEnabled ? "Увімкнено" : "Вимкнено"} />
            </dl>
          </Card>

          {canEdit && (
            <>
              <Card className="p-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Роль</h3>
                <form action={changeRole} className="flex gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <Select name="role" defaultValue={user.role} className="flex-1">
                    {ROLES.filter((r) => r !== "OWNER" || me.role === "OWNER").map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">OK</Button>
                </form>
              </Card>

              <Card className="p-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Керівник</h3>
                <form action={assignManager} className="flex gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <Select name="managerId" defaultValue={user.managerId ?? ""} className="flex-1">
                    <option value="">— не призначено —</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary">OK</Button>
                </form>
              </Card>

              <Card className="p-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Скинути пароль</h3>
                <form action={resetPassword} className="flex gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <Input name="password" type="text" placeholder="Новий пароль (мін. 6)" className="flex-1" />
                  <Button type="submit" variant="secondary">Скинути</Button>
                </form>
              </Card>

              {user.role !== "OWNER" && user.id !== me.id && (
                <Card className="p-6">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Доступ</h3>
                  <form action={toggleBlock}>
                    <input type="hidden" name="id" value={user.id} />
                    <Button type="submit" variant={user.isActive ? "danger" : "primary"} className="w-full">
                      {user.isActive ? "🔒 Заблокувати" : "🔓 Розблокувати"}
                    </Button>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Праворуч — матриця прав */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Гнучке налаштування доступу
              </h2>
              {usingDefaults && (
                <Badge className="bg-amber-500/15 text-amber-300">Дефолти ролі</Badge>
              )}
            </div>
            <p className="mb-4 text-xs text-muted">
              Права за замовчуванням визначені роллю. Будь-яку клітинку можна перевизначити вручну.
            </p>

            <form action={updatePermissions} className="space-y-6">
              <input type="hidden" name="id" value={user.id} />

              {/* Матриця модулів */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted">
                      <th className="px-2 py-2 text-left font-medium">Модуль</th>
                      {ACTIONS.map((a) => (
                        <th key={a.key} className="px-2 py-2 text-center font-medium">{a.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand/5">
                    {MODULES.map((m) => (
                      <tr key={m.key}>
                        <td className="px-2 py-2 text-[#b8935a]">{m.label}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              name={`perm.${m.key}.${a.key}`}
                              defaultChecked={matrix[m.key][a.key]}
                              disabled={!canEdit}
                              className="h-4 w-4 accent-brand"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Контроль заявок */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Контроль заявок</h3>
                <Select name="scope" defaultValue={user.requestScope} disabled={!canEdit} className="md:w-72">
                  {SCOPES.map((s) => (
                    <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                  ))}
                </Select>
              </div>

              {/* Фінансові права */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Контроль фінансів</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {FINANCE_PERMS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-[#b8935a]">
                      <input
                        type="checkbox"
                        name={`fin.${f.key}`}
                        defaultChecked={finance[f.key]}
                        disabled={!canEdit}
                        className="h-4 w-4 accent-brand"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              {canEdit && (
                <Button type="submit">Зберегти права доступу</Button>
              )}
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-[#b8935a]">{value}</dd>
    </div>
  );
}
