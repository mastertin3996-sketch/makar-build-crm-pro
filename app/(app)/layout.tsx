import { requireUser } from "@/lib/auth";
import { can, type ModuleKey } from "@/lib/permissions";
import { Sidebar, type NavItem } from "@/components/Sidebar";

// Усі пункти меню з прив'язкою до модуля прав та статусу реалізації
const NAV: (NavItem & { module: ModuleKey; implemented: boolean })[] = [
  { href: "/", label: "Dashboard", icon: "dashboard", module: "dashboard", implemented: true },
  { href: "/clients", label: "Клієнти", icon: "clients", module: "clients", implemented: true },
  { href: "/requests", label: "Заявки", icon: "requests", module: "requests", implemented: true },
  { href: "/catalog", label: "Каталог", icon: "catalog", module: "catalog", implemented: true },
  { href: "/warehouse", label: "Склад", icon: "warehouse", module: "warehouse", implemented: true },
  { href: "/orders", label: "Замовлення", icon: "orders", module: "orders", implemented: true },
  { href: "/logistics", label: "Логістика", icon: "logistics", module: "logistics", implemented: true },
  { href: "/messengers", label: "Месенджери", icon: "messengers", module: "messengers", implemented: true },
  { href: "/telephony", label: "Телефонія", icon: "telephony", module: "telephony", implemented: true },
  { href: "/documents", label: "Документообіг", icon: "documents", module: "documents", implemented: true },
  { href: "/finance", label: "Фінанси", icon: "finance", module: "finance", implemented: true },
  { href: "/reports", label: "Звіти", icon: "reports", module: "reports", implemented: true },
  { href: "/ai", label: "ШІ-помічник", icon: "ai", module: "ai", implemented: true },
  { href: "/employees", label: "Співробітники", icon: "employees", module: "employees", implemented: true },
  { href: "/audit", label: "Журнал дій", icon: "audit", module: "audit", implemented: true },
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
      <div className="relative flex-1 overflow-x-hidden">
        {/* Нерухомий фон лише в зоні контенту (праворуч від панелі) —
            звичайний background-attachment:fixed рахує позицію відносно
            viewport, а не цього блоку, тому фон фіксується окремим шаром
            з явним відступом на ширину панелі (16rem), а не через сам <main>. */}
        <div
          className="fixed inset-y-0 right-0 -z-10 bg-background bg-cover bg-center bg-no-repeat"
          style={{ left: "16rem", backgroundImage: "url('/bg-lion.png')" }}
        />
        <main className="relative">{children}</main>
      </div>
    </div>
  );
}
