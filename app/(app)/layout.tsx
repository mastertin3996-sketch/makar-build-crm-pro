import { requireUser } from "@/lib/auth";
import { can, type ModuleKey } from "@/lib/permissions";
import { Sidebar, type NavItem } from "@/components/Sidebar";

// Усі пункти меню з прив'язкою до модуля прав та статусу реалізації
const NAV: (NavItem & { module: ModuleKey; implemented: boolean })[] = [
  { href: "/", label: "Dashboard", icon: "📊", module: "dashboard", implemented: true },
  { href: "/clients", label: "Клієнти", icon: "👥", module: "clients", implemented: true },
  { href: "/requests", label: "Заявки", icon: "📋", module: "requests", implemented: true },
  { href: "/catalog", label: "Каталог", icon: "📦", module: "catalog", implemented: true },
  { href: "/warehouse", label: "Склад", icon: "🏬", module: "warehouse", implemented: true },
  { href: "/orders", label: "Замовлення", icon: "🧾", module: "orders", implemented: true },
  { href: "/logistics", label: "Логістика", icon: "🚚", module: "logistics", implemented: true },
  { href: "/messengers", label: "Месенджери", icon: "💬", module: "messengers", implemented: true },
  { href: "/telephony", label: "Телефонія", icon: "📞", module: "telephony", implemented: true },
  { href: "/documents", label: "Документообіг", icon: "📄", module: "documents", implemented: true },
  { href: "/finance", label: "Фінанси", icon: "💰", module: "finance", implemented: true },
  { href: "/reports", label: "Звіти", icon: "📈", module: "reports", implemented: true },
  { href: "/ai", label: "ШІ-помічник", icon: "🤖", module: "ai", implemented: true },
  { href: "/employees", label: "Співробітники", icon: "🛡️", module: "employees", implemented: true },
  { href: "/audit", label: "Журнал дій", icon: "🧭", module: "audit", implemented: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const visible = NAV.filter((item) => can(user, item.module, "view"));
  const items = visible.filter((i) => i.implemented);
  const soon = visible.filter((i) => !i.implemented).map((i) => i.label);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={items}
        soon={soon}
        user={{ fullName: user.fullName, role: user.role }}
      />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
