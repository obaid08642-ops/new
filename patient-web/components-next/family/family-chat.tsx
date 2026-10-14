"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ErrorState, Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { formatDate } from "@/lib/format-date";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./family.module.css";

type Msg = { id: string; text: string; sender: string; time: string; isMe: boolean; pending?: boolean };

const FAMILY = SERVICE_ICONS.family;

/** LJ-10: classify a /family/chat/messages reply — a 403/not_active_family_member
 * reply means "no family group", not a generic error. */
export function parseFamilyChatGate(status: number, payload: unknown): "ok" | "no-group" | "error" {
  if (status >= 200 && status < 300) return "ok";
  try {
    if (status === 403 && JSON.stringify(payload ?? "").includes("not_active_family_member")) return "no-group";
  } catch { /* fall through */ }
  return "error";
}

function parseMessages(payload: unknown, myId: string): { messages: Msg[]; members: number } {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.rows, root.data, root.messages].find(Array.isArray);
  const messages = (Array.isArray(list) ? list : []).flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const o = m as Record<string, unknown>;
    if (typeof o.text !== "string" || !o.text) return [];
    const senderId = typeof o.sender_id === "string" ? o.sender_id : null;
    const isMe = senderId !== null && senderId === myId;
    const created = typeof o.created_at === "string" ? o.created_at : null;
    return [{
      id: String(o.id ?? `${created ?? ""}-${o.text}`),
      text: o.text,
      sender: isMe ? "" : (typeof o.sender_name === "string" && o.sender_name) || "",
      time: created ?? "",
      isMe,
    }];
  });
  const members = typeof root.member_count === "number" ? root.member_count : 0;
  return { messages, members };
}

/**
 * The family chat on the chat template of the pharmacy chat (bubbles, a message box): the real feed polled every 5 seconds
 * and an optimistic send, exactly as before (GET and POST /api/patient/family/chat/messages). No call button (decision 3).
 */
export function FamilyChat({ locale }: { locale: string }) {
  const t = useTranslations("FamilyWeb");
  const rs = useTranslations("RouteState");
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [members, setMembers] = useState(0);
  const [failed, setFailed] = useState(false);
  const [noGroup, setNoGroup] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const myId = useRef("");
  const stopped = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    try {
      if (!myId.current) {
        const p = await fetch("/api/patient/users/me/profile", { cache: "no-store", credentials: "same-origin" });
        if (p.ok) {
          const pj = await p.json().catch(() => null);
          const proot = (pj && typeof pj === "object" ? pj : {}) as Record<string, unknown>;
          const prec = (proot.data && typeof proot.data === "object" ? proot.data : proot) as Record<string, unknown>;
          if (typeof prec.user_id === "string") myId.current = prec.user_id;
          else if (typeof prec.id === "string") myId.current = prec.id;
        }
      }
      // Backend binding via BFF → callPatientApi("/family/chat/messages") — no mock
      const res = await fetch("/api/patient/family/chat/messages", { cache: "no-store", credentials: "same-origin" });
      const body = await res.json().catch(() => null);
      const gate = parseFamilyChatGate(res.status, body);
      // LJ-10: a patient with no family group gets 403/not_active_family_member —
      // show the create-or-join state, not a generic error.
      if (gate === "no-group") {
        setNoGroup(true);
        setFailed(false);
        stopped.current = true;
        return;
      }
      setNoGroup(false);
      if (!res.ok) { if (!silent) setFailed(true); return; }
      const parsed = parseMessages(body, myId.current);
      setMessages(parsed.messages);
      setMembers(parsed.members);
      setFailed(false);
    } catch { if (!silent) setFailed(true); }
  }, []);

  useEffect(() => {
    stopped.current = false;
    load(false);
    const timer = setInterval(() => { if (!stopped.current) load(true); }, 5000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendFailed(false);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, text, sender: "", time: "", isMe: true, pending: true };
    setMessages((ms) => [...(ms ?? []), optimistic]);
    setDraft("");
    const undo = () => {
      setMessages((ms) => (ms ?? []).filter((m) => m.id !== optimistic.id));
      setDraft(text);
      setSendFailed(true);
    };
    try {
      const res = await fetch("/api/patient/family/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-family-chat-${Date.now()}` },
        body: JSON.stringify({ text }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        undo();
      } else {
        const saved = await res.json().catch(() => null);
        const srec = saved && typeof saved === "object" ? ((saved as Record<string, unknown>).data ?? saved) as Record<string, unknown> : null;
        const realId = srec && typeof srec.id !== "undefined" ? String(srec.id) : optimistic.id;
        setMessages((ms) => (ms ?? []).map((m) => (m.id === optimistic.id ? { ...m, id: realId, pending: false } : m)));
      }
    } catch {
      undo();
    }
    finally { setSending(false); }
  }

  if (noGroup) {
    return (
      <div className={rx.state}>
        <LinkEmptyState
          icon={FAMILY.icon}
          tone={FAMILY.tone}
          title={t("chatNoGroupTitle")}
          body={t("chatNoGroupBody")}
          actionLabel={t("chatJoin")}
          actionHref={`/${locale}/family/add?tab=join`}
          secondaryLabel={t("chatBack")}
          secondaryHref={`/${locale}/family`}
        />
      </div>
    );
  }
  if (messages === null && !failed) {
    return (
      <div role="status" aria-busy="true">
        <span className={rx.srOnly}>{t("chatLoading")}</span>
        <Skeleton variant="block" />
      </div>
    );
  }
  if (failed && messages === null) {
    return (
      <div className={rx.state}>
        <ErrorState title={t("chatLoadError")} retryLabel={rs("retry")} onRetry={() => void load(false)} />
      </div>
    );
  }

  const list = messages ?? [];
  return (
    <>
      {members > 0 ? <p className={rx.note}>{t("chatMembers", { count: members })}</p> : null}
      {list.length === 0 ? (
        <p className={rx.note} role="status">{t("chatEmpty")}</p>
      ) : (
        <ul className={`${rx.messages} ${styles.thread}`} aria-label={t("chatTitle")}>
          {list.map((m) => {
            const when = m.time ? formatDate(locale, m.time, { dateStyle: "medium", timeStyle: "short" }) : null;
            const meta = [m.isMe ? t("chatYou") : m.sender, when].filter(Boolean).join(" · ");
            return (
              <li key={m.id} className={`${rx.message} ${m.isMe ? rx.messageMine : rx.messageTheirs} ${m.pending ? styles.pending : ""}`}>
                {meta ? <span className={rx.messageMeta}>{meta}</span> : null}
                <p className={`${rx.bubble} ${m.isMe ? rx.bubbleMine : rx.bubbleTheirs}`}>{m.text}</p>
              </li>
            );
          })}
        </ul>
      )}
      {sendFailed ? <p className={forms.error} role="alert">{t("chatSendFailed")}</p> : null}
      <form className={styles.composer} onSubmit={(event: FormEvent) => { event.preventDefault(); void send(); }}>
        <Input label={t("chatLabel")} placeholder={t("chatPlaceholder")} value={draft} disabled={sending} onChange={(value) => setDraft(value.slice(0, 2000))} />
        <Button type="submit" label={t("chatSend")} size="lg" loading={sending} disabled={!draft.trim()} />
      </form>
    </>
  );
}
