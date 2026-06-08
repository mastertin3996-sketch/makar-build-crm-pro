"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/permissions";
import { logoutAction } from "@/app/(auth)/actions";

export type NavItem = { href: string; label: string; icon: string };

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

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="border-b border-slate-700/60 px-5 py-5">
        <div className="text-lg font-bold leading-tight text-white">
          MAKAR BUILD
        </div>
        <div className="text-xs font-semibold tracking-widest text-teal-400">
          CRM PRO
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {soon.length > 0 && (
          <>
            <div className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Скоро
            </div>
            {soon.map((label) => (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500"
              >
                <span className="text-base opacity-40">○</span>
                {label}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-slate-700/60 px-4 py-4">
        <Link
          href="/sessions"
          className="block rounded-lg px-1 py-1 transition-colors hover:bg-slate-800"
        >
          <div className="truncate text-sm font-medium text-white">
            {user.fullName}
          </div>
          <div className="text-xs text-teal-400">{ROLE_LABELS[user.role]}</div>
        </Link>
        <form action={logoutAction} className="mt-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700">
            🚪 Вийти
          </button>
        </form>
      </div>
    </aside>
  );
}
