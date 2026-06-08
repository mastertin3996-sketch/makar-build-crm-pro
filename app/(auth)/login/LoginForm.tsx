"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Email або логін
        </span>
        <input
          name="identifier"
          autoComplete="username"
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
          placeholder="owner@makar.ua"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Пароль
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
          placeholder="••••••••"
        />
      </label>

      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Вхід…" : "Увійти"}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600"
          title="У прототипі недоступно"
        >
          Забули пароль?
        </button>
        <span className="text-slate-300" title="2FA — наступний етап">
          🔐 2FA (скоро)
        </span>
      </div>
    </form>
  );
}
