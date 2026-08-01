"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { loginAction, type LoginState } from "../actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        name="identifier"
        label="Email або логін"
        placeholder="owner@makar.ua"
        autoComplete="username"
        autoFocus
      />

      <Field
        name="password"
        label="Пароль"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Вхід…" : "Увійти"}
      </Button>

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
