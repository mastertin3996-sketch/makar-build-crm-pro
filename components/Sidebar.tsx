"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/permissions";
import { logoutAction } from "@/app/(auth)/actions";
import { Icon, type IconName } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: IconName };

export function Sidebar({
  items,
  soon,
  user,
}: {
  items: NavItem[];
  soon: string[];
  user: { fullName: string; role: Role };
}) {
  const pathname = usePathname();
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#0a0a0b] text-[#cfc9ba]">
      <div className="border-b border-brand/10 px-5 py-5">
        <div className="text-lg font-bold leading-tight text-foreground">
          MAKAR BUILD
        </div>
        <div className="text-xs font-semibold tracking-widest text-brand">
          CRM PRO
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand/10 text-brand"
                  : "text-[#a9a190] hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" />
              )}
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {soon.length > 0 && (
          <>
            <div className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              Скоро
            </div>
            {soon.map((label) => (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted/60"
              >
                <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-current opacity-40" />
                {label}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-brand/10 px-4 py-4">
        <Link
          href="/sessions"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-background">
            {initials || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.fullName}
            </span>
            <span className="block text-xs text-brand">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
        </Link>
        <form action={logoutAction} className="mt-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#cfc9ba] transition-colors hover:bg-white/10 hover:text-foreground">
            <Icon name="logout" className="h-4 w-4" />
            Вийти
          </button>
        </form>
      </div>
    </aside>
  );
}
