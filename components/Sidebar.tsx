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
    <aside className="sidebar-glow flex w-64 shrink-0 flex-col text-[#b8935a]">
      <div className="border-b border-brand/10 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- статичний PNG, оптимізатор next/image відхиляє цей файл (400) */}
        <img src="/logo.png" alt="MAKAR BUILD CRM PRO" className="h-auto w-full" />
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "gold-metal"
                  : "text-[#b8935a] hover:bg-white/5 hover:text-foreground"
              }`}
            >
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
          <span className="gold-metal flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.fullName}
            </span>
            <span className="block text-xs text-[#b8935a]">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
        </Link>
        <form action={logoutAction} className="mt-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#b8935a] transition-colors hover:bg-white/10 hover:text-foreground">
            <Icon name="logout" className="h-4 w-4" />
            Вийти
          </button>
        </form>
      </div>
    </aside>
  );
}
