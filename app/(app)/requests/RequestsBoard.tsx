"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { RequestStatus, RequestSource } from "@prisma/client";
import { Card, PlatformIcon } from "@/components/ui";
import { STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, SOURCE_LABELS, SOURCE_ICONS, formatUAH } from "@/lib/labels";
import { updateStatus } from "./actions";

export type BoardRequest = {
  id: string;
  number: number;
  title: string;
  amount: number;
  manager: string | null;
  status: RequestStatus;
  source: RequestSource;
  client: { id: string; fullName: string } | null;
};

export function RequestsBoard({
  requests,
  canEdit,
}: {
  requests: BoardRequest[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [dragOverStatus, setDragOverStatus] = useState<RequestStatus | null>(null);
  const [, startTransition] = useTransition();
  // Оптимістичне оновлення: миттєво показуємо нову колонку під час drag&drop,
  // поки серверна дія та revalidatePath не підтвердять зміну.
  const [items, applyOptimisticMove] = useOptimistic(
    requests,
    (state, move: { id: string; status: RequestStatus }) =>
      state.map((r) => (r.id === move.id ? { ...r, status: move.status } : r))
  );

  function handleDrop(e: React.DragEvent, status: RequestStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    if (!canEdit) return;

    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const current = items.find((r) => r.id === id);
    if (!current || current.status === status) return;

    startTransition(async () => {
      applyOptimisticMove({ id, status });
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", status);
      await updateStatus(fd);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const columnItems = items.filter((r) => r.status === status);
        const isCancelled = status === "CANCELLED";
        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={(e) => handleDrop(e, status)}
            className={`w-72 flex-shrink-0 rounded-xl border transition-colors ${
              isCancelled ? "border-slate-200 bg-slate-100/60" : "border-slate-200 bg-slate-50"
            } ${dragOverStatus === status ? "ring-2 ring-teal-400" : ""}`}
          >
            <div
              className={`flex items-center justify-between rounded-t-xl px-4 py-3 ${
                isCancelled ? "opacity-70" : ""
              }`}
            >
              <span className={`text-xs font-semibold ${isCancelled ? "text-slate-500" : "text-slate-700"}`}>
                {STATUS_LABELS[status]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[status]}`}
              >
                {columnItems.length}
              </span>
            </div>

            <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-3 pb-3">
              {columnItems.map((r) => (
                <div
                  key={r.id}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", r.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <Card className="p-3 hover:shadow-md">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <Link
                        href={`/requests/${r.id}`}
                        className="font-medium text-teal-600 hover:underline"
                      >
                        #{r.number}
                      </Link>
                      <span className="flex items-center gap-1 text-xs" title={SOURCE_LABELS[r.source]}>
                        <PlatformIcon id={r.source} fallback={SOURCE_ICONS[r.source]} size={13} />
                        {SOURCE_LABELS[r.source]}
                      </span>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-slate-700">{r.title}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate">
                        {r.client ? (
                          <Link href={`/clients/${r.client.id}`} className="hover:underline">
                            {r.client.fullName}
                          </Link>
                        ) : (
                          "— без клієнта —"
                        )}
                      </span>
                      <span className="font-semibold text-slate-700">{formatUAH(r.amount)}</span>
                    </div>
                    {r.manager && (
                      <div className="mt-1.5 text-xs text-slate-400">👤 {r.manager}</div>
                    )}
                  </Card>
                </div>
              ))}
              {columnItems.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-slate-300">Порожньо</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
