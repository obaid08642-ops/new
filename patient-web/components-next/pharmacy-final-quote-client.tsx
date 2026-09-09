"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Quote = {
  state: string; total: number; currency: string; hash?: string; revision?: number;
  coverageMode?: string; codAllowed: boolean;
};

function parseQuote(payload: unknown): Quote | null {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const pending = (r.pending_final_quote_snapshot && typeof r.pending_final_quote_snapshot === "object" ? r.pending_final_quote_snapshot : {}) as Record<string, unknown>;
  const selected = (r.selected_offer_snapshot && typeof r.selected_offer_snapshot === "object" ? r.selected_offer_snapshot : {}) as Record<string, unknown>;
  const accepted = (r.accepted_quote_snapshot && typeof r.accepted_quote_snapshot === "object" ? r.accepted_quote_snapshot : {}) as Record<string, unknown>;
  const source = (pending.totals ? pending : selected.totals ? selected : accepted) as Record<string, unknown>;
  const totals = (source.totals && typeof source.totals === "object" ? source.totals : {}) as Record<string, unknown>;
  const total = Number(totals.total ?? source.total ?? 0);
  if (!Number.isFinite(total) || total < 0) return null;
  const hash = pending.hash ?? selected.hash;
  const revision = pending.revision ?? selected.revision;
  return {
    state: typeof r.governed_state === "string" ? r.governed_state : "",
    total,
    currency: typeof totals.currency === "string" ? totals.currency : "SAR",
    hash: typeof hash === "string" ? hash : undefined,
    revision: typeof revision === "number" && Number.isInteger(revision) ? revision : undefined,
    coverageMode: typeof r.coverage_mode === "string" ? r.coverage_mode : undefined,
    codAllowed: accepted.cod_allowed === true,
  };
}

export function PharmacyFinalQuoteClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(base, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ar ? "تعذر تحميل السعر النهائي" : "Could not load final quote"); return; }
      const parsed = parseQuote(await res.json().catch(() => null));
      if (!parsed) { setError(ar ? "تعذر تحميل السعر النهائي" : "Could not load final quote"); return; }
      setQuote(parsed);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setLoading(false); }
  }, [base, ar]);

  useEffect(() => { load(); }, [load]);

  async function accept() {
    if (!quote?.hash || quote.revision === undefined) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${base}/final-quote/accept`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-final-quote-${orderId}-${Date.now()}` },
        body: JSON.stringify({ quote_hash: quote.hash, quote_revision: quote.revision }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر قبول السعر" : "Could not accept quote"); return; }
      await load();
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(false); }
  }

  async function registerCod() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${base}/cod/register`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-cod-${orderId}-${Date.now()}` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر تسجيل الدفع عند الاستلام" : "Could not register cash on delivery"); return; }
      router.replace(`/${locale}/orders/${encodeURIComponent(orderId)}/tracking`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(false); }
  }

  if (loading && !quote) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (error && !quote) {
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={load}>{ar ? "تحديث يدوياً" : "Refresh manually"}</button>
      </div>
    );
  }
  if (!quote) return null;
  const canAccept = ["OFFER_SELECTED", "FINAL_QUOTE_READY"].includes(quote.state) && quote.hash && quote.revision !== undefined;
  const canCod = quote.state === "FINAL_QUOTE_ACCEPTED" && quote.coverageMode === "cash" && quote.codAllowed;

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      {canAccept ? (
        <section aria-label={ar ? "قبول السعر" : "Accept quote"}>
          <p>{ar ? "راجع السعر النهائي قبل القبول — لا دفع قبل القبول." : "Review the final price before accepting — no payment before acceptance."}</p>
          <p><strong>{quote.total.toFixed(2)} {quote.currency}</strong></p>
          <button type="button" onClick={accept} disabled={busy}>{ar ? "قبول السعر النهائي" : "Accept final quote"}</button>
        </section>
      ) : null}
      {canCod ? (
        <section aria-label={ar ? "الدفع عند الاستلام" : "Cash on delivery"}>
          <p>{ar ? "الدفع عند الاستلام مؤهل لهذا الطلب" : "Cash on delivery is eligible for this order"}</p>
          <button type="button" onClick={registerCod} disabled={busy}>{ar ? "تسجيل الدفع عند الاستلام" : "Register cash on delivery"}</button>
        </section>
      ) : null}
      {quote.state === "FINAL_QUOTE_ACCEPTED" && !canCod ? (
        <section aria-label={ar ? "تم القبول" : "Accepted"}>
          <p role="status">{ar ? "تم قبول السعر — تابع للدفع." : "Quote accepted — continue to payment."}</p>
          <Link href={`/${locale}/orders/${encodeURIComponent(orderId)}/tracking?pay=1`}>{ar ? "مراجعة الدفع" : "Review payment"}</Link>
        </section>
      ) : null}
      {!canAccept && !canCod && quote.state !== "FINAL_QUOTE_ACCEPTED" ? (
        <section aria-label={ar ? "لا سعر" : "No quote"}>
          <p role="status">{ar ? "لا يوجد سعر نهائي جاهز بعد." : "No final quote ready yet."}</p>
          <Link href={`/${locale}/orders/${encodeURIComponent(orderId)}/tracking`}>{ar ? "حالة الطلب" : "Order status"}</Link>
        </section>
      ) : null}
    </div>
  );
}
