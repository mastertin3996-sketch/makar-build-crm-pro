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
  NEW_LEAD: "bg-blue-100 text-blue-700",
  CALL_BACK: "bg-amber-100 text-amber-700",
  CALCULATION: "bg-indigo-100 text-indigo-700",
  QUOTE_SENT: "bg-violet-100 text-violet-700",
  APPROVAL: "bg-purple-100 text-purple-700",
  INVOICED: "bg-cyan-100 text-cyan-700",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-700",
  PAID: "bg-emerald-100 text-emerald-700",
  PRODUCTION: "bg-teal-100 text-teal-700",
  PICKING: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-lime-100 text-lime-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
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
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  RESERVED: "bg-amber-100 text-amber-700",
  PACKING: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-lime-100 text-lime-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
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
  ANSWERED: "bg-green-100 text-green-700",
  MISSED: "bg-red-100 text-red-700",
  NO_ANSWER: "bg-amber-100 text-amber-700",
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
  TELEGRAM: "bg-sky-100 text-sky-700",
  VIBER: "bg-violet-100 text-violet-700",
  WHATSAPP: "bg-green-100 text-green-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  EMAIL: "bg-amber-100 text-amber-700",
  SMS: "bg-slate-100 text-slate-700",
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
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
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
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  SIGNED: "bg-violet-100 text-violet-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
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
  CREATED: "bg-slate-100 text-slate-700",
  ACCEPTED: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-sky-100 text-sky-700",
  ARRIVED: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
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
  RECEIPT: "bg-emerald-100 text-emerald-700",
  WRITEOFF: "bg-red-100 text-red-700",
  TRANSFER: "bg-sky-100 text-sky-700",
  RESERVE: "bg-amber-100 text-amber-700",
  UNRESERVE: "bg-lime-100 text-lime-700",
  INVENTORY: "bg-violet-100 text-violet-700",
  RETURN: "bg-teal-100 text-teal-700",
};

export function formatUAH(value: number): string {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
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
