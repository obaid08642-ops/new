"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; label: string; cost: number };

/**
 * Loyalty actions (parity #22): claim a reward or join a challenge — real
 * BFF posts to /loyalty/*, page refresh re-reads the server balance.
 */
export function LoyaltyActions({ mode, items }: { mode: "rewards" | "challenges"; items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string) {
    if (busy) return;
    setBusy(id); setError(null);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(mode === "rewards" ? { kind: "claim-reward", reward_id: id } : { kind: "join-challenge", challenge_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التنفيذ");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p className="text-sm">لا عناصر بعد.</p></section>;
  return (
    <div className="mt-2 grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
          <span className="text-sm min-w-0 truncate">{item.label}{item.cost > 0 ? ` — ${item.cost} نقطة` : ""}</span>
          <button type="button" onClick={() => act(item.id)} disabled={busy === item.id}
            style={{ border: "none", cursor: busy === item.id ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".4rem 1rem", fontSize: ".82rem" }}>
            {busy === item.id ? "..." : mode === "rewards" ? "استبدل" : "انضم"}
          </button>
        </div>
      ))}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
