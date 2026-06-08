import { requireUser } from "@/lib/auth";

// Мінімальний layout для друкованих документів (без сайдбара)
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser(); // друк лише для авторизованих
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>;
}
