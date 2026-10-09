"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";

const TYPES = ["consultation", "diagnostics", "pharmacy", "nursing"] as const;
type ServiceType = (typeof TYPES)[number];

/** The return request form (POST /api/returns). The payload is the one the old form sent, field for field. */
export function ReturnRequestForm({ locale }: { locale: string }) {
  const t = useTranslations("ReturnsWeb");
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceType>("consultation");
  const [reason, setReason] = useState("");
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (reason.trim().length < 3) { setError(t("reasonRequired")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceType,
          reason: reason.trim(),
          orderId: orderId.trim(),
          details: details.trim(),
          refundMethod: "original",
          // No client-side amount: the server prices the return from the order (needs-review issue 776).
        }),
      });
      if (!res.ok) { setError(t("submitFailed")); return; }
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
      <label className={forms.field}>
        <span className={forms.label}>{t("reason")}</span>
        <textarea className={forms.control} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} required />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("orderId")}</span>
        <input className={forms.control} value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={128} dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("details")}</span>
        <textarea className={forms.control} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={3} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("submit")} loading={saving} fullWidth />
    </form>
  );
}
