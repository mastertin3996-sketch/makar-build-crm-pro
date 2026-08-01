import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вхід — MAKAR BUILD CRM PRO" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 20% 15%, rgba(20,184,166,0.18), transparent 60%), radial-gradient(500px circle at 85% 85%, rgba(20,184,166,0.12), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-white">MAKAR BUILD</div>
          <div className="text-sm font-semibold tracking-widest text-teal-400">
            CRM PRO
          </div>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-popover">
          <h1 className="mb-1 text-lg font-bold text-slate-900">Вхід у систему</h1>
          <p className="mb-5 text-sm text-slate-500">
            Введіть дані облікового запису
          </p>
          <LoginForm />
        </div>

        <div className="mt-6 rounded-xl bg-slate-800/60 p-4 text-xs text-slate-300">
          <div className="mb-1 font-semibold text-slate-200">Демо-доступи:</div>
          <div>Власник — <span className="text-teal-300">owner@makar.ua</span> / <span className="text-teal-300">owner1234</span></div>
          <div>Менеджер — <span className="text-teal-300">manager@makar.ua</span> / <span className="text-teal-300">manager1234</span></div>
          <div>Бухгалтер — <span className="text-teal-300">buh@makar.ua</span> / <span className="text-teal-300">buh1234</span></div>
        </div>
      </div>
    </div>
  );
}
