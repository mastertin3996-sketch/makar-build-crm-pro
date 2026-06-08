"use client";

import { useEffect } from "react";

export function PrintButton() {
  // Автоматично відкриваємо діалог друку при завантаженні
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 print:hidden"
    >
      🖨 Друкувати
    </button>
  );
}
