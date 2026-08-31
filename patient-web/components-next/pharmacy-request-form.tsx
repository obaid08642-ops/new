"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Labels = { name: string; namePh: string; details: string; detailsPh: string; submit: string; submitting: string; error: string; success: string };

export function PharmacyRequestForm({ locale, labels }: { locale: string; labels: Labels }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (name.trim().length < 3 || busy) return;
    setBusy(true); setErr(null);
    try {
      const body = { manual_request: { name: name.trim(), details: details.trim() || null }, payment_method: "cash" };
      const res = await fetch("/api/patient/pharmacy/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json().catch(() => null);
      const id = data?.data?.id ?? data?.id;
      if (id) router.push(`/${locale}/orders/${encodeURIComponent(String(id))}`);
      else router.push(`/${locale}/orders`);
    } catch { setErr(labels.error); } finally { setBusy(false); }
  }

  const rtl = locale !== "en";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "grid", gap: 12 }} dir={rtl ? "rtl" : "ltr"}>
      <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
        {labels.name}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.namePh} required minLength={3}
          style={{ padding: 12, borderRadius: 12, border: "1.5px solid rgba(22,33,58,.15)" }} />
      </label>
      <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
        {labels.details}
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={labels.detailsPh} rows={3}
          style={{ padding: 12, borderRadius: 12, border: "1.5px solid rgba(22,33,58,.15)", resize: "vertical" }} />
      </label>
      {err ? <p role="alert" style={{ color: "#FF4D5A" }}>{err}</p> : null}
      <button type="submit" disabled={busy || name.trim().length < 3}
        style={{ background: "#B8E030", color: "#16213A", fontWeight: 800, padding: 14, borderRadius: 14, border: "none", cursor: "pointer", opacity: busy ? .6 : 1 }}>
        {busy ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
