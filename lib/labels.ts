// Українські підписи та кольори для enum-значень

import type {
  RequestStatus,
  RequestSource,
  ProductCategory,
  InteractionType,
} from "@prisma/client";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW_LEAD: "Новий лід",
  CALL_BACK: "Передзвонити",
  CALCULATION: "Прорахунок",
  QUOTE_SENT: "КП надіслано",
  APPROVAL: "Узгодження",
  INVOICED: "Рахунок виставлено",
  AWAITING_PAYMENT: "Очікує оплату",
  PAID: "Оплачено",
  PRODUCTION: "Виробництво",
  PICKING: "Комплектація",
  SHIPPED: "Відправлено",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

// tailwind-класи бейджів за статусом
export const STATUS_COLORS: Record<RequestStatus, string> = {
  NEW_LEAD: "bg-blue-500/15 text-blue-300",
  CALL_BACK: "bg-amber-500/15 text-amber-300",
  CALCULATION: "bg-indigo-500/15 text-indigo-300",
  QUOTE_SENT: "bg-violet-500/15 text-violet-300",
  APPROVAL: "bg-purple-500/15 text-purple-300",
  INVOICED: "bg-cyan-500/15 text-cyan-300",
  AWAITING_PAYMENT: "bg-orange-500/15 text-orange-300",
  PAID: "bg-emerald-500/15 text-emerald-300",
  PRODUCTION: "bg-teal-500/15 text-teal-300",
  PICKING: "bg-sky-500/15 text-sky-300",
  SHIPPED: "bg-lime-500/15 text-lime-300",
  COMPLETED: "bg-green-500/15 text-green-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export const STATUS_ORDER: RequestStatus[] = [
  "NEW_LEAD",
  "CALL_BACK",
  "CALCULATION",
  "QUOTE_SENT",
  "APPROVAL",
  "INVOICED",
  "AWAITING_PAYMENT",
  "PAID",
  "PRODUCTION",
  "PICKING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

export const SOURCE_LABELS: Record<RequestSource, string> = {
  WEBSITE: "Сайт",
  PROM: "Prom",
  ROZETKA: "Rozetka",
  EPICENTR: "Epicentr",
  OLX: "OLX",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  PHONE: "Телефон",
  MANUAL: "Вручну",
};

export const SOURCE_ICONS: Record<RequestSource, string> = {
  WEBSITE: "🌐",
  PROM: "🛒",
  ROZETKA: "🛍️",
  EPICENTR: "🏗️",
  OLX: "📦",
  INSTAGRAM: "📷",
  FACEBOOK: "💬",
  TELEGRAM: "✈️",
  PHONE: "📞",
  MANUAL: "✍️",
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  FENCE_3D: "3D паркани",
  POSTS: "Стовпи",
  FASTENERS: "Кріплення",
  GATES: "Ворота",
  WICKETS: "Хвіртки",
  CHAIN_MESH: "Сітка рабиця",
  PROFILED_SHEET: "Профнастил",
  METAL_STRUCTURES: "Металоконструкції",
  COMPONENTS: "Комплектуючі",
  SERVICES: "Послуги",
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  NOTE: "Нотатка",
  TASK: "Завдання",
  CALL: "Дзвінок",
  SMS: "SMS",
  EMAIL: "Email",
  TELEGRAM: "Telegram",
  VIBER: "Viber",
  INSTAGRAM: "Instagram",
};

export const INTERACTION_ICONS: Record<InteractionType, string> = {
  NOTE: "📝",
  TASK: "✅",
  CALL: "📞",
  SMS: "💬",
  EMAIL: "✉️",
  TELEGRAM: "✈️",
  VIBER: "🟣",
  INSTAGRAM: "📷",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Нове",
  CONFIRMED: "Підтверджено",
  RESERVED: "Зарезервовано",
  PACKING: "Комплектація",
  SHIPPED: "Відправлено",
  COMPLETED: "Виконано",
  CANCELLED: "Скасовано",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-300",
  CONFIRMED: "bg-indigo-500/15 text-indigo-300",
  RESERVED: "bg-amber-500/15 text-amber-300",
  PACKING: "bg-sky-500/15 text-sky-300",
  SHIPPED: "bg-lime-500/15 text-lime-300",
  COMPLETED: "bg-green-500/15 text-green-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export const ORDER_STATUS_ORDER = [
  "NEW",
  "CONFIRMED",
  "RESERVED",
  "PACKING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const CALL_PROVIDER_LABELS: Record<string, string> = {
  BINOTEL: "Binotel",
  RINGOSTAT: "Ringostat",
  UNITALK: "UniTalk",
};

export const CALL_DIRECTION_LABELS: Record<string, string> = {
  INBOUND: "Вхідний",
  OUTBOUND: "Вихідний",
};

export const CALL_DIRECTION_ICONS: Record<string, string> = {
  INBOUND: "📥",
  OUTBOUND: "📤",
};

export const CALL_STATUS_LABELS: Record<string, string> = {
  ANSWERED: "Прийнятий",
  MISSED: "Пропущений",
  NO_ANSWER: "Без відповіді",
};

export const CALL_STATUS_COLORS: Record<string, string> = {
  ANSWERED: "bg-green-500/15 text-green-300",
  MISSED: "bg-red-500/15 text-red-300",
  NO_ANSWER: "bg-amber-500/15 text-amber-300",
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const CHANNEL_LABELS: Record<string, string> = {
  TELEGRAM: "Telegram",
  VIBER: "Viber",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "Email",
  SMS: "SMS",
};

export const CHANNEL_ICONS: Record<string, string> = {
  TELEGRAM: "✈️",
  VIBER: "🟣",
  WHATSAPP: "🟢",
  INSTAGRAM: "📷",
  FACEBOOK: "💬",
  EMAIL: "✉️",
  SMS: "📱",
};

export const CHANNEL_COLORS: Record<string, string> = {
  TELEGRAM: "bg-sky-500/15 text-sky-300",
  VIBER: "bg-violet-500/15 text-violet-300",
  WHATSAPP: "bg-green-500/15 text-green-300",
  INSTAGRAM: "bg-pink-500/15 text-pink-300",
  FACEBOOK: "bg-blue-500/15 text-blue-300",
  EMAIL: "bg-amber-500/15 text-amber-300",
  SMS: "bg-slate-500/15 text-slate-300",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Готівка",
  BANK_TRANSFER: "Банківський переказ",
  COD: "Післяплата",
  ONLINE: "Онлайн оплата",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  LIQPAY: "LiqPay",
  WAYFORPAY: "WayForPay",
  FONDY: "Fondy",
  MONOBANK: "Monobank",
  PRIVATBANK: "ПриватБанк",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Очікує оплату",
  PAID: "Оплачено",
  FAILED: "Відхилено",
  REFUNDED: "Повернено",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300",
  PAID: "bg-green-500/15 text-green-300",
  FAILED: "bg-red-500/15 text-red-300",
  REFUNDED: "bg-orange-500/15 text-orange-300",
};

export const PAYMENT_DIRECTION_LABELS: Record<string, string> = {
  INCOME: "Надходження",
  EXPENSE: "Видаток",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Комерційна пропозиція",
  INVOICE: "Рахунок",
  CONTRACT: "Договір",
  ACT: "Акт виконаних робіт",
  WAYBILL: "Видаткова накладна",
  WARRANTY: "Гарантійний лист",
};

export const DOC_TYPE_SHORT: Record<string, string> = {
  QUOTE: "КП",
  INVOICE: "Рахунок",
  CONTRACT: "Договір",
  ACT: "Акт",
  WAYBILL: "Видаткова",
  WARRANTY: "Гарантія",
};

export const DOC_TYPE_PREFIX: Record<string, string> = {
  QUOTE: "КП",
  INVOICE: "РАХ",
  CONTRACT: "ДОГ",
  ACT: "АКТ",
  WAYBILL: "ВН",
  WARRANTY: "ГЛ",
};

export const DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Чернетка",
  SENT: "Надіслано",
  SIGNED: "Підписано",
  PAID: "Оплачено",
  CANCELLED: "Скасовано",
};

export const DOC_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-300",
  SENT: "bg-blue-500/15 text-blue-300",
  SIGNED: "bg-violet-500/15 text-violet-300",
  PAID: "bg-green-500/15 text-green-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

// Які типи документів мають таблицю позицій
export const DOC_WITH_ITEMS = ["QUOTE", "INVOICE", "ACT", "WAYBILL"];

export const CARRIER_LABELS: Record<string, string> = {
  NOVA_POSHTA: "Нова Пошта",
  UKRPOSHTA: "Укрпошта",
  MEEST: "Meest",
  DELIVERY: "Delivery",
  SAT: "SAT",
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: "ТТН створено",
  ACCEPTED: "Прийнято",
  IN_TRANSIT: "У дорозі",
  ARRIVED: "У відділенні",
  DELIVERED: "Вручено",
  RETURNED: "Повернення",
  CANCELLED: "Скасовано",
};

export const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-slate-500/15 text-slate-300",
  ACCEPTED: "bg-indigo-500/15 text-indigo-300",
  IN_TRANSIT: "bg-sky-500/15 text-sky-300",
  ARRIVED: "bg-amber-500/15 text-amber-300",
  DELIVERED: "bg-green-500/15 text-green-300",
  RETURNED: "bg-orange-500/15 text-orange-300",
  CANCELLED: "bg-red-500/15 text-red-300",
};

