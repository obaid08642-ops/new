"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  locale: string;
  labels: {
    title: string;
    description: string;
    uploadLabel: string;
    scanBtn: string;
    submitting: string;
    extracting: string;
    saving: string;
    success: string;
    error: string;
  };
};

export function ScanPrescriptionForm({ locale, labels }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "saving" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setStatus("idle");
      setStatusMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!preview || status === "analyzing" || status === "saving") return;

    try {
      setStatus("analyzing");
      setStatusMessage(labels.extracting);

      // 1. Call AI Prescription OCR
      const ocrRes = await fetch("/api/patient/ai/prescription-ocr", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ image_base64: preview }),
      });

      const ocrData = await ocrRes.json().catch(() => ({}));
      const items = Array.isArray(ocrData?.items) ? ocrData.items : [];

      // 2. Upload prescription with extracted items
      setStatus("saving");
      setStatusMessage(labels.saving);

      const saveRes = await fetch("/api/patient/prescriptions/upload", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          upload_image: preview,
          items,
          notes: "Uploaded via patient web scanner; pending pharmacy review",
        }),
      });

      if (!saveRes.ok) throw new Error("failed_to_save");
      const saveData = await saveRes.json();
      const id = saveData?.data?.id || saveData?.id;

      if (!id) throw new Error("missing_prescription_id");

      setStatus("success");
      setStatusMessage(labels.success);

      setTimeout(() => {
        router.push(`/${locale}/pharmacy/checkout?prescriptionId=${encodeURIComponent(id)}`);
      }, 1000);
    } catch {
      setStatus("error");
      setStatusMessage(labels.error);
    }
  };

  const isRtl = locale === "ar" || locale === "ur";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }} dir={isRtl ? "rtl" : "ltr"}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: "2px dashed rgba(8,127,140,0.35)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 1.5rem",
          display: "grid",
          placeItems: "center",
          gap: "1rem",
          cursor: "pointer",
          background: preview ? "#fff" : "rgba(231,247,247,0.4)",
          transition: "border-color 0.2s ease, background-color 0.2s ease",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Prescription Preview"
            style={{
              maxHeight: "320px",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-lg)",
            }}
          />
        ) : (
          <>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(8,127,140,0.1)",
                display: "grid",
                placeItems: "center",
                color: "var(--brand)",
              }}
            >
              <Camera size={32} />
            </div>
            <div style={{ textAlign: "center" }}>
              <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--ink)" }}>
                {labels.uploadLabel}
              </strong>
              <small style={{ color: "var(--muted)" }}>PNG, JPG, JPEG</small>
            </div>
          </>
        )}
      </div>

      {preview && (
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "analyzing" || status === "saving"}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--line)",
              background: "#fff",
              color: "var(--ink)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileUp size={16} style={{ display: "inline", marginInlineEnd: "0.4rem" }} />
            {locale === "ar" ? "تغيير الصورة" : "Change Image"}
          </button>

          <button
            type="button"
            onClick={handleProcess}
            disabled={status === "analyzing" || status === "saving"}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--brand)",
              color: "#fff",
              fontWeight: 700,
              cursor: status === "analyzing" || status === "saving" ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {status === "analyzing" || status === "saving" ? (
              <>
                <Loader2 size={16} className="spin" />
                {statusMessage}
              </>
            ) : (
              labels.scanBtn
            )}
          </button>
        </div>
      )}

      {statusMessage && status !== "analyzing" && status !== "saving" && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: status === "success" ? "#dcfce7" : "#fee2e2",
            color: status === "success" ? "#166534" : "#991b1b",
            fontSize: "0.95rem",
          }}
        >
          {status === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
