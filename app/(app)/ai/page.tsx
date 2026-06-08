import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { aiEnabled } from "@/lib/ai";
import { PageHeader } from "@/components/ui";
import { AiConsole } from "./AiConsole";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const me = await requireUser();
  if (!can(me, "ai", "view")) redirect("/");

  const [orders, requests] = await Promise.all([
    prisma.order.findMany({ include: { client: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.request.findMany({ include: { client: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const sources = [
    ...orders.map((o) => ({ value: `order:${o.id}`, label: `Замовлення #${o.number} · ${o.client?.fullName ?? "—"}` })),
    ...requests.map((r) => ({ value: `request:${r.id}`, label: `Заявка #${r.number} · ${r.client?.fullName ?? "—"}` })),
  ];

  return (
    <>
      <PageHeader title="ШІ-помічник" subtitle="Генерація документів, автовідповіді, аналітика та рекомендації" />
      <div className="p-8">
        <AiConsole aiEnabled={aiEnabled()} sources={sources} />
      </div>
    </>
  );
}
