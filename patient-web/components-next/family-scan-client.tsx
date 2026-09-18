"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrCode, ArrowUpRight } from "lucide-react";

export function FamilyScanClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = code.trim();
    // Accept raw code or full QR link: extract ?code= or last segment
    let extracted = trimmed;
    try {
      if (trimmed.includes("://") || trimmed.includes("?code=")) {
        const u = new URL(trimmed);
        const q = u.searchParams.get("code") || u.searchParams.get("invite_code") || "";
        if (q) extracted = q;
        else {
          const seg = u.pathname.split("/").filter(Boolean).pop();
          if (seg && seg.length >= 6) extracted = seg;
        }
      }
    } catch { /* treat as raw code */ }
    extracted = extracted.trim();
    if (!extracted) { setError(ar ? "أدخل رمز الدعوة" : "Enter the invite code"); return; }
    setError(null);
    router.push(`/${locale}/family/join?code=${encodeURIComponent(extracted)}`);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, color: "#64748B", fontSize: ".94rem", lineHeight: 1.6, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>
        {ar ? "امسح رمز QR للدعوة العائلية بكاميرا هاتفك، أو أدخل الرمز يدوياً — يتم التحقق عبر الخادم (callPatientApi)." : "Scan the family invite QR with your phone camera, or enter the code manually — verified server-side via callPatientApi."}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E", fontWeight: 760, fontSize: ".9rem", overflowWrap: "anywhere" as any }}>
            <span style={{ display: "grid", placeItems: "center", inlineSize: 28, blockSize: 28, borderRadius: 10, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE" }}><QrCode size={14} aria-hidden="true" color="#1E332E" /></span>
            {ar ? "رمز الدعوة" : "Invite code"}
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            dir="ltr"
            placeholder={ar ? "الصق الرمز أو رابطه هنا" : "Paste the code or its link here"}
            style={{
              inlineSize: "100%", minHeight: 44, padding: "0 16px",
              borderRadius: 20, border: "1px solid #E8EDEE",
              background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              color: "#1E332E", outline: "none",
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: 44, padding: "0 16px",
            borderRadius: 20, border: "1px solid #E8EDEE",
            background: "#5FD9B3", color: "#1E332E", fontWeight: 800,
          }}
        >
          {ar ? "متابعة للانضمام" : "Continue to join"} <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </form>
      {error ? <p role="alert" style={{ margin: 0, padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{error}</p> : null}
    </div>
  );
}
