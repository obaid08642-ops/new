"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ErrorState, Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { Chip } from "@/components-next/ui-generated/components/Surfaces";
import { formatDate } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { isBlockedMessage, parseThreadMessages, parseThreads, type ChatMessage, type ChatThread } from "@/lib/pharmacy/chat";
import { LinkEmptyState } from "./link-empty-state";
import rx from "./rx.module.css";

type Notice = "send" | "blocked" | "decision" | "session" | null;
const MESSAGE_MAX = 1000;

/**
 * The negotiation with a pharmacy about one item of an order (the app's pharmacist chat). There is no board for it: the
 * layout is the screen's own (a conversation, the pharmacy's substitute offers, a message box), drawn with the shared
 * components and tokens. The accept, reject and remove actions only exist while the thread is open; a closed thread says how it ended.
 */
export function ChatScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  const t = useTranslations("PharmacyChat");
  const flow = useTranslations("PharmacyFlow");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const readThread = useCallback(async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/patient/pharmacy/chat/threads/${encodeURIComponent(id)}/messages`, { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) {
      setNotice("session");
      return false;
    }
    if (!response.ok) return false;
    const parsed = parseThreadMessages(await response.json().catch(() => null));
    setThread(parsed.thread);
    setMessages(parsed.messages);
    return true;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetch(`/api/patient/pharmacy/chat/threads?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) {
        setNotice("session");
        return;
      }
      if (!response.ok) return setLoadFailed(true);
      const list = parseThreads(await response.json().catch(() => null));
      setThreads(list);
      const next = list.find((item) => item.open) ?? list[0];
      setThreadId(next?.id ?? null);
      if (next && !(await readThread(next.id))) setLoadFailed(true);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [orderId, readThread]);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(id: string) {
    setThreadId(id);
    setNotice(null);
    if (!(await readThread(id))) setLoadFailed(true);
  }

  async function post(path: string, body: unknown): Promise<Response | null> {
    const tid = encodeURIComponent(threadId ?? "");
    try {
      return await fetch(`/api/patient/pharmacy/chat/threads/${tid}${path}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
  }

  async function send() {
    const message = text.trim();
    if (!threadId || busy || !message) return;
    setBusy(true);
    setNotice(null);
    const response = await post("/messages", { text: message.slice(0, MESSAGE_MAX) });
    if (response?.ok) {
      setText("");
      await readThread(threadId);
    } else if (response?.status === 401) {
      setNotice("session");
    } else {
      setNotice(response && isBlockedMessage(await response.json().catch(() => null)) ? "blocked" : "send");
    }
    setBusy(false);
  }

  async function decide(path: string) {
    if (!threadId || busy) return;
    setBusy(true);
    setNotice(null);
    const response = await post(path, {});
    if (response?.ok) {
      await readThread(threadId);
    } else {
      setNotice(response?.status === 401 ? "session" : "decision");
    }
    setBusy(false);
  }

  const open = thread?.open === true;
  const resolutionText =
    thread && !thread.open
      ? thread.resolution === "accepted" ? t("resolvedAccepted") : thread.resolution === "rejected" ? t("resolvedRejected") : thread.resolution === "removed" ? t("resolvedRemoved") : t("resolvedClosed")
      : null;
  const noticeText: Record<Exclude<Notice, null>, string> = { send: t("sendFailed"), blocked: t("blocked"), decision: t("decisionFailed"), session: flow("sessionEnded") };

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/orders/${encodeURIComponent(orderId)}`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>

        {loading ? (
          <div role="status" aria-busy="true">
            <span className={rx.srOnly}>{t("loading")}</span>
            <Skeleton variant="block" />
          </div>
        ) : loadFailed ? (
          <div className={rx.state}>
            <ErrorState title={t("loadError")} retryLabel={flow("retry")} onRetry={() => void load()} />
          </div>
        ) : !threadId ? (
          <div className={rx.state}>
            <LinkEmptyState icon="chat-circle-text" tone="blue" title={t("empty")} actionLabel={t("backToOrder")} actionHref={`/${locale}/orders/${encodeURIComponent(orderId)}`} />
          </div>
        ) : (
          <>
            {threads.length > 1 ? (
              <div className={rx.threadTabs} role="group" aria-label={t("threads")}>
                {threads.map((item, index) => (
                  <Chip key={item.id} label={t("threadN", { n: index + 1 })} selected={item.id === threadId} onClick={() => void choose(item.id)} />
                ))}
              </div>
            ) : null}

            <ul className={rx.messages} aria-label={t("title")}>
              {messages.map((message) => {
                const mine = message.from === "patient";
                const when = formatDate(locale, message.createdAt, { dateStyle: "medium", timeStyle: "short" });
                return (
                  <li key={message.id} className={`${rx.message} ${mine ? rx.messageMine : rx.messageTheirs}`}>
                    <span className={rx.messageMeta}>{[mine ? t("fromYou") : t("fromPharmacy"), when].filter(Boolean).join(" · ")}</span>
                    {message.text ? <p className={`${rx.bubble} ${mine ? rx.bubbleMine : rx.bubbleTheirs}`}>{message.text}</p> : null}
                    {message.offer ? (
                      <div className={rx.offer}>
                        <p className={rx.offerTitle}>{message.offer.name || message.offer.sku ? t("substituteTitle", { name: message.offer.name ?? message.offer.sku ?? "" }) : t("substituteUnnamed")}</p>
                        {message.offer.price !== undefined ? <span className={rx.price}>{formatPrice(locale, message.offer.price).text}</span> : null}
                        <p className={rx.note}>{t("substituteNote")}</p>
                        {open ? (
                          <div className={rx.offerActions}>
                            <Button label={t("accept")} size="md" fullWidth disabled={busy} onClick={() => void decide(`/accept-substitute/${encodeURIComponent(message.id)}`)} />
                            <Button label={t("reject")} variant="outline" size="md" fullWidth disabled={busy} onClick={() => void decide("/reject")} />
                            <Button label={t("removeItem")} variant="ghost" size="md" fullWidth disabled={busy} onClick={() => void decide("/remove-item")} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {resolutionText ? <p className={rx.note} role="status">{resolutionText}</p> : null}

            {open ? (
              <div className={rx.composer}>
                <Input
                  label={t("messageLabel")}
                  placeholder={t("messagePlaceholder")}
                  value={text}
                  multiline
                  rows={2}
                  disabled={busy}
                  onChange={(value) => setText(value.slice(0, MESSAGE_MAX))}
                />
                <Button label={busy ? t("sending") : t("send")} size="lg" fullWidth disabled={!text.trim()} loading={busy} onClick={() => void send()} />
              </div>
            ) : null}
          </>
        )}

        {notice ? (
          <div className={rx.error} role="alert">
            {noticeText[notice]}
            {notice === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
          </div>
        ) : null}
      </div>
    </CoreShell>
  );
}
