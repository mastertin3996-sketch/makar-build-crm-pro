import "server-only";
import type { ShipmentStatus } from "@prisma/client";

// Чи налаштовано реальний ключ API Нової Пошти. Якщо ні — використовуємо
// локальну демо-симуляцію (advanceStatus у app/(app)/logistics/actions.ts),
// щоб прототип працював офлайн без жодних секретів. Дзеркалить lib/ai.ts.
export function novaPoshtaEnabled(): boolean {
  return !!process.env.NOVA_POSHTA_API_KEY;
}

const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";

type NovaPoshtaEnvelope<T> = {
  success: boolean;
  data: T[];
  errors?: string[];
  errorCodes?: string[];
  warnings?: string[];
  info?: unknown;
};

/**
 * Універсальний виклик єдиного JSON-ендпоінта Нової Пошти:
 * POST { apiKey, modelName, calledMethod, methodProperties } → { success, data, errors }.
 * Кидає описову помилку при success:false або мережевому збої — виклик має
 * оброблятися через try/catch там, де це важливо для демо-режиму (як у lib/ai.ts).
 */
export async function callNovaPoshta<T = unknown>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown> = {}
): Promise<T[]> {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  if (!apiKey) {
    throw new Error("NOVA_POSHTA_API_KEY не налаштовано");
  }

  let resp: Response;
  try {
    resp = await fetch(NP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    });
  } catch (err) {
    throw new Error(
      `Нова Пошта: мережева помилка — ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!resp.ok) {
    throw new Error(`Нова Пошта: HTTP ${resp.status}`);
  }

  let json: NovaPoshtaEnvelope<T>;
  try {
    json = (await resp.json()) as NovaPoshtaEnvelope<T>;
  } catch {
    throw new Error("Нова Пошта: відповідь не є коректним JSON");
  }

  if (!json.success) {
    const msg =
      json.errors?.filter(Boolean).join("; ") ||
      json.errorCodes?.filter(Boolean).join("; ") ||
      "невідома помилка API";
    throw new Error(`Нова Пошта: ${msg}`);
  }

  return json.data ?? [];
}

// ----------------------------------------------------------------------------
// Відстеження ТТН (TrackingDocument.getStatusDocuments) — потребує лише
// апі-ключ і номер ТТН, без даних контрагента. Це єдина частина інтеграції,
// яку можна реалізувати по-справжньому без бізнес-акаунту Нової Пошти.
// ----------------------------------------------------------------------------

type NpTrackedDocumentRaw = {
  Number?: string;
  Status?: string;
  StatusCode?: string;
  ActualDeliveryDate?: string;
  RecipientFullName?: string;
  RecipientAddress?: string;
  WarehouseRecipient?: string;
  CityRecipient?: string;
  [key: string]: unknown;
};

export type TrackedShipment = {
  ttn: string;
  statusCode: string | null;
  statusDescription: string | null;
  actualDeliveryDate: string | null;
  recipientFullName: string | null;
  recipientAddress: string | null;
  warehouseRecipient: string | null;
};

/**
 * Реальний виклик трекінгу Нової Пошти для списку ТТН.
 * `phones` — опційна мапа "ттн → телефон отримувача": для частини документів
 * Нова Пошта вимагає телефон для видачі повного статусу (захист даних).
 */
export async function trackDocuments(
  ttns: string[],
  phones?: Record<string, string>
): Promise<TrackedShipment[]> {
  if (ttns.length === 0) return [];

  const data = await callNovaPoshta<NpTrackedDocumentRaw>(
    "TrackingDocument",
    "getStatusDocuments",
    {
      Documents: ttns.map((ttn) => ({
        DocumentNumber: ttn,
        Phone: phones?.[ttn] ?? "",
      })),
    }
  );

  return data.map((d) => ({
    ttn: d.Number ?? "",
    statusCode: d.StatusCode ?? null,
    statusDescription: d.Status ?? null,
    actualDeliveryDate: d.ActualDeliveryDate || null,
    recipientFullName: d.RecipientFullName || null,
    recipientAddress: d.RecipientAddress || null,
    warehouseRecipient: d.WarehouseRecipient || d.CityRecipient || null,
  }));
}

/**
 * Best-effort мапінг тексту статусу Нової Пошти (укр.) на наш ShipmentStatus.
 * Нова Пошта не документує стабільний перелік StatusCode публічно, тому
 * орієнтуємось на ключові слова в описі статусу. Повертає null, якщо
 * розпізнати не вдалось — тоді статус відправлення лишається незмінним,
 * але подію відстеження все одно записуємо з оригінальним текстом.
 */
export function mapToShipmentStatus(
  statusDescription: string,
  current: ShipmentStatus
): ShipmentStatus | null {
  const s = statusDescription.toLowerCase();

  if (!s) return null;

  if (s.includes("відмова") || s.includes("повернення") || s.includes("повернуто")) {
    return "RETURNED";
  }
  if (s.includes("отримано") && (s.includes("одержувачем") || s.includes("отримувачем"))) {
    return "DELIVERED";
  }
  if (s.includes("видано") || s.includes("вручено") || s.includes("доставлено")) {
    return "DELIVERED";
  }
  if (s.includes("прибуло") || s.includes("прибув") || s.includes("очікує отримання") || s.includes("зберігання")) {
    return "ARRIVED";
  }
  if (s.includes("прямує") || s.includes("у дорозі") || s.includes("в дорозі") || s.includes("на шляху")) {
    return "IN_TRANSIT";
  }
  if (s.includes("відправлення отримано") || s.includes("прийнято") || s.includes("прийняте")) {
    return "ACCEPTED";
  }
  if (s.includes("номер визначено") || s.includes("очікує відправлення") || s.includes("готується")) {
    return "CREATED";
  }

  return current ?? null;
}
