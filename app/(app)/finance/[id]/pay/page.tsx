import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Card, Button } from "@/components/ui";
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
        icon="finance"
        action={<Link href={`/finance/${id}`} className="text-sm text-muted hover:text-[#b8935a]">← Назад</Link>}
      />
      <div className="p-8">
        <Card className="max-w-md p-6 text-center">
          <p className="mb-4 text-sm text-[#b8935a]">
            Сума до оплати: <span className="font-semibold">{formatUAH(p.amount)}</span>
          </p>
          <p className="mb-4 text-xs text-muted">
            Якщо перенаправлення не відбулося автоматично, натисніть кнопку нижче.
          </p>
          <form id="liqpay-form" method="POST" action="https://www.liqpay.ua/api/3/checkout" acceptCharset="utf-8">
            <input type="hidden" name="data" value={p.liqpayData} />
            <input type="hidden" name="signature" value={p.liqpaySignature} />
            <Button type="submit" className="w-full">
              Перейти до оплати LiqPay
            </Button>
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
