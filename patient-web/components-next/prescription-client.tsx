"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { ConsultState } from "@/components-next/consult/consult-state";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Med = { id?: string; name?: string; name_ar?: string; dose?: string; dosage?: string; freq?: string; frequency?: string; duration?: string; instruction?: string };
type Prescription = { id?: string; appointment_id?: string; appointmentId?: string; title_ar?: string; title_en?: string; doctor_name?: string; diagnosis?: string; medications?: Med[] };

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The doctor-issued prescription of an appointment: its medicines, a reminder for each, and the order from a pharmacy. */
export function PrescriptionClient({ locale, appointmentId }: { locale: string; appointmentId?: string }) {
  const t = useTranslations("ConsultClient");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<Prescription | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/patient/prescriptions/active", { cache: "no-store", credentials: "same-origin" });
      const data: unknown = await res.json().catch(() => null);
      const root = data as { data?: unknown } | null;
      const list: Prescription[] = Array.isArray(root?.data) ? (root.data as Prescription[]) : Array.isArray(data) ? (data as Prescription[]) : [];
      const match = appointmentId
        ? list.find((p) => String(p.appointment_id || p.appointmentId || "") === String(appointmentId)) || null
        : list[0] || null;
      setItem(match);
    } catch {
      setError(t("rxLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  useEffect(() => { void load(); }, [load]);

  async function addReminder(med: Med) {
    if (busy) return;
    const key = String(med.id || med.name || med.name_ar || "");
    if (!key || added.includes(key)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/patient/health/reminders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        credentials: "same-origin",
        body: JSON.stringify({
          medication_name: med.name || med.name_ar || t("rxMedicineFallback"),
          dosage: med.dosage || med.dose || "",
          frequency: med.frequency || med.freq || "daily",
          prescription_id: item?.id,
        }),
      });
      if (!res.ok) throw new Error("reminder_failed");
      setAdded((p) => [...p, key]);
    } catch {
      setError(t("rxReminderFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={styles.callState} role="status">{t("rxLoading")}</p>;
  if (error) {
    return (
      <div className={rx.card}>
        <p className={styles.error} role="alert">{error}</p>
        <Button variant="outline" label={t("rxRetry")} onClick={() => void load()} />
      </div>
    );
  }
  if (!item) return <ConsultState kind="empty" icon="prescription" title={t("rxNoneTitle")} body={t("rxNone")} />;

  const meds: Med[] = Array.isArray(item.medications) ? item.medications : [];
  return (
    <div className={styles.stack}>
      <section className={rx.card} aria-labelledby="rx-title">
        <h2 id="rx-title" className={styles.sectionTitle}>{item.title_ar || item.title_en || t("rxTitleFallback")}</h2>
        {item.doctor_name ? <p className={styles.body}>{item.doctor_name}</p> : null}
        {item.diagnosis ? <p className={`${styles.body} ${styles.muted}`}>{t("rxDiagnosis", { value: item.diagnosis })}</p> : null}
      </section>
      <ul className={styles.list} aria-label={t("rxMedicines")}>
        {meds.map((m, i) => {
          const key = String(m.id || m.name || m.name_ar || i);
          const done = added.includes(key);
          const dosing = [m.dosage || m.dose, m.frequency || m.freq, m.duration].filter(Boolean).join(" · ");
          return (
            <li key={key} className={rx.card}>
              <span className={styles.rowTitle}>{m.name || m.name_ar}</span>
              {dosing ? <span className={styles.rowSub}>{dosing}</span> : null}
              <Button variant={done ? "ghost" : "outline"} size="sm" label={done ? t("rxInReminders") : t("rxAddReminder")} disabled={busy || done} onClick={() => void addReminder(m)} />
            </li>
          );
        })}
      </ul>
      {item.id ? <ButtonLink href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(item.id)}`} label={t("rxOrder")} /> : null}
    </div>
  );
}
