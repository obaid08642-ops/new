"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { PHARMACY_RETURN_REASONS, returnErrorKey, type PharmacyReturnReason } from "@/lib/returns/pharmacy-return";
import { ScanStatusBadge } from "@/components-next/uploads/scan-status-badge";
import { scanStateOfUpload, type ScanState } from "@/lib/uploads/scan-status";
import forms from "@/components-next/consult/consult.module.css";

const TYPES = ["consultation", "diagnostics", "pharmacy", "nursing"] as const;
type ServiceType = (typeof TYPES)[number];

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

/**
 * The return request form (POST /api/returns). For a pharmacy order (owner decision 4, 2026-11-10) the reason is one of four defect reasons
 * sent as `reason_code`, and a photo is required: it is uploaded first (POST /api/returns/upload, purpose report) and sent as `attachedDocs: ["media:<id>"]`.
 * The other services keep the free-text reason.
 */
export function ReturnRequestForm({ locale }: { locale: string }) {
  const t = useTranslations("ReturnsWeb");
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceType>("consultation");
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<PharmacyReturnReason | "">("");
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // the scan state of the photos: "pending" while a photo is still being checked for safety, "rejected" when the scanner refused it (upload another)
  const [photoScan, setPhotoScan] = useState<ScanState>("ok");
  const [pendingDocs, setPendingDocs] = useState<string[]>([]);
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pharmacy = serviceType === "pharmacy";
  const photoInput = useRef<HTMLInputElement>(null);

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const res = await fetch("/api/returns/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data_url: await readAsDataUrl(file), name: file.name || "return-evidence.jpg" }) });
      const answer = (await res.json().catch(() => null)) as { id?: string; data?: { id?: string } } | null;
      if (!res.ok && scanStateOfUpload(answer) === "rejected") { setPhotoScan("rejected"); return; }
      const id = answer?.id ?? answer?.data?.id;
      if (!res.ok || !id) { setError(t("uploadFailed")); return; }
      setPhotoScan("ok");
      setDocs((rows) => [...rows, `media:${id}`]);
      // a photo that is still being checked stays on the request: the pharmacy sees it once it has passed
      if (scanStateOfUpload(answer) === "pending") setPendingDocs((rows) => [...rows, `media:${id}`]);
    } catch { setError(t("uploadFailed")); } finally { setUploading(false); }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (pharmacy) {
      if (!reasonCode) { setError(t("reasonRequired")); return; }
      if (docs.length === 0) { setError(t("photoRequiredError")); return; }
    } else if (reason.trim().length < 3) { setError(t("reasonRequired")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceType,
          reason: pharmacy ? t(`pharmacyReason_${reasonCode}`) : reason.trim(),
          orderId: orderId.trim(),
          details: details.trim(),
          refundMethod: "original",
          ...(pharmacy ? { reason_code: reasonCode, attachedDocs: docs } : {}),
          // No client-side amount: the server prices the return from the order (needs-review issue 776).
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
        const key = returnErrorKey(body?.message);
        setError(key ? t(key) : t("submitFailed"));
        return;
      }
      router.push(`/${locale}/returns`);
      router.refresh();
    } catch {
      setError(t("submitFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <label className={forms.field}>
        <span className={forms.label}>{t("serviceType")}</span>
        <select className={forms.control} value={serviceType} onChange={(event) => setServiceType(event.target.value as ServiceType)}>
          {TYPES.map((type) => <option key={type} value={type}>{t(`type.${type}`)}</option>)}
        </select>
      </label>
      {pharmacy ? (
        <>
          <fieldset className={forms.field}>
            <legend className={forms.label}>{t("pharmacyReasonTitle")}</legend>
            {PHARMACY_RETURN_REASONS.map((code) => (
              <label key={code} className={forms.field}>
                <span><input type="radio" name="reason_code" value={code} checked={reasonCode === code} onChange={() => setReasonCode(code)} /> {t(`pharmacyReason_${code}`)}</span>
              </label>
            ))}
          </fieldset>
          <div className={forms.field}>
            <p className={forms.label}>{t("photoRequired")}</p>
            <label>
              <span className={forms.label}>{uploading ? t("uploading") : t("photoAdd")}</span>
              <input ref={photoInput} type="file" accept="image/*" disabled={uploading} onChange={(event) => void onPhoto(event)} data-testid="return-photo" />
            </label>
            {docs.length > 0 ? (
              <p role="status">{t("photoAdded")} ({docs.length}) <button type="button" className={forms.choice} onClick={() => { setDocs([]); setPendingDocs([]); setPhotoScan("ok"); }}>{t("photoRemove")}</button></p>
            ) : null}
            <ScanStatusBadge state={photoScan === "rejected" ? "rejected" : docs.some((d) => pendingDocs.includes(d)) ? "pending" : "ok"} onReupload={() => photoInput.current?.click()} />
          </div>
        </>
      ) : (
        <label className={forms.field}>
          <span className={forms.label}>{t("reason")}</span>
          <textarea className={forms.control} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} required />
        </label>
      )}
      <label className={forms.field}>
        <span className={forms.label}>{t("orderId")}</span>
        <input className={forms.control} value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={128} dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("details")}</span>
        <textarea className={forms.control} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={3} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("submit")} loading={saving} disabled={uploading} fullWidth />
    </form>
  );
}
