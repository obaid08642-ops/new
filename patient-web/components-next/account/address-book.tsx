"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { GeoSelect } from "./geo-select";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

export type PatientAddress = {
  id: string;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  notes?: string | null;
  is_default?: boolean | null;
};

/**
 * The patient's saved addresses (GET /users/me/addresses, read by the page) with a remove on each
 * (DELETE /api/patient/users/me/addresses/:id). The address text is what the patient typed; the city and district are the
 * codes the server stored, as before.
 */
export function AddressList({ addresses }: { addresses: PatientAddress[] }) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function remove(id: string) {
    setRemoving(id);
    setError(false);
    try {
      const res = await fetch(`/api/patient/users/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) setError(true);
      else router.refresh();
    } catch {
      setError(true);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <ul className={rx.list} aria-label={t("listLabel")}>
        {addresses.map((address) => {
          const lines = [[address.line1, address.line2], [address.district, address.city]].map((parts) => parts.filter(Boolean).join("، ")).filter(Boolean);
          return (
            <li key={address.id}>
              <div className={rx.listRow}>
                <FIcon icon="map-pin" tone={SERVICE_ICONS.pharmacy.tone} size={40} />
                <span className={rx.rowBody}>
                  <span className={rx.rowTitle}>{address.label || t("unnamed")}</span>
                  {lines.map((line) => <span key={line} className={rx.rowSub}>{line}</span>)}
                  {address.is_default ? <StatusChip label={t("default")} tone={OFFER_TONES.good} /> : null}
                </span>
                <Button label={removing === address.id ? t("removing") : t("remove")} variant="outline" size="sm" disabled={removing !== null} onClick={() => void remove(address.id)} />
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className={forms.error} role="alert">{t("removeFailed")}</p> : null}
    </>
  );
}

/** "Add a new address": POST /api/patient/users/me/addresses with the fields the old form sent. */
export function AddAddressForm({ locale }: { locale: string }) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "failed">("idle");
  const [form, setForm] = useState({ label: "", line1: "", line2: "", city: "", district: "", region: "", notes: "" });

  function update(key: keyof typeof form, value: string) {
    setState("idle");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setState("idle");
    try {
      const res = await fetch("/api/patient/users/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setState("saved");
        setForm({ label: "", line1: "", line2: "", city: "", district: "", region: "", notes: "" });
        router.refresh();
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.stack} aria-labelledby="add-address">
      <h2 id="add-address" className={rx.h2}>{t("addTitle")}</h2>
      <label className={forms.field}>
        <span className={forms.label}>{t("label")}</span>
        <input className={forms.control} value={form.label} onChange={(event) => update("label", event.target.value)} required maxLength={80} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("line1")}</span>
        <input className={forms.control} value={form.line1} onChange={(event) => update("line1", event.target.value)} required maxLength={160} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("line2")}</span>
        <input className={forms.control} value={form.line2} onChange={(event) => update("line2", event.target.value)} maxLength={160} />
      </label>
      <GeoSelect value={{ region: form.region, city: form.city, district: form.district }} onChange={(next) => { setState("idle"); setForm((prev) => ({ ...prev, ...next })); }} locale={locale} />
      <label className={forms.field}>
        <span className={forms.label}>{t("notes")}</span>
        <textarea className={forms.control} value={form.notes} onChange={(event) => update("notes", event.target.value)} maxLength={300} rows={2} />
      </label>
      {state === "failed" ? <p className={forms.error} role="alert">{t("saveFailed")}</p> : null}
      {state === "saved" ? <p className={forms.ok} role="status">{t("saved")}</p> : null}
      <Button type="submit" label={submitting ? t("saving") : t("save")} loading={submitting} fullWidth />
    </form>
  );
}
