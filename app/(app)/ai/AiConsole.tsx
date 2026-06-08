"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui";
import { genDocument, genReply, genAnalysis, genRecommendations, type AiState } from "./actions";

const initial: AiState = {};

function SourceBadge({ source }: { source?: AiState["source"] }) {
  if (!source) return null;
  return source === "claude" ? (
    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">✦ Claude (claude-opus-4-8)</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">демо-шаблон (без API-ключа)</span>
  );
}

function Result({ state, pending }: { state: AiState; pending: boolean }) {
  if (pending) return <div className="mt-4 text-sm text-slate-400">Генерую…</div>;
  if (state.error) return <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>;
  if (!state.text) return null;
  return (
    <div className="mt-4">
      <div className="mb-2"><SourceBadge source={state.source} /></div>
      <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800">{state.text}</pre>
    </div>
  );
}

export function AiConsole({
  aiEnabled,
  sources,
}: {
  aiEnabled: boolean;
  sources: { value: string; label: string }[];
}) {
  const [docState, docAction, docPending] = useActionState(genDocument, initial);
  const [replyState, replyAction, replyPending] = useActionState(genReply, initial);
  const [anState, anAction, anPending] = useActionState(genAnalysis, initial);
  const [recState, recAction, recPending] = useActionState(genRecommendations, initial);

  return (
    <div className="space-y-6">
      {!aiEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          ⚠️ <b>ANTHROPIC_API_KEY не налаштовано.</b> ШІ-помічник працює в демо-режимі (детерміновані шаблони).
          Додайте ключ у <code>.env</code>, щоб увімкнути реальну генерацію через Claude (claude-opus-4-8).
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Генерація документів */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">📄 Генерація документів</h2>
          <p className="mb-4 text-xs text-slate-500">КП, рахунок або договір на основі замовлення/заявки</p>
          <form action={docAction} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Тип</span>
              <select name="docType" defaultValue="QUOTE" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                <option value="QUOTE">Комерційна пропозиція</option>
                <option value="INVOICE">Рахунок</option>
                <option value="CONTRACT">Договір</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Джерело даних</span>
              <select name="source" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                <option value="">— без даних —</option>
                {sources.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </label>
            <button disabled={docPending} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60">
              {docPending ? "Генерую…" : "✦ Згенерувати"}
            </button>
          </form>
          <Result state={docState} pending={docPending} />
        </Card>

        {/* Автовідповідь */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">💬 Автоматична відповідь клієнту</h2>
          <p className="mb-4 text-xs text-slate-500">Чернетка відповіді на повідомлення клієнта</p>
          <form action={replyAction} className="space-y-3">
            <textarea name="message" rows={3} placeholder="Вставте повідомлення клієнта…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Тон</span>
              <select name="tone" defaultValue="дружній" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                <option value="дружній">Дружній</option>
                <option value="офіційний">Офіційний</option>
                <option value="лаконічний">Лаконічний</option>
              </select>
            </label>
            <button disabled={replyPending} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60">
              {replyPending ? "Генерую…" : "✦ Запропонувати відповідь"}
            </button>
          </form>
          <Result state={replyState} pending={replyPending} />
        </Card>

        {/* Аналіз продажів */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">📈 Аналіз продажів</h2>
          <p className="mb-4 text-xs text-slate-500">Висновки та інсайти на основі даних CRM</p>
          <form action={anAction}>
            <button disabled={anPending} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">
              {anPending ? "Аналізую…" : "✦ Проаналізувати"}
            </button>
          </form>
          <Result state={anState} pending={anPending} />
        </Card>

        {/* Рекомендації */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">🤖 Рекомендації менеджерам</h2>
          <p className="mb-4 text-xs text-slate-500">Що зробити прямо зараз — за даними CRM</p>
          <form action={recAction}>
            <button disabled={recPending} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">
              {recPending ? "Готую…" : "✦ Отримати рекомендації"}
            </button>
          </form>
          <Result state={recState} pending={recPending} />
        </Card>
      </div>
    </div>
  );
}
