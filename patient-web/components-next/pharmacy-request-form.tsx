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
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "grid", gap: 16 }} dir={rtl ? "rtl" : "ltr"}>
      <label style={{ display: "grid", gap: 8, fontWeight: 700, fontSize: 13, color: "#1E332E", overflowWrap: "anywhere" }}>
        <span style={{ overflowWrap: "anywhere" }}>{labels.name}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.namePh} required minLength={3}
          style={{ padding: "12px 14px", borderRadius: 16, border: "1.5px solid #E8EDEE", background: "#FDFDFC", fontSize: 14, outline: "none" }} />
      </label>
      <label style={{ display: "grid", gap: 8, fontWeight: 700, fontSize: 13, color: "#1E332E", overflowWrap: "anywhere" }}>
        <span style={{ overflowWrap: "anywhere" }}>{labels.details}</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={labels.detailsPh} rows={3}
          style={{ padding: "12px 14px", borderRadius: 16, border: "1.5px solid #E8EDEE", background: "#FDFDFC", fontSize: 14, resize: "vertical", lineHeight: 1.6, outline: "none" }} />
      </label>
      {err ? <p role="alert" style={{ color: "#FF4D5A", fontSize: 13, overflowWrap: "anywhere", margin: 0 }}>{err}</p> : null}
      <button type="submit" disabled={busy || name.trim().length < 3}
        style={{ background: "#5FD9B3", color: "#1E332E", fontWeight: 800, padding: 14, borderRadius: 20, border: "1px solid rgba(30,51,46,.08)", cursor: "pointer", opacity: busy ? .55 : 1, fontSize: 14 }}>
        {busy ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
