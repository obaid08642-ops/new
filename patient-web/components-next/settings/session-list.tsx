"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FlushCard } from "./settings-kit";
import styles from "./settings.module.css";

export type SessionRow = { id?: string; device?: string | null; expiresInSeconds?: number };

/**
 * The patient's active sessions (GET /users/me/sessions) with a sign-out per session (DELETE /users/me/sessions/:jti, through
 * the BFF route that adds the idempotency key the backend requires). Only the first eight are drawn; the rest are counted.
 */
export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("SettingsWeb");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = sessions.slice(0, 8);
  const hidden = Math.max(0, sessions.length - shown.length);

  async function end(id: string) {
    if (busy) return;
    setBusy(id);
    setFailed(false);
    try {
      const response = await fetch(`/api/settings/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("session_end_failed");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <FlushCard label={t("sessionsTitle")}>
        {shown.map((session, index) => (
          <div key={session.id ?? `${session.device ?? "unknown"}-${index}`} className={styles.itemRow}>
            <span className={styles.itemText}>
              <span className={styles.itemTitle}>{session.device || t("deviceUnknown")}</span>
              {session.expiresInSeconds !== undefined ? <span className={styles.itemSub}>{t("sessionExpires", { days: Math.ceil(session.expiresInSeconds / 86400) })}</span> : null}
            </span>
            {session.id ? <Button label={t("sessionEnd")} variant="outline" size="sm" loading={busy === session.id} disabled={busy !== null} onClick={() => void end(session.id as string)} /> : null}
          </div>
        ))}
      </FlushCard>
      {hidden ? <p className={styles.hint}>{t("sessionsSummary", { shown: shown.length, total: sessions.length })}</p> : null}
      {failed ? <p className={styles.error} role="alert">{t("sessionEndFailed")}</p> : null}
    </>
  );
}
