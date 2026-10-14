"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { buildChatMessage, createChatSender, MAX_MESSAGE_LENGTH, type ChatSendError } from "@/lib/chat/send-message";
import styles from "./consult.module.css";

/**
 * The text composer of the doctor's thread (issue 806). It is drawn only when the server's rules say the patient may chat
 * (the page passes `can_chat` and not `read_only`), sends text only (no attachment or voice), and shows nothing until the
 * server has answered: no optimistic message. A failed send keeps the text and offers "Try again" (the same idempotency key,
 * so a retry after a dropped connection cannot store the message twice). After a send the page re-reads the thread.
 */
export function ChatComposer({ threadId }: { threadId: string }) {
  const t = useTranslations("ChatDetail");
  const router = useRouter();
  const sender = useRef<ReturnType<typeof createChatSender> | null>(null);
  if (sender.current === null) sender.current = createChatSender();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatSendError | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending || !buildChatMessage(text)) return;
    setPending(true);
    setError(null);
    setSent(false);
    const result = await sender.current?.send(threadId, text);
    setPending(false);
    if (!result) return;
    if (result.ok) {
      setText("");
      setSent(true);
      router.refresh();
      return;
    }
    setError(result.kind);
    // the server may have closed the thread or the window: the page re-reads the rules and drops the composer if so
    if (result.kind === "forbidden") router.refresh();
  }

  return (
    <form className={styles.field} onSubmit={submit} aria-label={t("composerTitle")}>
      <label htmlFor="chat-composer-text" className="sr-only">{t("composerLabel")}</label>
      <textarea
        id="chat-composer-text"
        className={styles.control}
        name="body"
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        value={text}
        onChange={(event) => { setText(event.target.value); setSent(false); }}
        placeholder={t("composerPlaceholder")}
        aria-invalid={error === "invalid" || undefined}
        dir="auto"
        required
      />
      <Button label={pending ? t("sending") : t("send")} type="submit" size="lg" fullWidth loading={pending} disabled={pending || !buildChatMessage(text)} />
      {error ? (
        <div role="alert" className={styles.rowSub}>
          <p>{t(`sendErrors.${error}`)}</p>
          {error === "network" || error === "generic" ? <Button label={t("sendRetry")} variant="secondary" size="md" onClick={() => void submit()} disabled={pending} /> : null}
        </div>
      ) : null}
      {sent && !error ? <p role="status" className={styles.rowSub}>{t("sent")}</p> : null}
    </form>
  );
}
