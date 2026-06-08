import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Чи налаштовано реальний ШІ (ключ Anthropic). Якщо ні — використовуємо
// локальний детермінований фолбек, щоб прототип працював офлайн.
export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type AiResult = { text: string; source: "claude" | "fallback" };

/**
 * Генерація тексту через Claude (Anthropic SDK), модель claude-opus-4-8.
 * Якщо ключ відсутній або стався збій — повертає локальний фолбек.
 */
export async function generate(
  system: string,
  user: string,
  fallback: () => string
): Promise<AiResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { text: fallback(), source: "fallback" };
  }
  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text ? { text, source: "claude" } : { text: fallback(), source: "fallback" };
  } catch (err) {
    console.error("Claude API error:", err);
    return { text: fallback(), source: "fallback" };
  }
}

export const SELLER_NAME = 'ТОВ "МАКАР БУД"';
