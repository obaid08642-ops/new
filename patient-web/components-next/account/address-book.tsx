"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { addressToForm, buildAddressPatch, buildCreateBody, EMPTY_ADDRESS_FORM, pointBody, pointFromPosition, type AddressForm, type AddressRecord, type AddressPoint } from "@/lib/account/address-form";
import { GeoSelect } from "./geo-select";
import { AddressMap } from "./address-map/address-map";
import { createReverseController, fillFromReverse, type ReverseController, type ReverseState } from "@/lib/geo/reverse";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";
import { ConfirmDialog } from "@/components-next/confirm/confirm-dialog";
import { Toast } from "@/components-next/feedback/toast";

export type PatientAddress = AddressRecord;

/** Shown in the hint and the error, so the translated text carries no Latin letters of its own. */
const SHORT_ADDRESS_EXAMPLE = "RRRD2929";

/** The fields of an address, shared by the add form and the edit form. */
function AddressFields({ form, onChange, locale, point, onPoint, map, onRegion }: { form: AddressForm; onChange: (patch: Partial<AddressForm>) => void; locale: string; point: AddressPoint | null; onPoint: (next: AddressPoint) => void; map?: ReactNode; onRegion?: (region: string) => void }) {
  const t = useTranslations("Addresses");
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState<"set" | "failed" | null>(null);

  /** The browser's own position puts the pin on the address (the app's "Use my current location"); the browser asks first. */
  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateNote("failed");
      return;
    }
    setLocating(true);
    setLocateNote(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = pointFromPosition(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        if (next) { onPoint(next); setLocateNote("set"); } else setLocateNote("failed");
      },
      () => { setLocating(false); setLocateNote("failed"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }
  const [codeNote, setCodeNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  /** 19.7: GET /national-address/lookup answers the street, district and city of a short address from Saudi Post. */
  async function findShortAddress() {
    setFinding(true);
    setCodeNote(null);
    try {
      const res = await fetch(`/api/patient/national-address/lookup?code=${encodeURIComponent(form.short_address.trim())}`);
      if (res.ok) {
        const found = (await res.json()) as { short_address: string; street?: string; district?: string; city?: string };
        const line = [found.street, found.district, found.city].filter(Boolean).join("، ");
        onChange({ short_address: found.short_address, ...(line ? { line1: line.slice(0, 160) } : {}) });
        setCodeNote({ kind: "ok", text: t("shortAddressFound") });
      } else {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const code = String(body?.message ?? "");
        setCodeNote({ kind: "error", text: t(code.includes("short_address_invalid") ? "shortAddressInvalid" : code.includes("short_address_not_found") ? "shortAddressNotFound" : "shortAddressUnavailable", { example: SHORT_ADDRESS_EXAMPLE }) });
      }
    } catch {
      setCodeNote({ kind: "error", text: t("shortAddressUnavailable") });
    } finally {
      setFinding(false);
    }
  }

  return (
    <>
      {map}
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
      <GeoSelect value={{ region: form.region, city: form.city, district: form.district }} onChange={(next) => onChange(next)} onRegionResolved={onRegion} locale={locale} />
      <label className={forms.field}>
        <span className={forms.label}>{t("building")}</span>
        <input className={forms.control} value={form.building} onChange={(event) => onChange({ building: event.target.value })} maxLength={40} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("floor")}</span>
        <input className={forms.control} value={form.floor} onChange={(event) => onChange({ floor: event.target.value })} maxLength={40} />
      </label>
      {map ? null : (
        <>
          <Button label={locating ? t("locating") : t("useMyLocation")} variant="outline" size="sm" loading={locating} disabled={locating} onClick={useMyLocation} />
          {locateNote === "set" ? <p className={forms.ok} role="status">{t("locationSet")}</p> : null}
          {locateNote === "failed" ? <p className={forms.error} role="alert">{t("locateFailed")}</p> : null}
        </>
      )}
      <label className={forms.field}>
        <span className={forms.label}>{t("notes")}</span>
        <textarea className={forms.control} value={form.notes} onChange={(event) => onChange({ notes: event.target.value })} maxLength={300} rows={2} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("shortAddress")}</span>
        <input className={forms.control} value={form.short_address} onChange={(event) => onChange({ short_address: event.target.value })} placeholder={t("shortAddressPlaceholder", { example: SHORT_ADDRESS_EXAMPLE })} maxLength={20} dir="ltr" autoCapitalize="characters" autoComplete="off" />
      </label>
      <Button label={finding ? t("shortAddressFinding") : t("shortAddressFind")} variant="outline" size="sm" loading={finding} disabled={finding || !form.short_address.trim()} onClick={() => void findShortAddress()} />
      {codeNote ? <p className={codeNote.kind === "ok" ? forms.ok : forms.error} role={codeNote.kind === "ok" ? "status" : "alert"}>{codeNote.text}</p> : null}
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
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [point, setPoint] = useState<AddressPoint | null>(null);

  const modeOf = (id: string): RowMode => (mode?.id === id ? mode.kind : "view");

  function open(address: PatientAddress, kind: RowMode) {
    setError(null);
    setForm(addressToForm(address));
    setPoint(null);
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
        setToast(t("removedToast"));
        router.refresh();
      }
    } catch {
      setError("remove");
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/users/me/addresses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) setError("save");
      else router.refresh();
    } catch {
      setError("save");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent, address: PatientAddress) {
    event.preventDefault();
    // a new pin (the browser's position) is sent with the changed fields; without one the request is the fields alone
    const patch = buildAddressPatch(address, form);
    if (!patch && !point) {
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
        body: JSON.stringify({ ...patch, ...pointBody(point) }),
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
      <Toast message={toast} onDone={() => setToast(null)} />
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
                    {address.is_default ? null : <Button label={t("makeDefault")} variant="outline" size="sm" disabled={busy} onClick={() => void makeDefault(address.id)} />}
                    <Button label={t("edit")} variant="outline" size="sm" disabled={busy} onClick={() => open(address, "edit")} />
                    <Button label={t("remove")} variant="outline" size="sm" disabled={busy} onClick={() => open(address, "confirmRemove")} />
                  </>
                ) : null}
              </div>
              <ConfirmDialog
                open={rowMode === "confirmRemove"}
                title={t("removeConfirmTitle")}
                body={t("removeConfirm", { name: address.label || t("unnamed") })}
                confirmLabel={busy ? t("removing") : t("removeConfirmYes")}
                cancelLabel={t("cancel")}
                destructive
                busy={busy}
                onConfirm={() => void remove(address.id)}
                onCancel={() => open(address, "view")}
              />
              {rowMode === "edit" ? (
                <form onSubmit={(event) => void save(event, address)} className={styles.stack} aria-label={t("editTitle")}>
                  <h2 className={rx.h2}>{t("editTitle")}</h2>
                  <AddressFields form={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} locale={locale} point={point} onPoint={setPoint} />
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

/**
 * "Add a new address" (owner item 4): the map first. Moving the map (or "use my location") puts the pin; once the map has
 * stopped, GET /api/geo/reverse is asked once after about 600 ms and fills the city and district (our catalogue, still
 * pickers), the street, the building number and the short-address code, except the fields the patient has already typed or
 * picked. Manual entry and the short-address code stay below. Save posts the fields and the pin to POST /users/me/addresses.
 */
export function AddAddressForm({ locale }: { locale: string }) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "failed">("idle");
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [point, setPoint] = useState<AddressPoint | null>(null);
  const [reverse, setReverse] = useState<ReverseState>({ status: "idle" });
  const touched = useRef(new Set<keyof AddressForm>());
  const controller = useRef<ReverseController | null>(null);

  useEffect(() => {
    const created = createReverseController({
      onState: (next) => {
        setReverse(next);
        if (next.status === "ok") setForm((prev) => ({ ...prev, ...fillFromReverse(next.result, touched.current) }));
      },
    });
    controller.current = created;
    return () => created.cancel();
  }, []);

  function placePin(next: AddressPoint) {
    setState("idle");
    setPoint(next);
    controller.current?.schedule(next);
  }

  /** What the patient types or picks is kept: a later answer of the map never overwrites it. */
  function edit(patch: Partial<AddressForm>) {
    setState("idle");
    for (const key of Object.keys(patch) as Array<keyof AddressForm>) touched.current.add(key);
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setState("idle");
    try {
      const res = await fetch("/api/patient/users/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(buildCreateBody(form, point)),
      });
      if (res.ok) {
        setState("saved");
        setForm(EMPTY_ADDRESS_FORM);
        setPoint(null);
        setReverse({ status: "idle" });
        touched.current.clear();
        controller.current?.cancel();
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
    <form onSubmit={submit} className={styles.stack} id="new-address" aria-labelledby="add-address">
      <h2 id="add-address" className={rx.h2}>{t("addTitle")}</h2>
      <AddressFields
        form={form}
        onChange={edit}
        onRegion={(region) => setForm((prev) => ({ ...prev, region }))}
        locale={locale}
        point={point}
        onPoint={placePin}
        map={<AddressMap point={point} onPoint={placePin} reverse={reverse} onRetry={() => controller.current?.retry()} locale={locale} />}
      />
      {state === "failed" ? <p className={forms.error} role="alert">{t("saveFailed")}</p> : null}
      {state === "saved" ? <p className={forms.ok} role="status">{t("saved")}</p> : null}
      <Button type="submit" label={submitting ? t("saving") : t("save")} loading={submitting} fullWidth />
    </form>
  );
}
