import type { ReactNode } from "react";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./assistant.module.css";

/** What the person asked, as their own bubble in the conversation. */
export function AskedBubble({ text, label }: { text: string; label: string }) {
  return (
    <ol className={rx.messages} aria-label={label}>
      <li className={`${rx.message} ${rx.messageMine}`}>
        <p className={`${rx.bubble} ${rx.bubbleMine}`} dir="auto">{text}</p>
      </li>
    </ol>
  );
}

/**
 * One answer of the assistant (decision 15, UI part): the title, the body, the DISCLAIMER that every answer carries, and the
 * way on (book, ask the pharmacist). An urgent answer is drawn in the danger colours and its actions come first. Every text is
 * the caller's, from the message files or the server.
 */
export function AnswerCard({
  icon,
  tone,
  title,
  disclaimer,
  urgent = false,
  actions,
  children,
}: {
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  disclaimer: string;
  urgent?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={`${styles.answer} ${urgent ? styles.answerUrgent : ""}`} aria-label={title} role={urgent ? "alert" : "status"}>
      <div className={styles.answerHead}>
        <FIcon icon={icon} tone={tone} size={44} />
        <h2 className={styles.answerTitle}>{title}</h2>
      </div>
      {urgent && actions ? <div className={styles.answerActions}>{actions}</div> : null}
      {children}
      <p className={styles.disclaimer}>{disclaimer}</p>
      {!urgent && actions ? <div className={styles.answerActions}>{actions}</div> : null}
    </section>
  );
}
