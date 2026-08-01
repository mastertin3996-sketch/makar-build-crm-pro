import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/auth";
import { verifyCallback, decodeCallback, mapLiqpayStatus } from "@/lib/liqpay";

// LiqPay server_url: викликається асинхронно, POST application/x-www-form-urlencoded
// з полями data + signature. Має відповідати швидко і без винятків — інакше LiqPay
// повторюватиме запит. https://www.liqpay.ua/documentation/api/callback
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const data = form.get("data");
  const signature = form.get("signature");
  if (typeof data !== "string" || typeof signature !== "string" || !data || !signature) {
    return new Response("Missing data/signature", { status: 400 });
  }

  if (!verifyCallback(data, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const callback = decodeCallback(data);
  if (!callback) {
    return new Response("Malformed payload", { status: 400 });
  }

  try {
    const payment = await prisma.payment.findUnique({ where: { id: callback.order_id } });
    if (!payment) {
      return new Response("Payment not found", { status: 404 });
    }

    const status = mapLiqpayStatus(callback.status);
    if (status && status !== payment.status) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status, paidAt: status === "PAID" ? new Date() : payment.paidAt },
      });
      await audit("PAYMENT_WEBHOOK_LIQPAY", {
        entity: "Payment",
        entityId: payment.id,
        details: `#${payment.number} ${callback.status} → ${status}`,
      });
      revalidatePath("/finance");
      revalidatePath(`/finance/${payment.id}`);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("LiqPay webhook error:", err);
    // 500 — щоб LiqPay повторив запит пізніше (наприклад, тимчасово недоступна БД).
    return new Response("Internal error", { status: 500 });
  }
}
