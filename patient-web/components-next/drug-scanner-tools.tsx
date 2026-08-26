"use client";

import { useState } from "react";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Drug scanner tools (parity #21): manual barcode entry and an interaction
 * check — both real BFF POSTs; results verbatim from the server.
 */
export function DrugScannerTools() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [interactionsResult, setInteractionsResult] = useState<any>(null);

  async function post(action: string, payload: unknown) {
    setBusy(action); setError(null);
    try {
      const res = await fetch("/api/drug-scanner", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر الفحص");
        return null;
      }
      return data;
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>بحث بالباركود</strong>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await post("barcode", { kind: "barcode", code: String(form.get("code") || "") });
          if (result) setBarcodeResult(result);
        }} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <input name="code" required minLength={3} maxLength={60} inputMode="numeric" aria-label="رقم الباركود" style={fieldStyle} />
          <button type="submit" disabled={busy === "barcode"} style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
            {busy === "barcode" ? "..." : "ابحث"}
          </button>
        </form>
        {barcodeResult ? <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-2 text-xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(barcodeResult, null, 2)}</pre> : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>فحص التفاعلات الدوائية</strong>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const drugs = String(form.get("drugs") || "").split(",").map((d) => d.trim()).filter(Boolean).slice(0, 20);
          if (!drugs.length) { setError("أدخل دواءً واحدًا على الأقل"); return; }
          const result = await post("interactions", { kind: "interactions", drugs });
          if (result) setInteractionsResult(result);
        }} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <textarea name="drugs" required rows={2} aria-label="أسماء الأدوية مفصولة بفاصلة" style={{ ...fieldStyle, font: "inherit" }} />
          <p className="text-xs text-black/50">اكتب الأسماء مفصولة بفواصل: باراسيتامول, إيبوبروفين</p>
          <button type="submit" disabled={busy === "interactions"} style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
            {busy === "interactions" ? "..." : "فحص التفاعلات"}
          </button>
        </form>
        {interactionsResult ? <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-2 text-xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(interactionsResult, null, 2)}</pre> : null}
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
