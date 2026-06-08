"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can, canFinance } from "@/lib/permissions";
import { generate, SELLER_NAME, type AiResult } from "@/lib/ai";
import { DOC_TYPE_LABELS, STATUS_LABELS, formatUAH } from "@/lib/labels";

export type AiState = { text?: string; source?: AiResult["source"]; error?: string };

type LineItem = { name: string; quantity: number; price: number };

async function guard() {
  const me = await requireUser();
  if (!can(me, "ai", "view")) throw new Error("Немає доступу до ШІ-помічника");
  return me;
}

function itemsText(items: LineItem[], total: number) {
  const lines = items.map((i, n) => `${n + 1}. ${i.name} — ${i.quantity} × ${formatUAH(i.price)} = ${formatUAH(i.price * i.quantity)}`);
  return `${lines.join("\n")}\nРазом: ${formatUAH(total)}`;
}

// 1. Генерація документів (КП / рахунок / договір)
export async function genDocument(_prev: AiState, formData: FormData): Promise<AiState> {
  const me = await guard();
  const docType = String(formData.get("docType") ?? "QUOTE");
  const source = String(formData.get("source") ?? "");

  let clientName = "Клієнт";
  let items: LineItem[] = [];
  let total = 0;
  if (source.startsWith("order:")) {
    const o = await prisma.order.findUnique({ where: { id: source.slice(6) }, include: { items: true, client: true } });
    if (o) { clientName = o.client?.fullName ?? clientName; items = o.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })); total = o.totalAmount; }
  } else if (source.startsWith("request:")) {
    const r = await prisma.request.findUnique({ where: { id: source.slice(8) }, include: { items: true, client: true } });
    if (r) { clientName = r.client?.fullName ?? clientName; items = r.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })); total = items.reduce((s, i) => s + i.price * i.quantity, 0) || r.amount; }
  }
  const typeLabel = DOC_TYPE_LABELS[docType] ?? "Документ";

  const fallback = () => {
    const head = `${typeLabel.toUpperCase()}\nПостачальник: ${SELLER_NAME}\nКлієнт: ${clientName}\n`;
    if (docType === "CONTRACT") {
      return `${head}\nДоговір поставки\n\n1. Постачальник зобов'язується передати у власність Покупця товар на загальну суму ${formatUAH(total)}, а Покупець — прийняти та оплатити його.\n2. Оплата здійснюється на поточний рахунок Постачальника.\n3. Договір діє до повного виконання зобов'язань.\n\nПідписи сторін: __________ / __________`;
    }
    const note = docType === "INVOICE" ? "\nПросимо здійснити оплату протягом 3 банківських днів." : "\nПропозиція дійсна 7 днів. Готові обговорити деталі.";
    return `${head}\n${itemsText(items, total)}\n${note}`;
  };

  const system = `Ти — менеджер компанії «МАКАР БУД» (продаж огорож, воріт, металоконструкцій). Складай ділові документи українською мовою, ввічливо, структуровано, без вигадування фактів. Використовуй лише надані дані.`;
  const user = `Склади «${typeLabel}» для клієнта «${clientName}».\nПозиції:\n${items.length ? itemsText(items, total) : "(без позицій)"}\nПостачальник: ${SELLER_NAME}.`;

  const res = await generate(system, user, fallback);
  await audit("AI_GENERATE", { userId: me.id, details: `Документ: ${typeLabel} (${res.source})` });
  return { text: res.text, source: res.source };
}

// 2. Автоматична відповідь клієнту
export async function genReply(_prev: AiState, formData: FormData): Promise<AiState> {
  const me = await guard();
  const message = String(formData.get("message") ?? "").trim();
  const tone = String(formData.get("tone") ?? "дружній");
  if (!message) return { error: "Введіть повідомлення клієнта" };

  const fallback = () =>
    `Доброго дня! Дякуємо за звернення 🙂\n\nЩодо «${message.slice(0, 80)}${message.length > 80 ? "…" : ""}» — ми обов'язково допоможемо. Підготуємо детальну інформацію та повернемось найближчим часом. Якщо зручно, залиште номер телефону для дзвінка.\n\nЗ повагою, команда МАКАР БУД.`;

  const system = `Ти — менеджер з продажу компанії «МАКАР БУД». Пиши коротку, ввічливу відповідь клієнту українською у ${tone} тоні. Не вигадуй цін і термінів, яких немає. Можна використати доречні емодзі.`;
  const user = `Повідомлення клієнта: "${message}"\nНапиши відповідь.`;

  const res = await generate(system, user, fallback);
  await audit("AI_GENERATE", { userId: me.id, details: `Автовідповідь (${res.source})` });
  return { text: res.text, source: res.source };
}

