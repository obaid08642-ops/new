"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Toggle } from "@/components-next/ui-generated/components/Controls";
import { FlushCard } from "./settings-kit";
import styles from "./settings.module.css";

export type SwitchRow = { id: string; group?: string; key: string; label: string; sub?: string; value: boolean };

/** Which endpoint a list of switches saves to; the bodies are exactly the ones the two old screens sent. */
export type SwitchKind = "notifications" | "privacy";

async function saveSwitch(kind: SwitchKind, row: SwitchRow, next: boolean): Promise<boolean> {
  if (kind === "notifications") {
    // the app's own PATCH /users/me/notification-settings, through the patient API proxy
    const response = await fetch("/api/patient/users/me/notification-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ [row.group ?? ""]: { [row.key]: next } }),
    });
    return response.ok;
  }
  const response = await fetch("/api/settings/privacy", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ [row.key]: next }),
  });
  return response.ok;
}

/**
 * A card of named switches (canvas/Settings "الإشعارات"). A switch saves when it is turned; a failed save puts the switch
 * back and says so, and only one save is in flight at a time.
 */
export function SwitchList({ kind, label, rows }: { kind: SwitchKind; label: string; rows: SwitchRow[] }) {
  const t = useTranslations("SettingsWeb");
  const router = useRouter();
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((row) => [row.id, row.value])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  async function save(row: SwitchRow, next: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(row.id);
    setError(false);
    setValues((v) => ({ ...v, [row.id]: next }));
    try {
      if (!(await saveSwitch(kind, row, next))) throw new Error("save_failed");
      if (kind === "privacy") router.refresh();
    } catch {
      setValues((v) => ({ ...v, [row.id]: !next }));
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  return (
    <>
      <FlushCard label={label}>
        {rows.map((row) => (
          <div key={row.id} className={styles.switchRow}>
            <span className={styles.switchText}>
              <span className={styles.switchLabel}>{row.label}</span>
              {row.sub ? <span className={styles.itemSub}>{row.sub}</span> : null}
            </span>
            <Toggle label={row.label} value={values[row.id]} loading={busy === row.id} onChange={(next) => void save(row, next)} />
          </div>
        ))}
      </FlushCard>
      {error ? <p className={styles.error} role="alert">{t("saveFailed")}</p> : null}
    </>
  );
}
