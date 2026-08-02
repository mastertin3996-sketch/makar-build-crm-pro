import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Badge, EmptyRow } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Вхід у систему",
  LOGOUT: "Вихід із системи",
  LOGIN_FAILED: "Невдалий вхід",
  SESSIONS_TERMINATED: "Завершено всі сесії",
  CREATE_REQUEST: "Створення заявки",
  STATUS_CHANGE: "Зміна статусу",
  CREATE_CLIENT: "Створення клієнта",
  CREATE_PRODUCT: "Створення товару",
  ADD_INTERACTION: "Додано комунікацію",
  USER_CREATED: "Створено співробітника",
  USER_BLOCKED: "Заблоковано співробітника",
  USER_UNBLOCKED: "Розблоковано співробітника",
  USER_ROLE_CHANGED: "Зміна ролі",
  USER_PASSWORD_RESET: "Скидання пароля",
  USER_MANAGER_ASSIGNED: "Призначено керівника",
  USER_PERMISSIONS_UPDATED: "Оновлено права доступу",
  STOCK_RECEIPT: "Склад: надходження",
  STOCK_WRITEOFF: "Склад: списання",
  STOCK_TRANSFER: "Склад: переміщення",
  STOCK_RESERVE: "Склад: резервування",
  STOCK_UNRESERVE: "Склад: зняття резерву",
  STOCK_INVENTORY: "Склад: інвентаризація",
  STOCK_RETURN: "Склад: повернення",
  ORDER_CREATED: "Створено замовлення",
  ORDER_IMPORTED: "Імпорт замовлення з каналу",
  ORDER_ITEM_ADDED: "Додано позицію замовлення",
  ORDER_STATUS: "Зміна статусу замовлення",
  ORDER_SHIPPED: "Замовлення відправлено",
  ORDER_COMPLETED: "Замовлення виконано",
  ORDER_CANCELLED: "Замовлення скасовано",
  SHIPMENT_CREATED: "Створено ТТН",
  SHIPMENT_STATUS: "Оновлено статус доставки",
  SHIPMENT_RETURNED: "Оформлено повернення",
  SHIPMENT_CANCELLED: "Скасовано ТТН",
  DOCUMENT_CREATED: "Створено документ",
  DOCUMENT_STATUS: "Зміна статусу документа",
  DOCUMENT_DELETED: "Видалено документ",
  DOCUMENT_EXPORT_DOC: "Експорт документа (Word)",
  DOCUMENT_EXPORT_XLS: "Експорт документа (Excel)",
  PAYMENT_CREATED: "Створено оплату",
  PAYMENT_CONFIRMED: "Підтверджено оплату",
  PAYMENT_REFUNDED: "Повернення коштів",
  PAYMENT_FAILED: "Оплату відхилено",
  MESSAGE_SENT: "Надіслано повідомлення",
  MESSAGE_RECEIVED: "Отримано повідомлення",
  CONVERSATION_CREATED: "Створено діалог",
  CALL_LOGGED: "Записано дзвінок",
  CALL_RECEIVED: "Вхідний дзвінок",
  CALL_AUTO_LEAD: "Авто-лід із дзвінка",
  CALL_LEAD_CREATED: "Створено лід із дзвінка",
  AI_GENERATE: "ШІ-генерація",
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AuditPage() {
  const me = await requireUser();
  if (!can(me, "audit", "view")) redirect("/");

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Журнал дій користувачів"
        subtitle="Останні 200 подій"
        icon="audit"
      />
      <div className="p-8">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Дата і час</th>
                <th className="px-6 py-3 font-medium">Користувач</th>
                <th className="px-6 py-3 font-medium">Дія</th>
                <th className="px-6 py-3 font-medium">Деталі</th>
                <th className="px-6 py-3 font-medium">IP</th>
                <th className="px-6 py-3 font-medium">Пристрій</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-6 py-3 text-[#b8935a]">{fmt(l.createdAt)}</td>
                  <td className="px-6 py-3 text-[#b8935a]">{l.user?.fullName ?? "—"}</td>
                  <td className="px-6 py-3">
                    <Badge className="bg-white/5 text-muted">{ACTION_LABELS[l.action] ?? l.action}</Badge>
                  </td>
                  <td className="px-6 py-3 text-muted">{l.details ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">{l.ip ?? "—"}</td>
                  <td className="max-w-xs truncate px-6 py-3 text-muted" title={l.userAgent ?? ""}>
                    {l.userAgent ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <EmptyRow colSpan={6}>Журнал порожній</EmptyRow>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
