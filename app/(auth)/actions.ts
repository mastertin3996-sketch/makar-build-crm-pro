"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { login, logout } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) {
    return { error: "Введіть email/логін та пароль" };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    undefined;
  const userAgent = h.get("user-agent") ?? undefined;

  const res = await login(identifier, password, { ip, userAgent });
  if (!res.ok) return { error: res.error };

  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
