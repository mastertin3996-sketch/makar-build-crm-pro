import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader, Card, Button, EmptyRow } from "@/components/ui";
import { terminateAllAction } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function SessionsPage() {
  const me = await requireUser();
  const sessions = await prisma.session.findMany({
    where: { userId: me.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Мій профіль та сесії"
        subtitle={`${me.fullName} · ${ROLE_LABELS[me.role]}`}
        icon="sessions"
        action={
          <form action={terminateAllAction}>
            <Button type="submit" variant="danger">🚪 Завершити всі сесії</Button>
          </form>
        }
      />

      <div className="space-y-6 p-8">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Обліковий запис</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            <Info label="ПІБ" value={me.fullName} />
            <Info label="Email" value={me.email} />
            <Info label="Роль" value={ROLE_LABELS[me.role]} />
            <Info label="Останній вхід" value={me.lastLoginAt ? fmt(me.lastLoginAt) : "—"} />
            <Info label="2FA" value={me.twoFactorEnabled ? "Увімкнено" : "Вимкнено (скоро)"} />
          </dl>
        </Card>

        <Card>
          <div className="border-b border-brand/10 px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">Активні пристрої</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Пристрій / ОС</th>
                <th className="px-6 py-3 font-medium">Браузер</th>
                <th className="px-6 py-3 font-medium">IP</th>
                <th className="px-6 py-3 font-medium">Місцезнаходження</th>
                <th className="px-6 py-3 font-medium">Вхід</th>
                <th className="px-6 py-3 font-medium">Активність</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 text-[#b8935a]">{s.device ?? "—"}</td>
                  <td className="px-6 py-3 text-[#b8935a]">{s.browser ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">{s.ip ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">{s.location ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">{fmt(s.createdAt)}</td>
                  <td className="px-6 py-3 text-muted">{fmt(s.lastSeenAt)}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <EmptyRow colSpan={6}>Активних сесій немає</EmptyRow>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-foreground">Захист (наступний етап)</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "2FA (Email / Telegram / Google Authenticator)",
              "CAPTCHA",
              "Обмеження за IP",
              "Автовихід після бездіяльності",
              "Захист від підбору пароля",
            ].map((x) => (
              <span key={x} className="cursor-not-allowed rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted">
                {x}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-[#b8935a]">{value}</dd>
    </div>
  );
}
