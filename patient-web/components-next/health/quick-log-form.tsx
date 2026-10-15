"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";

/** Arabic-Indic and Persian digits typed on a phone keyboard become 0-9 before the number is read. */
const latin = (value: string) => value.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(",", ".");

/**
 * The logs the app writes and the website now writes too (issues 862, 864, 869), each the app's own call through the patient
 * proxy. Every field is checked here before sending; a number field may be typed in another unit (`scale`, e.g. minutes sent
 * as seconds).
 */
export const QUICK_LOGS = {
  water: { path: "/nutrition/water", fields: [{ name: "amount_ml", kind: "number", min: 50, max: 3000, required: true }] },
  mood: {
    path: "/mental-health/mood",
    fields: [
      { name: "mood", kind: "choice", options: ["great", "good", "okay", "bad", "terrible"], required: true },
      { name: "energy_level", kind: "number", min: 1, max: 10 },
      { name: "stress_level", kind: "number", min: 1, max: 10 },
      { name: "sleep_hours", kind: "number", min: 0, max: 24 },
      { name: "notes", kind: "text", maxLength: 500 },
    ],
  },
  kicks: {
    path: "/maternity/kicks",
    fields: [
      { name: "count", kind: "number", min: 1, max: 200, integer: true, required: true },
      { name: "duration_seconds", kind: "number", min: 1, max: 240, scale: 60, required: true },
    ],
  },
  contractions: {
    path: "/maternity/contractions",
    fields: [
      { name: "interval_seconds", kind: "number", min: 1, max: 120, scale: 60, required: true },
      { name: "duration_seconds", kind: "number", min: 5, max: 300, integer: true, required: true },
    ],
  },
  growth: {
    path: "/maternity/infant-growth",
    fields: [
      { name: "month", kind: "number", min: 0, max: 60, integer: true, required: true },
      { name: "weight_kg", kind: "number", min: 0.3, max: 40 },
      { name: "height_cm", kind: "number", min: 20, max: 150 },
      { name: "head_circ_cm", kind: "number", min: 20, max: 60 },
    ],
  },
} as const;

export type QuickLogKind = keyof typeof QUICK_LOGS;
type Field = (typeof QUICK_LOGS)[QuickLogKind]["fields"][number] & { min?: number; max?: number; integer?: boolean; scale?: number; required?: boolean; options?: readonly string[]; maxLength?: number };

/** The body the log sends, or the name of the first field that is not right. */
export function quickLogBody(kind: QuickLogKind, values: Record<string, string>): { ok: true; body: Record<string, unknown> } | { ok: false; field: string } {
  const body: Record<string, unknown> = {};
  for (const raw of QUICK_LOGS[kind].fields) {
    const field = raw as Field;
    const value = (values[field.name] ?? "").trim();
    if (!value) {
      if (field.required) return { ok: false, field: field.name };
      continue;
    }
    if (field.kind === "choice") {
      if (!field.options?.includes(value)) return { ok: false, field: field.name };
      body[field.name] = value;
    } else if (field.kind === "text") {
      body[field.name] = value.slice(0, field.maxLength ?? 500);
    } else {
      const n = Number(latin(value));
      if (!Number.isFinite(n) || (field.integer && !Number.isInteger(n)) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) return { ok: false, field: field.name };
      body[field.name] = field.scale ? Math.round(n * field.scale) : n;
    }
  }
  return { ok: true, body };
}

/**
 * One small log form (water, mood, kicks, contractions, baby growth): the labels come from `LogForms.<kind>.*`, the saved log
 * reloads the page's list, and a failure keeps what was typed.
 */
export function QuickLogForm({ kind }: { kind: QuickLogKind }) {
  const t = useTranslations("LogForms");
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const spec = QUICK_LOGS[kind];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const built = quickLogBody(kind, values);
    if (!built.ok) { setError(t(`${kind}.bad.${built.field}`)); setSaved(false); return; }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/patient${spec.path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-${kind}-${crypto.randomUUID()}` },
        body: JSON.stringify(built.body),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(t("saveError")); return; }
      setValues({});
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate aria-label={t(`${kind}.title`)}>
      {(spec.fields as readonly Field[]).map((field) => field.kind === "choice" ? (
        <fieldset key={field.name} className={forms.fieldset}>
          <legend className={forms.label}>{t(`${kind}.${field.name}`)}</legend>
          <div className={forms.choices}>
            {field.options?.map((option) => (
              <button key={option} type="button" className={forms.choice} aria-pressed={values[field.name] === option} onClick={() => setValues((v) => ({ ...v, [field.name]: option }))}>
                {t(`${kind}.option.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <label key={field.name} className={forms.field}>
          <span className={forms.label}>{t(`${kind}.${field.name}`)}</span>
          {field.kind === "text" ? (
            <textarea className={forms.control} rows={2} maxLength={field.maxLength ?? 500} value={values[field.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} dir="auto" />
          ) : (
            <input className={forms.control} value={values[field.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} inputMode="decimal" maxLength={7} dir="ltr" />
          )}
        </label>
      ))}
      <Button type="submit" variant="outline" label={t(`${kind}.save`)} loading={saving} />
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      {saved ? <p className={forms.label} role="status">{t("saved")}</p> : null}
    </form>
  );
}
