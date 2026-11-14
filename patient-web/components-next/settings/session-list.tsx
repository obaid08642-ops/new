"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FlushCard } from "./settings-kit";
import styles from "./settings.module.css";

export type SessionRow = { id?: string; device?: string | null; expiresInSeconds?: number; current?: boolean; label?: string | null; platform?: string | null; ip?: string | null; lastSeenAt?: string | null };

/**
 * The patient's active sessions (GET /users/me/sessions) with a sign-out per session (DELETE /users/me/sessions/:jti, through
 * the BFF route that adds the idempotency key the backend requires). Only the first eight are drawn; the rest are counted.
 */
export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("SettingsWeb");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const locale = useLocale();
  const shown = sessions.slice(0, 8);
  const hidden = Math.max(0, sessions.length - shown.length);

  async function end(id: string) {
    if (busy) return;
    setBusy(id);
    setFailed(false);
    setConfirming(null);
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
              <span className={styles.itemTitle}>{[session.label || session.device || t("deviceUnknown"), session.platform].filter(Boolean).join(" · ")}</span>
              {session.ip ? <span className={styles.itemSub} dir="ltr">{session.ip}</span> : null}
              {session.lastSeenAt && !Number.isNaN(Date.parse(session.lastSeenAt)) ? <span className={styles.itemSub}>{t("sessionLastSeen", { when: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.lastSeenAt)) })}</span> : null}
              {session.expiresInSeconds !== undefined ? <span className={styles.itemSub}>{t("sessionExpires", { days: Math.ceil(session.expiresInSeconds / 86400) })}</span> : null}
            </span>
            {session.current ? <StatusChip label={t("sessionCurrent")} tone={OFFER_TONES.good} /> : null}
            {session.id && confirming === session.id ? <>
              <Button label={t("sessionEndConfirm")} variant="danger" size="sm" loading={busy === session.id} onClick={() => void end(session.id as string)} />
              <Button label={t("cancel")} variant="outline" size="sm" onClick={() => setConfirming(null)} />
            </> : session.id ? <Button label={t("sessionEnd")} variant="outline" size="sm" loading={busy === session.id} disabled={busy !== null} onClick={() => setConfirming(session.id as string)} /> : null}
          </div>
        ))}
      </FlushCard>
      {hidden ? <p className={styles.hint}>{t("sessionsSummary", { shown: shown.length, total: sessions.length })}</p> : null}
      {failed ? <p className={styles.error} role="alert">{t("sessionEndFailed")}</p> : null}
    </>
  );
}