// Послідовність авто-просування статусу доставки
export const SHIPMENT_FLOW = [
  "CREATED",
  "ACCEPTED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELIVERED",
] as const;

export const MOVEMENT_LABELS: Record<string, string> = {
  RECEIPT: "Надходження",
  WRITEOFF: "Списання",
  TRANSFER: "Переміщення",
  RESERVE: "Резервування",
  UNRESERVE: "Зняття резерву",
  INVENTORY: "Інвентаризація",
  RETURN: "Повернення",
};

export const MOVEMENT_ICONS: Record<string, string> = {
  RECEIPT: "📥",
  WRITEOFF: "📤",
  TRANSFER: "🔁",
  RESERVE: "🔒",
  UNRESERVE: "🔓",
  INVENTORY: "🧮",
  RETURN: "↩️",
};

// tailwind-класи бейджів за типом руху
export const MOVEMENT_COLORS: Record<string, string> = {
  RECEIPT: "bg-emerald-500/15 text-emerald-300",
  WRITEOFF: "bg-red-500/15 text-red-300",
  TRANSFER: "bg-sky-500/15 text-sky-300",
  RESERVE: "bg-amber-500/15 text-amber-300",
  UNRESERVE: "bg-lime-500/15 text-lime-300",
  INVENTORY: "bg-violet-500/15 text-violet-300",
  RETURN: "bg-teal-500/15 text-teal-300",
};

export function formatUAH(value: number): string {
  // Символ валюти додається вручну (а не через style: "currency"), бо Intl
  // резолвить позначення UAH по-різному в Node (₴) і в браузерах (грн) —
  // це давало розбіжність між серверно- і клієнтськи відформатованими сумами.
  return `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(value)} ₴`;
}

export function monthKey(d: Date | string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1)
  );
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}
