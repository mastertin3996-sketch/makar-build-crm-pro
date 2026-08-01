import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вхід — MAKAR BUILD CRM PRO" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px circle at 20% 15%, rgba(212,175,55,0.14), transparent 60%), radial-gradient(500px circle at 85% 85%, rgba(212,175,55,0.10), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-foreground">MAKAR BUILD</div>
          <div className="text-sm font-semibold tracking-widest text-brand">
            CRM PRO
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-7 shadow-popover">
          <h1 className="mb-1 text-lg font-bold text-foreground">Вхід у систему</h1>
          <p className="mb-5 text-sm text-muted">
            Введіть дані облікового запису
          </p>
          <LoginForm />
        </div>

        <div className="mt-6 rounded-xl border border-brand/10 bg-white/5 p-4 text-xs text-[#cfc9ba]">
          <div className="mb-1 font-semibold text-foreground">Демо-доступи:</div>
          <div>Власник — <span className="text-brand-light">owner@makar.ua</span> / <span className="text-brand-light">owner1234</span></div>
          <div>Менеджер — <span className="text-brand-light">manager@makar.ua</span> / <span className="text-brand-light">manager1234</span></div>
          <div>Бухгалтер — <span className="text-brand-light">buh@makar.ua</span> / <span className="text-brand-light">buh1234</span></div>
        </div>
      </div>
    </div>
  );
}
