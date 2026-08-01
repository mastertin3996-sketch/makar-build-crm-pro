import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card } from "@/components/ui";
import { formatUAH } from "@/lib/labels";

export const dynamic = "force-dynamic";

// Реальний чекаут LiqPay вимагає POST data+signature на liqpay.ua — тому тут
// автосабмітна форма, а не звичайне посилання (payUrl лишається null для цього шляху).
export default async function PayLiqpayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "finance", "view")) redirect("/");

  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id } });
  if (!p) notFound();
  if (!p.liqpayData || !p.liqpaySignature) redirect(`/finance/${id}`);
  if (p.status !== "PENDING") redirect(`/finance/${id}`);

  return (
    <>
      <PageHeader
        title={`Оплата #${p.number}`}
        subtitle="Перенаправлення на LiqPay…"
        action={<Link href={`/finance/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Назад</Link>}
      />
      <div className="p-8">
        <Card className="max-w-md p-6 text-center">
          <p className="mb-4 text-sm text-slate-600">
            Сума до оплати: <span className="font-semibold">{formatUAH(p.amount)}</span>
          </p>
          <p className="mb-4 text-xs text-slate-400">
            Якщо перенаправлення не відбулося автоматично, натисніть кнопку нижче.
          </p>
          <form id="liqpay-form" method="POST" action="https://www.liqpay.ua/api/3/checkout" acceptCharset="utf-8">
            <input type="hidden" name="data" value={p.liqpayData} />
            <input type="hidden" name="signature" value={p.liqpaySignature} />
            <button className="w-full rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Перейти до оплати LiqPay
            </button>
          </form>
          <script
            dangerouslySetInnerHTML={{
              __html: `document.getElementById("liqpay-form").submit();`,
            }}
          />
        </Card>
      </div>
    </>
  );
}
