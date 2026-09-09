"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const KINDS = ["doctor_request", "preauth", "insurance_card", "other"] as const;

export function DiagnosticsDocumentUpload({ locale, bookingId }: { locale: string; bookingId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("doctor_request");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError(ar ? "الملف أكبر من 8MB" : "File larger than 8MB");
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
        setError((data as { message?: string })?.message || (ar ? "تعذر الرفع" : "Upload failed"));
        return;
      }
      router.push(`/${locale}/diagnostics/labs/${encodeURIComponent(bookingId)}`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر الرفع" : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "نوع المستند" : "Document kind"}</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "ملاحظة (اختياري)" : "Note (optional)"}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الملف (حتى 8MB)" : "File (max 8MB)"}</span>
        <input type="file" accept="image/*,.pdf" disabled={saving} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {saving ? <p role="status">{ar ? "جارٍ الرفع..." : "Uploading..."}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
