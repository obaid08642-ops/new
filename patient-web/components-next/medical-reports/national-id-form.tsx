"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { normaliseNationalId } from "@/lib/medical-reports/national-id";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

export type NationalIdLabels = { title: string; hint: string; label: string; save: string; saving: string; invalid: string; failed: string; saved: string };

/**
 * Owner decision 6 (2026-11-10): the national ID / iqama number is asked for only when a medical report needs it. The number is checked here
 * as the server checks it, then saved with PUT /care/sick-leaves/national-id (stored encrypted, shown in full only on the report).
 * `refresh` re-reads the page after saving (the report page); `onSaved` tells the booking form that the number now exists.
 */
export function NationalIdForm({ labels, refresh = false, onSaved }: { labels: NationalIdLabels; refresh?: boolean; onSaved?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (busy) return;
    const id = normaliseNationalId(value);
    if (!id) { setError(labels.invalid); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/patient/care/sick-leaves/national-id", { method: "PUT", headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() }, body: JSON.stringify({ national_id: id }) });
      if (!res.ok) { setError(res.status === 400 ? labels.invalid : labels.failed); return; }
      setSaved(true); setValue("");
      onSaved?.();
      if (refresh) router.refresh();
    } catch { setError(labels.failed); } finally { setBusy(false); }
  }

  if (saved) return <p className={styles.ok} role="status">{labels.saved}</p>;
  return (
    <section className={rx.card} aria-labelledby="national-id-title" data-testid="national-id-form">
      <h2 id="national-id-title" className={styles.sectionTitle}>{labels.title}</h2>
      <p className={rx.note}>{labels.hint}</p>
      <label className={styles.field}>
        <span className={styles.label}>{labels.label}</span>
        <input className={styles.control} inputMode="numeric" autoComplete="off" maxLength={30} value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <Button label={busy ? labels.saving : labels.save} loading={busy} disabled={busy || value.trim() === ""} onClick={() => void save()} />
    </section>
  );
}
