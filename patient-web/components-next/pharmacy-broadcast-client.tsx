"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type OfferLine = { name: string; available: boolean; offeredQty?: number; unitPrice?: number; alternative?: string };
type Offer = {
  id: string; pharmacyName: string; total: number; currency: string; providerNote?: string;
  status: string; insuranceReady: boolean; lines: OfferLine[];
};

function parseOffers(payload: unknown): Offer[] {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.data, root.offers, root.items].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  return list.flatMap((o) => {
    if (!o || typeof o !== "object") return [];
    const r = o as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : typeof r.offer_id === "string" ? r.offer_id : null;
    if (!id) return [];
    const totals = (r.totals && typeof r.totals === "object" ? r.totals : {}) as Record<string, unknown>;
    const linesRaw = Array.isArray(r.lines) ? r.lines : [];
    return [{
      id,
      pharmacyName: typeof r.pharmacy_name === "string" ? r.pharmacy_name : typeof r.pharmacyName === "string" ? r.pharmacyName : "",
      total: Number(totals.total ?? r.total ?? 0) || 0,
      currency: typeof totals.currency === "string" ? totals.currency : "ر.س",
      status: typeof r.status === "string" ? r.status : "open",
      insuranceReady: r.insurance_ready === true,
      providerNote: typeof r.provider_note === "string" ? r.provider_note : undefined,
      lines: linesRaw.flatMap((l) => {
        if (!l || typeof l !== "object") return [];
        const lr = l as Record<string, unknown>;
        const name = typeof lr.name === "string" ? lr.name : typeof lr.sku === "string" ? lr.sku : null;
        if (!name) return [];
        const num = (v: unknown) => (typeof v === "number" ? v : null);
        const alt = typeof lr.alternative === "string" ? lr.alternative : null;
        return [{ name, available: lr.available !== false,
          ...(num(lr.offered_qty) !== null ? { offeredQty: num(lr.offered_qty) as number } : {}),
          ...(num(lr.unit_price) !== null ? { unitPrice: num(lr.unit_price) as number } : {}),
          ...(alt ? { alternative: alt } : {}) }];
      }),
    }];
  });
}

export function PharmacyBroadcastClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/offers`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ar ? "تعذر تحميل العروض" : "Could not load offers"); return; }
      setOffers(parseOffers(await res.json().catch(() => null)));
      setError(null);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
  }, [orderId, ar]);

  useEffect(() => {
    load();
    timer.current = setInterval(async () => {
      setOffers((current) => {
        if (current && current.length > 0) { if (timer.current) clearInterval(timer.current); return current; }
        load();
        return current;
      });
    }, 20000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  async function select(offerId: string, mode: "cash" | "insurance") {
    setBusy(`${offerId}:${mode}`);
    setError(null);
    try {
      const res = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/offers/${encodeURIComponent(offerId)}/select`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-offer-${orderId}-${offerId}-${Date.now()}` },
        body: JSON.stringify({ coverage_mode: mode }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر اختيار العرض" : "Could not select offer"); return; }
      router.replace(`/${locale}/orders/${encodeURIComponent(orderId)}/tracking?selectedOfferId=${encodeURIComponent(offerId)}`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(null); }
  }

  if (offers === null && !error) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ تحميل العروض…" : "Loading offers…"}</p>;
  return (
    <div>
      <p>{ar ? "العروض المعروضة خاصة بهذا الطلب فقط. أكّد الحالة من التتبع." : "Offers shown are for this order only. Confirm status from tracking."}</p>
      {error ? <p role="alert">{error}</p> : null}
      {offers !== null && offers.length === 0 ? (
        <section aria-label={ar ? "لا عروض" : "No offers"}>
          <p role="status">{ar ? "لا توجد عروض…" : "No offers yet…"}</p>
          <button type="button" onClick={load}>{ar ? "تحديث العروض" : "Refresh offers"}</button>
        </section>
      ) : null}
      <ul>
        {(offers ?? []).map((offer) => (
          <li key={offer.id}>
            <p><strong>{offer.pharmacyName}</strong></p>
            <p>{ar ? "العناصر المتاحة:" : "Available items:"} {offer.lines.filter((l) => l.available).length}</p>
            <ul>{offer.lines.map((l, i) => <li key={i}>{l.name}{l.offeredQty !== undefined && l.offeredQty > 0 ? ` × ${l.offeredQty}` : ""}{l.unitPrice !== undefined ? ` — ${l.unitPrice} ${offer.currency}` : ""} — {l.available ? (ar ? "متوفر" : "Available") : (ar ? "غير متوفر" : "Unavailable")}{l.alternative ? (ar ? ` (بديل: ${l.alternative})` : ` (alt: ${l.alternative})`) : ""}</li>)}</ul>
            {offer.providerNote ? <p>{ar ? "ملاحظة الصيدلية:" : "Pharmacy note:"} {offer.providerNote}</p> : null}
            <p>{ar ? "إجمالي العرض:" : "Offer total:"} {offer.total.toFixed(2)} {offer.currency}</p>
            {offer.status === "open" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy !== null} onClick={() => select(offer.id, "cash")}>
                  {ar ? "اختيار نقدي/إلكتروني" : "Select cash/online"}
                </button>
                <button type="button" disabled={busy !== null || !offer.insuranceReady} onClick={() => select(offer.id, "insurance")}>
                  {ar ? "اختيار بالتأمين" : "Select with insurance"}
                </button>
              </div>
            ) : (
              <p>{ar ? "حالة العرض:" : "Offer status:"} {offer.status}</p>
            )}
          </li>
        ))}
      </ul>
      {(offers ?? []).length > 0 ? <button type="button" onClick={load}>{ar ? "تحديث العروض يدوياً" : "Refresh offers manually"}</button> : null}
    </div>
  );
}
