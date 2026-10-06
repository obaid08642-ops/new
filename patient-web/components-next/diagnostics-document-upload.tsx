"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { diagnosticBookingHref } from "@/lib/diagnostics-links";

const KINDS = ["doctor_request", "preauth", "insurance_card", "other"] as const;
const KIND_KEYS = { doctor_request: "docDoctorRequest", preauth: "docPreauth", insurance_card: "docInsuranceCard", other: "docOther" } as const;

/** The upload of an insurance document for a booking (canvas/RxUpload): the kind, a note, and the file (up to 8 MB). The upload and where it goes next are unchanged; this is its markup and texts. */
export function DiagnosticsDocumentUpload({ locale, bookingId }: { locale: string; bookingId: string }) {
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("doctor_request");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError(t("errFileSize"));
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/diagnostics/bookings/${encodeURIComponent(bookingId)}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, data_url: dataUrl, note: note.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || t("errUpload"));
        return;
      }
      router.push(diagnosticBookingHref(locale, "labs", bookingId));
      router.refresh();
    } catch {
      setError(t("errUpload"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={consult.stack}>
      <div className={rx.drop}>
        <FIcon icon="shield-check" tone={DIAG_TONES.info} size={72} />
        <p className={rx.dropTitle}>{t("uploadDropTitle")}</p>
        <p className={rx.dropHint}>{t("uploadDropHint")}</p>
        <label className={`nabd-button nabd-button--primary nabd-button--lg ${styles.fileBtn}`}>
          <span className="nabd-button__label">{saving ? t("uploading") : t("uploadChoose")}</span>
          <input className="sr-only" type="file" accept="image/*,.pdf" disabled={saving} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <label className={consult.field}>
        <span className={consult.label}>{t("docKind")}</span>
        <select className={consult.control} value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
          {KINDS.map((k) => <option key={k} value={k}>{t(KIND_KEYS[k])}</option>)}
        </select>
      </label>
      <label className={consult.field}>
        <span className={consult.label}>{t("docNote")} <span className={consult.muted}>{t("optional")}</span></span>
        <input className={consult.control} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </label>
      {saving ? <p className={styles.flowNote} role="status">{t("uploading")}</p> : null}
      {error ? <p className={consult.error} role="alert">{error}</p> : null}
    </div>
  );
}
