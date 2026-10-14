import type { ReactNode } from "react";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import styles from "@/components-next/settings/settings.module.css";

/**
 * The head of canvas/Account: the avatar ring, the full name, a line for the email or the phone, and one action on the end.
 * Every text is the patient's own (GET /users/me/profile); a missing name is not replaced by a made-up one.
 */
export function AccountSummary({ name, lines, action, label }: { name: string; lines: string[]; action?: ReactNode; label: string }) {
  return (
    <section className={styles.summary} aria-label={label}>
      <Avatar name={name} size="lg" />
      <div className={styles.summaryText}>
        <h2 className={styles.summaryName}>{name}</h2>
        {lines.map((line) => <span key={line} className={styles.summarySub}><bdi>{line}</bdi></span>)}
      </div>
      {action}
    </section>
  );
}

/** The patient's name and contact lines from a profile record: the first non-empty name key, then the email and the phone. */
export function profileIdentity(record: Record<string, unknown> | null): { name: string; lines: string[] } {
  const text = (key: string): string => {
    const value = record?.[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const name = text("full_name") || text("fullName") || text("name");
  const lines = [text("email"), text("phone") || text("mobile")].filter(Boolean);
  return { name, lines };
}
