"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { addressToForm, buildAddressPatch, EMPTY_ADDRESS_FORM, type AddressForm, type AddressRecord } from "@/lib/account/address-form";
import { GeoSelect } from "./geo-select";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

export type PatientAddress = AddressRecord;

/** The fields of an address, shared by the add form and the edit form. */
function AddressFields({ form, onChange, locale }: { form: AddressForm; onChange: (patch: Partial<AddressForm>) => void; locale: string }) {
  const t = useTranslations("Addresses");
  return (
    <>
      <label className={forms.field}>
        <span className={forms.label}>{t("label")}</span>
        <input className={forms.control} value={form.label} onChange={(event) => onChange({ label: event.target.value })} required maxLength={80} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("line1")}</span>
        <input className={forms.control} value={form.line1} onChange={(event) => onChange({ line1: event.target.value })} required maxLength={160} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("line2")}</span>
        <input className={forms.control} value={form.line2} onChange={(event) => onChange({ line2: event.target.value })} maxLength={160} />
      </label>
      <GeoSelect value={{ region: form.region, city: form.city, district: form.district }} onChange={(next) => onChange(next)} locale={locale} />
      <label className={forms.field}>
        <span className={forms.label}>{t("notes")}</span>
        <textarea className={forms.control} value={form.notes} onChange={(event) => onChange({ notes: event.target.value })} maxLength={300} rows={2} />
      </label>
    </>
  );
}

type RowMode = "view" | "edit" | "confirmRemove";

/**
 * The patient's saved addresses (GET /users/me/addresses, read by the page). Each one can be edited in place
 * (PATCH /api/patient/users/me/addresses/:id, only the fields that changed) or removed after a confirmation
 * (DELETE /api/patient/users/me/addresses/:id). The address text is what the patient typed; the city and district are the
 * codes the server stored, as before.
 */
export function AddressList({ addresses, locale }: { addresses: PatientAddress[]; locale: string }) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [mode, setMode] = useState<{ id: string; kind: RowMode } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"remove" | "save" | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);

  const modeOf = (id: string): RowMode => (mode?.id === id ? mode.kind : "view");

  function open(address: PatientAddress, kind: RowMode) {
    setError(null);
    setForm(addressToForm(address));
    setMode(kind === "view" ? null : { id: address.id, kind });
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/users/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) setError("remove");
      else {
        setMode(null);
        router.refresh();
      }
    } catch {
      setError("remove");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent, address: PatientAddress) {
    event.preventDefault();
    const patch = buildAddressPatch(address, form);
    if (!patch) {
      // nothing changed (or the form is not valid, which the required fields already prevent): close without a request
      setMode(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/users/me/addresses/${encodeURIComponent(address.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(patch),
      });
      if (!res.ok) setError("save");
      else {
        setMode(null);
        router.refresh();
      }
    } catch {
      setError("save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ul className={rx.list} aria-label={t("listLabel")}>
        {addresses.map((address) => {
          const lines = [[address.line1, address.line2], [address.district, address.city]].map((parts) => parts.filter(Boolean).join("، ")).filter(Boolean);
          const rowMode = modeOf(address.id);
          return (
            <li key={address.id}>
              <div className={rx.listRow}>
                <FIcon icon="map-pin" tone={SERVICE_ICONS.pharmacy.tone} size={40} />
                <span className={rx.rowBody}>
                  <span className={rx.rowTitle}>{address.label || t("unnamed")}</span>
                  {lines.map((line) => <span key={line} className={rx.rowSub}>{line}</span>)}
                  {address.is_default ? <StatusChip label={t("default")} tone={OFFER_TONES.good} /> : null}
                </span>
                {rowMode === "view" ? (
                  <>
                    <Button label={t("edit")} variant="outline" size="sm" disabled={busy} onClick={() => open(address, "edit")} />
                    <Button label={t("remove")} variant="outline" size="sm" disabled={busy} onClick={() => open(address, "confirmRemove")} />
                  </>
                ) : null}
              </div>
              {rowMode === "confirmRemove" ? (
                <div role="alertdialog" aria-label={t("removeConfirmTitle")} className={styles.stack}>
                  <p className={forms.body}>{t("removeConfirm", { name: address.label || t("unnamed") })}</p>
                  <Button label={busy ? t("removing") : t("removeConfirmYes")} size="sm" loading={busy} disabled={busy} onClick={() => void remove(address.id)} />
                  <Button label={t("cancel")} variant="outline" size="sm" disabled={busy} onClick={() => open(address, "view")} />
                </div>
              ) : null}
              {rowMode === "edit" ? (
                <form onSubmit={(event) => void save(event, address)} className={styles.stack} aria-label={t("editTitle")}>
                  <h2 className={rx.h2}>{t("editTitle")}</h2>
                  <AddressFields form={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} locale={locale} />
                  <Button type="submit" label={busy ? t("saving") : t("save")} loading={busy} disabled={busy} fullWidth />
                  <Button label={t("cancel")} variant="outline" disabled={busy} onClick={() => open(address, "view")} fullWidth />
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error === "remove" ? <p className={forms.error} role="alert">{t("removeFailed")}</p> : null}
      {error === "save" ? <p className={forms.error} role="alert">{t("saveFailed")}</p> : null}
    </>
  );
}

/** "Add a new address": POST /api/patient/users/me/addresses with the fields the old form sent. */
export function AddAddressForm({ locale }: { locale: string }) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "failed">("idle");
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);

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
        setForm(EMPTY_ADDRESS_FORM);
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
      <AddressFields form={form} onChange={(patch) => { setState("idle"); setForm((prev) => ({ ...prev, ...patch })); }} locale={locale} />
      {state === "failed" ? <p className={forms.error} role="alert">{t("saveFailed")}</p> : null}
      {state === "saved" ? <p className={forms.ok} role="status">{t("saved")}</p> : null}
      <Button type="submit" label={submitting ? t("saving") : t("save")} loading={submitting} fullWidth />
    </form>
  );
}
