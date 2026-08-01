import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader, Button, Select, Input, EmptyState, PlatformIcon } from "@/components/ui";
import {
  CHANNEL_LABELS,
  CHANNEL_ICONS,
  CHANNEL_COLORS,
} from "@/lib/labels";
import type { MessengerChannel } from "@prisma/client";
import { sendMessage, createConversation, simulateIncoming } from "./actions";

export const dynamic = "force-dynamic";

const CHANNELS = ["TELEGRAM", "VIBER", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "EMAIL", "SMS"] as const;

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(d);
}

export default async function MessengersPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; channel?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "messengers", "view")) redirect("/");
  const canWrite = can(me, "messengers", "create");

  const { c, channel } = await searchParams;
  const channelFilter = (CHANNELS as readonly string[]).includes(channel ?? "")
    ? (channel as MessengerChannel)
    : undefined;

  // позначаємо відкритий діалог прочитаним (до вибірки списку)
  if (c) {
    await prisma.conversation.updateMany({ where: { id: c, unread: { gt: 0 } }, data: { unread: 0 } });
  }

  const [conversations, clients] = await Promise.all([
    prisma.conversation.findMany({
      where: { channel: channelFilter },
      include: { client: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { fullName: "asc" } }),
  ]);

  const selected = c
    ? await prisma.conversation.findUnique({
        where: { id: c },
        include: { client: true, messages: { orderBy: { createdAt: "asc" }, include: { author: true } } },
      })
    : null;

  const totalUnread = conversations.reduce((s, cv) => s + cv.unread, 0);

  return (
    <>
      <PageHeader title="Месенджери" subtitle={`Єдине вікно комунікацій${totalUnread ? ` · ${totalUnread} непрочитаних` : ""}`} icon="messengers" />

      <div className="grid h-[calc(100vh-89px)] grid-cols-[340px_1fr]">
        {/* Ліва панель — діалоги */}
        <div className="flex flex-col border-r border-brand/10 bg-surface">
          {/* фільтр каналів */}
          <div className="flex flex-wrap gap-1.5 border-b border-brand/10 p-3">
            <ChipLink href="/messengers" active={!channelFilter} label="Усі" />
            {CHANNELS.map((ch) => (
              <ChipLink
                key={ch}
                href={`/messengers?channel=${ch}`}
                active={channelFilter === ch}
                label={<PlatformIcon id={ch} fallback={CHANNEL_ICONS[ch]} size={14} />}
                title={CHANNEL_LABELS[ch]}
              />
            ))}
          </div>

          {canWrite && (
            <details className="border-b border-brand/10">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-brand">＋ Новий діалог</summary>
              <form action={createConversation} className="space-y-2 px-4 pb-4">
                <Select name="channel" defaultValue="TELEGRAM">
                  {CHANNELS.map((ch) => (<option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>))}
                </Select>
                <Select name="clientId" defaultValue="">
                  <option value="">— контакт без клієнта —</option>
                  {clients.map((cl) => (<option key={cl.id} value={cl.id}>{cl.fullName}</option>))}
                </Select>
                <Input name="externalId" placeholder="@нік / телефон / email" />
                <Button type="submit" className="w-full">Створити</Button>
              </form>
            </details>
          )}

          {/* список */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((cv) => {
              const last = cv.messages[0];
              const isActive = cv.id === c;
              return (
                <Link
                  key={cv.id}
                  href={`/messengers?c=${cv.id}`}
                  className={`flex gap-3 border-b border-brand/5 px-4 py-3 transition-colors ${isActive ? "bg-brand/10" : "hover:bg-white/5"}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${CHANNEL_COLORS[cv.channel]}`}>
                    <PlatformIcon id={cv.channel} fallback={CHANNEL_ICONS[cv.channel]} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{cv.title}</span>
                      <span className="shrink-0 text-[11px] text-muted">{fmtTime(cv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted">
                        {last ? (last.direction === "OUT" ? "Ви: " : "") + last.content : "—"}
                      </span>
                      {cv.unread > 0 && (
                        <span className="ml-1 shrink-0 rounded-full bg-brand px-1.5 text-[11px] font-medium text-background">{cv.unread}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {conversations.length === 0 && (
              <EmptyState icon="messengers" title="Діалогів немає" />
            )}
          </div>
        </div>

        {/* Права панель — листування */}
        <div className="flex flex-col bg-background">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-brand/10 bg-surface px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${CHANNEL_COLORS[selected.channel]}`}>
                    <PlatformIcon id={selected.channel} fallback={CHANNEL_ICONS[selected.channel]} size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {selected.client ? (
                        <Link href={`/clients/${selected.client.id}`} className="hover:underline">{selected.title}</Link>
                      ) : selected.title}
                    </div>
                    <div className="text-xs text-muted">{CHANNEL_LABELS[selected.channel]}{selected.externalId ? ` · ${selected.externalId}` : ""}</div>
                  </div>
                </div>
                {canWrite && (
                  <form action={simulateIncoming}>
                    <input type="hidden" name="conversationId" value={selected.id} />
                    <Button type="submit" variant="secondary" size="sm" title="Демо: імітувати вхідне повідомлення">⬇ Вхідне (демо)</Button>
                  </form>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-6">
                {selected.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.direction === "OUT" ? "bg-brand text-background" : "bg-surface text-foreground ring-1 ring-brand/10"}`}>
                      {m.attachment && <div className={`mb-1 text-xs ${m.direction === "OUT" ? "text-background/70" : "text-muted"}`}>📎 {m.attachment}</div>}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className={`mt-1 text-[10px] ${m.direction === "OUT" ? "text-background/70" : "text-muted"}`}>
                        {m.direction === "OUT" && m.author ? `${m.author.fullName} · ` : ""}{fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {selected.messages.length === 0 && (
                  <EmptyState icon="inbox" title="Повідомлень ще немає" />
                )}
              </div>

              {canWrite && (
                <form action={sendMessage} className="border-t border-brand/10 bg-surface p-3">
                  <input type="hidden" name="conversationId" value={selected.id} />
                  <div className="flex items-end gap-2">
                    <Input name="attachment" placeholder="📎 файл/фото (опц.)" className="w-40" />
                    <Input name="content" placeholder="Напишіть повідомлення… 🙂" autoComplete="off" className="flex-1" />
                    <Button type="submit">Надіслати</Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Оберіть діалог зі списку зліва
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ChipLink({ href, active, label, title }: { href: string; active: boolean; label: ReactNode; title?: string }) {
  return (
    <Link
      href={href}
      title={title}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-brand text-background" : "bg-white/5 text-muted hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}
