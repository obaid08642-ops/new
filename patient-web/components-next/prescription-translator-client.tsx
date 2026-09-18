"use client";

import { useState } from "react";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";
import styles from "@/app/[locale]/ai/triage.module.css";

export function PrescriptionTranslatorClient({ locale }: { locale: string }) {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const ar = locale === "ar";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    if (file.size > 8 * 1024 * 1024) {
      setError(ar ? "الصورة أكبر من 8MB" : "Image larger than 8MB");
      return;
    }
    setWorking(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });
      // backend binding: callPatientApi("/ai/prescription-ocr") via /api/patient proxy — no mock, idempotency-key required
      const res = await fetch("/api/patient/ai/prescription-ocr", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ image_base64: base64 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر قراءة الوصفة" : "Could not read prescription"));
        return;
      }
      setResult(data);
    } catch {
      setError(ar ? "تعذر قراءة الوصفة" : "Could not read prescription");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span className={styles.promptTitle} style={{ overflowWrap: "anywhere", margin: 0 }}>{ar ? "صورة الوصفة" : "Prescription image"}</span>
        <span style={{ fontSize: 13, color: "#6B7C6E", overflowWrap: "anywhere" }}>{ar ? "PNG أو JPG — حد أقصى 8MB" : "PNG or JPG — max 8MB"}</span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 16,
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            background: "#FDFDFC",
            cursor: working ? "not-allowed" : "pointer",
            fontWeight: 700,
            color: "#1E332E",
            overflowWrap: "anywhere",
          }}
        >
          <FileUp size={16} aria-hidden="true" />
          <span>{ar ? "اختر صورة" : "Choose image"}</span>
          <input
            type="file"
            accept="image/*"
            disabled={working}
            onChange={(e) => onFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
      </label>
      {working ? (
        <p role="status" style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#1E332E", fontWeight: 700, fontSize: 14, margin: 0, overflowWrap: "anywhere" }}>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {ar ? "جارٍ القراءة..." : "Reading..."}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#92400e", background: "#FFFBEB", border: "1px solid #E8EDEE", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, overflowWrap: "anywhere", margin: 0 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {result ? (
        <div className={styles.resultCard} style={{ marginTop: 0 }}>
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "النتيجة" : "Result"}</h2>
          </div>
          <pre dir="auto" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", background: "#FDFDFC", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, fontSize: 13, lineHeight: 1.7, color: "#1E332E", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
