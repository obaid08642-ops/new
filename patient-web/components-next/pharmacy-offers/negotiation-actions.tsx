"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { buildNegotiationMessage } from "@/lib/api/pharmacy-negotiation";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

type Props = {
  threadId: string;
  /** Messages that carry a substitute: each is one the patient can accept (the server records it against that message). */
  substituteMessageIds: string[];
  /** Only an open conversation takes a message or a decision. */
  open: boolean;
};


/**
 * The patient's side of a negotiation: a message to the pharmacy, and the three decisions on a suggested substitute
 * (accept it, reject it, take the item out of the order). A decision records "pending a revised final price": no
 * price, total or payment changes here, so nothing on screen is updated by guess; the page re-reads the server.
 */
export function NegotiationActions({ threadId, substituteMessageIds, open }: Props) {
  const t = useTranslations("PharmacyOffers");
  const router = useRouter();
  const action = usePharmacyAction();
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<"sent" | "decided" | null>(null);
  const [invalid, setInvalid] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);
    const body = buildNegotiationMessage(text);
    if (!body) { setInvalid(true); return; }
    setInvalid(false);
    // the same text is the same request: a retry after a dropped connection reuses its idempotency key
    const result = await action.run(`message:${body.text}`, `/api/patient/pharmacy/chat/threads/${encodeURIComponent(threadId)}/messages`, body);
    if (!result?.ok) return;
    setText("");
    setOutcome("sent");
    router.refresh();
  }

  async function decide(id: string, kind: "accept" | "reject" | "remove", messageId?: string) {
    setOutcome(null);
    const thread = encodeURIComponent(threadId);
    const path = kind === "accept" ? `/api/patient/pharmacy/chat/threads/${thread}/accept-substitute/${encodeURIComponent(messageId ?? "")}` : kind === "reject" ? `/api/patient/pharmacy/chat/threads/${thread}/reject` : `/api/patient/pharmacy/chat/threads/${thread}/remove-item`;
    const result = await action.run(id, path, {});
    if (!result?.ok) return;
    setOutcome("decided");
    router.refresh();
  }

  if (!open) return <p className={styles.notice}>{t("threadClosedNote")}</p>;
  const sending = action.pending && action.activeId?.startsWith("message:");
  return (
    <div className={styles.panel}>
      {substituteMessageIds.length ? (
        <div className={styles.actions}>
          {substituteMessageIds.map((id) => (
            <Button key={id} label={action.activeId === `accept:${id}` && action.pending ? t("deciding") : t("acceptSubstitute")} size="lg" fullWidth loading={action.pending && action.activeId === `accept:${id}`} disabled={action.pending} onClick={() => decide(`accept:${id}`, "accept", id)} />
          ))}
          <div className={styles.actionsRow}>
            <Button label={action.pending && action.activeId === "reject" ? t("deciding") : t("rejectSubstitute")} variant="secondary" size="md" loading={action.pending && action.activeId === "reject"} disabled={action.pending} onClick={() => decide("reject", "reject")} />
            <Button label={action.pending && action.activeId === "remove-item" ? t("deciding") : t("removeItem")} variant="secondary" size="md" loading={action.pending && action.activeId === "remove-item"} disabled={action.pending} onClick={() => decide("remove-item", "remove")} />
          </div>
        </div>
      ) : null}
      <form className={styles.compose} onSubmit={send}>
        <label className={styles.fieldLabel} htmlFor="negotiation-text">{t("messageLabel")}</label>
        <textarea id="negotiation-text" className={styles.field} name="text" rows={3} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} aria-describedby="negotiation-hint" aria-invalid={invalid || undefined} required dir="auto" />
        <p className={styles.note} id="negotiation-hint">{t("messageHint")}</p>
        <Button label={sending ? t("sending") : t("send")} type="submit" size="lg" fullWidth loading={sending} disabled={action.pending} />
      </form>
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
      {outcome && !action.error ? <p className={styles.okText} role="status">{outcome === "sent" ? t("messageSent") : t("decisionRecorded")}</p> : null}
    </div>
  );
}
