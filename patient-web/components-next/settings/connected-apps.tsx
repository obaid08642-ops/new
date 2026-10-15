"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { AGENT_SCOPE_KEYS, type AgentConnection } from "@/lib/api/agent-connections";
import { FlushCard } from "./settings-kit";
import styles from "./settings.module.css";

/**
 * ac-1-agent-oauth#1: each connected AI assistant with what it may do and a disconnect (DELETE
 * /patient/agent-connections/:clientId, which ends that assistant's tokens at once).
 */
export function ConnectedApps({ connections, locale }: { connections: AgentConnection[]; locale: string }) {
  const t = useTranslations("SettingsWeb");
  const scopes = useTranslations("AgentConsent");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const date = (iso?: string) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d) : null;
  };

  async function disconnect(clientId: string) {
    if (busy) return;
    setBusy(clientId);
    setFailed(false);
    try {
      const response = await fetch(`/api/patient/patient/agent-connections/${encodeURIComponent(clientId)}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("disconnect_failed");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <FlushCard label={t("connectedAppsTitle")}>
        {connections.map((app) => {
          const since = date(app.connectedAt);
          const allowed = app.scopes.map((s) => scopes(AGENT_SCOPE_KEYS[s])).join(" · ");
          return (
            <div key={app.clientId} className={styles.itemRow}>
              <span className={styles.itemText}>
                <span className={styles.itemTitle}><bdi>{app.name ?? app.clientId}</bdi></span>
                {allowed ? <span className={styles.itemSub}>{allowed}</span> : null}
                {since ? <span className={styles.itemSub}>{t("connectedSince", { date: since })}</span> : null}
              </span>
              <Button label={t("disconnectApp")} variant="outline" size="sm" loading={busy === app.clientId} disabled={busy !== null} onClick={() => void disconnect(app.clientId)} />
            </div>
          );
        })}
      </FlushCard>
      {failed ? <p className={styles.error} role="alert">{t("disconnectFailed")}</p> : null}
    </>
  );
}