// 3. Аналіз продажів
export async function genAnalysis(_prev: AiState, _formData: FormData): Promise<AiState> {
  const me = await guard();
  const [requests, orders, payments] = await Promise.all([
    prisma.request.findMany(),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.payment.findMany({ where: { direction: "INCOME", status: "PAID" } }),
  ]);
  const won = requests.filter((r) => ["PAID", "PRODUCTION", "PICKING", "SHIPPED", "COMPLETED"].includes(r.status)).length;
  const conv = requests.length ? Math.round((won / requests.length) * 100) : 0;
  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const ordersSum = orders.reduce((s, p) => s + p.totalAmount, 0);
  const bySource = requests.reduce<Record<string, number>>((a, r) => { a[r.source] = (a[r.source] ?? 0) + 1; return a; }, {});
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const stats = `Заявок: ${requests.length}, виграно: ${won}, конверсія: ${conv}%. Замовлень (активних): ${orders.length} на ${formatUAH(ordersSum)}. Отримано оплат: ${formatUAH(revenue)}. Найбільше лідів з джерела: ${topSource}.`;

  const fallback = () =>
    `📊 Аналіз продажів\n\n• ${stats}\n\nВисновки:\n— Конверсія ${conv}% ${conv >= 30 ? "у нормі" : "нижче бажаної — варто посилити обробку лідів"}.\n— Основний канал залучення: ${topSource}; розгляньте збільшення бюджету на нього.\n— Сума активних замовлень ${formatUAH(ordersSum)} формує найближчий дохід — пріоритезуйте їх відвантаження.`;

  const system = `Ти — аналітик продажів. На основі наведених цифр зроби стислий, конкретний аналіз українською: 3–5 висновків і рекомендацій. Не вигадуй чисел поза наданими.`;
  const res = await generate(system, `Дані: ${stats}`, fallback);
  await audit("AI_GENERATE", { userId: me.id, details: `Аналіз продажів (${res.source})` });
  return { text: res.text, source: res.source };
}

// 4. Рекомендації менеджерам
export async function genRecommendations(_prev: AiState, _formData: FormData): Promise<AiState> {
  const me = await guard();
  const showFinance = canFinance(me, "payments");

  const [callbacks, awaiting, lowStock, pendingPays] = await Promise.all([
    prisma.request.count({ where: { status: "CALL_BACK" } }),
    prisma.request.count({ where: { status: "AWAITING_PAYMENT" } }),
    prisma.stockItem.findMany({ include: { product: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
  ]);
  const lowCount = lowStock.filter((s) => s.quantity - s.reserved <= 20 && s.product.category !== "SERVICES").length;

  const facts = [
    `Заявок «Передзвонити»: ${callbacks}`,
    `Заявок «Очікує оплату»: ${awaiting}`,
    `Дефіцитних позицій на складі: ${lowCount}`,
    showFinance ? `Онлайн-оплат в очікуванні: ${pendingPays}` : "",
  ].filter(Boolean).join(". ");

  const fallback = () => {
    const recs: string[] = [];
    if (callbacks) recs.push(`📞 Передзвоніть ${callbacks} клієнтам зі статусом «Передзвонити» — не втрачайте теплі ліди.`);
    if (awaiting) recs.push(`💳 Нагадайте про оплату по ${awaiting} заявках у статусі «Очікує оплату».`);
    if (lowCount) recs.push(`📦 Поповніть склад: ${lowCount} позицій у дефіциті.`);
    if (showFinance && pendingPays) recs.push(`⏳ ${pendingPays} онлайн-оплат очікують підтвердження — перевірте статус.`);
    if (!recs.length) recs.push("✅ Критичних задач немає. Зосередьтесь на нових лідах і апселі.");
    return `🤖 Рекомендації менеджерам\n\n${recs.join("\n")}`;
  };

  const system = `Ти — керівник відділу продажів. Дай 3–6 коротких, конкретних рекомендацій менеджерам українською на основі фактів. Кожна — окремим пунктом з емодзі.`;
  const res = await generate(system, `Поточний стан: ${facts}.`, fallback);
  await audit("AI_GENERATE", { userId: me.id, details: `Рекомендації (${res.source})` });
  return { text: res.text, source: res.source };
}

// статуси для підказок (не використовується напряму, але корисно для контексту)
export const _statusLabels = STATUS_LABELS;
