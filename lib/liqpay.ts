import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@prisma/client";

// Чи налаштовано реальний LiqPay (публічний + приватний ключі). Якщо ні —
// createPayment() лишається у демо-режимі (фейкове посилання, ручне підтвердження).
export function liqpayEnabled(): boolean {
  return !!process.env.LIQPAY_PUBLIC_KEY && !!process.env.LIQPAY_PRIVATE_KEY;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type LiqpayCheckout = { data: string; signature: string; checkoutUrl: string };

/**
 * Формує data/signature для чекауту LiqPay за офіційною схемою підпису:
 * signature = base64(sha1(private_key + base64(json(payload)) + private_key))
 * https://www.liqpay.ua/documentation/api/checkout
 */
export function buildCheckout(params: {
  paymentId: string;
  amount: number;
  description: string;
}): LiqpayCheckout {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY!;
  const privateKey = process.env.LIQPAY_PRIVATE_KEY!;

  const payload = {
    public_key: publicKey,
    version: 3,
    action: "pay",
    amount: params.amount,
    currency: "UAH",
    description: params.description,
    order_id: params.paymentId, // ID нашого Payment — за ним шукаємо запис у webhook
    result_url: `${appUrl()}/finance/${params.paymentId}`,
    server_url: `${appUrl()}/api/webhooks/liqpay`,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = sign(data, privateKey);

  return { data, signature, checkoutUrl: "https://www.liqpay.ua/api/3/checkout" };
}

function sign(data: string, privateKey: string): string {
  return createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

// Перевірка підпису вхідного callback (server_url) — конче важливо для безпеки,
// тому порівняння виконується constant-time, а не через "===".
export function verifyCallback(data: string, signature: string): boolean {
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;
  if (!privateKey) return false;

  const expected = Buffer.from(sign(data, privateKey), "base64");
  const actual = Buffer.from(signature, "base64");
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

export type LiqpayCallback = {
  order_id: string;
  status: string;
  [key: string]: unknown;
};

export function decodeCallback(data: string): LiqpayCallback | null {
  try {
    const json = Buffer.from(data, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.order_id !== "string" || typeof parsed.status !== "string") {
      return null;
    }
    return parsed as LiqpayCallback;
  } catch {
    return null;
  }
}

// Мапінг реальних статусів LiqPay на наш enum PaymentStatus.
// https://www.liqpay.ua/documentation/api/callback (поле status)
export function mapLiqpayStatus(status: string): PaymentStatus | null {
  switch (status) {
    case "success":
    case "sandbox":
      return "PAID";
    case "failure":
    case "error":
      return "FAILED";
    case "reversed":
      return "REFUNDED";
    default:
      return null; // wait_accept, processing тощо — лишаємо PENDING без змін
  }
}
