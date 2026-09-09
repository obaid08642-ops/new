"use client";

import { useState } from "react";

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
      const res = await fetch("/api/patient/ai/prescription-ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "صورة الوصفة" : "Prescription image"}</span>
        <input
          type="file"
          accept="image/*"
          disabled={working}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {working ? <p role="status">{ar ? "جارٍ القراءة..." : "Reading..."}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {result ? <pre dir="auto" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}
