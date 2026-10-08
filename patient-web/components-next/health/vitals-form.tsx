"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { useSheetClose } from "./form-sheet";
import forms from "@/components-next/consult/consult.module.css";

/** The six readings the patient can log, with the unit the backend stores (a code, not a label). */
const TYPES = [
  { key: "bp", unit: "mmHg" },
  { key: "glucose", unit: "mg/dL" },
  { key: "heart_rate", unit: "bpm" },
  { key: "weight", unit: "kg" },
  { key: "temperature", unit: "°C" },
  { key: "spo2", unit: "%" },
] as const;

type TypeKey = (typeof TYPES)[number]["key"];

/**
 * "Add reading" (the old vitals log form, now in a sheet): the same payload to the same endpoint (POST /api/health/vitals).
 * On success it closes the sheet and reloads the screen's readings.
 */
export function VitalsForm() {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const close = useSheetClose();
  const [type, setType] = useState<TypeKey>("bp");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const meta = TYPES.find((item) => item.key === type);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { type, unit: meta?.unit };
    if (type === "bp") {
      const systolic = Number(primary);
      const diastolic = Number(secondary);
      if (!primary.trim() || !secondary.trim() || !Number.isFinite(systolic) || !Number.isFinite(diastolic)) { setError(t("readingRequired")); return; }
      payload.systolic = systolic;
      payload.diastolic = diastolic;
    } else {
      const value = Number(primary);
      if (!primary.trim() || !Number.isFinite(value)) { setError(t("readingRequired")); return; }
      payload.value = value;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/health/vitals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { setError(t("readingFailed")); return; }
      close();
      router.refresh();
    } catch {
      setError(t("readingFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <div className={forms.choices} role="group" aria-label={t("readingType")}>
        {TYPES.map((item) => (
          <button key={item.key} type="button" className={forms.choice} aria-pressed={type === item.key} onClick={() => { setType(item.key); setError(null); }}>
            {t(`vital.${item.key}`)}
          </button>
        ))}
      </div>
      {type === "bp" ? (
        <div className={forms.two}>
          <label className={forms.field}>
            <span className={forms.label}>{t("systolic")}</span>
            <input className={forms.control} value={primary} onChange={(event) => setPrimary(event.target.value)} inputMode="decimal" required dir="ltr" />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{t("diastolic")}</span>
            <input className={forms.control} value={secondary} onChange={(event) => setSecondary(event.target.value)} inputMode="decimal" required dir="ltr" />
          </label>
        </div>
      ) : (
        <label className={forms.field}>
          <span className={forms.label}>{t("readingValue", { unit: meta?.unit ?? "" })}</span>
          <input className={forms.control} value={primary} onChange={(event) => setPrimary(event.target.value)} inputMode="decimal" required dir="ltr" />
        </label>
      )}
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("saveReading")} loading={saving} fullWidth />
    </form>
  );
}
