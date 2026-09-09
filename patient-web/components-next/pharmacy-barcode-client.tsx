"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

type Found = { id?: string; barcode: string; name: string; dose?: string; brand?: string; price?: number | null; available: boolean; requiresRx: boolean };

function parseLookup(payload: unknown, code: string): { found: Found | null; missing: boolean } {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  if (r.found !== true && !r.medicine && !r.id) return { found: null, missing: true };
  const m = (r.medicine && typeof r.medicine === "object" ? r.medicine : r) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const name = str(m.name_ar) ?? str(m.name_en) ?? str(m.name);
  if (!name) return { found: null, missing: true };
  const price = m.price === null || m.price === undefined ? null : Number(m.price);
  return {
    found: {
      id: str(m.id) ?? str(m._id),
      barcode: code,
      name,
      dose: str(m.dosage_ar) ?? str(m.dosage_en),
      brand: str(m.manufacturer),
      price: price === null || !Number.isFinite(price) ? null : price,
      available: m.available !== false,
      requiresRx: m.requires_prescription === true,
    },
    missing: false,
  };
}

export function PharmacyBarcodeClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<Found | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(value: string) {
    const trimmed = value.trim();
    if (!trimmed || looking) return;
    setLooking(true); setError(null); setResult(null); setMissing(null);
    try {
      const res = await fetch(`/api/patient/medicines/by-barcode/${encodeURIComponent(trimmed)}`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ar ? "تعذر البحث بالباركود" : "Barcode lookup failed"); return; }
      const parsed = parseLookup(await res.json().catch(() => null), trimmed);
      if (parsed.missing) setMissing(trimmed);
      else setResult(parsed.found);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setLooking(false); }
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); lookup(code); }}>
        <label>
          <span>{ar ? "أدخل رمز الباركود" : "Enter barcode"}</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="off"
            placeholder="6281234567890" />
        </label>
        <button type="submit" disabled={looking || !code.trim()}>{looking ? <LoaderCircle size={17} aria-hidden="true" /> : null}{ar ? "بحث" : "Look up"}</button>
      </form>
      <p>{ar ? "وجّه الكاميرا لرمز الباركود على العبوة، أو أدخله يدوياً. للتعرف بالصورة استخدم مسح الوصفة." : "Point the camera at the package barcode, or enter it manually. For photo recognition use prescription scan."}</p>
      <Link href={`/${locale}/pharmacy/scan-prescription`}>{ar ? "صوّر عبوة الدواء للتعرف عليها" : "Snap the package for AI recognition"}</Link>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <section aria-label={ar ? "تم التعرف على الدواء" : "Medicine recognized"}>
          <h2>{ar ? "تم التعرف على الدواء" : "Medicine recognized"}</h2>
          <p><strong>{result.name}</strong></p>
          {result.brand || result.dose ? <p>{[result.brand, result.dose].filter(Boolean).join(" · ")}</p> : null}
          <p>{result.available ? (ar ? "متوفر" : "Available") : (ar ? "غير متوفر" : "Unavailable")}{result.requiresRx ? (ar ? " · يتطلب وصفة" : " · Requires prescription") : ""}</p>
          {result.price !== null && result.price !== undefined ? <p>{result.price} {ar ? "ر.س" : "SAR"}</p> : null}
          <p>{ar ? "الباركود:" : "Barcode:"} {result.barcode}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/${locale}/medicines/${encodeURIComponent(result.id || result.barcode)}${result.name ? `?name=${encodeURIComponent(result.name)}` : ""}`}>
              {ar ? "عرض التفاصيل وإضافة للسلة" : "View details & add to cart"}
            </Link>
            <button type="button" onClick={() => { setResult(null); setCode(""); }}>{ar ? "مسح دواء آخر" : "Scan another"}</button>
          </div>
        </section>
      ) : null}
      {missing ? (
        <section aria-label={ar ? "لم يُعثر على الدواء" : "Medicine not found"}>
          <h2>{ar ? "لم يُعثر على الدواء" : "Medicine not found"}</h2>
          <p role="status">{ar ? `الباركود ${missing} غير مسجّل` : `Barcode ${missing} is not registered`}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/${locale}/pharmacy/scan-prescription`}>{ar ? "التعرف بالذكاء الاصطناعي" : "AI recognition"}</Link>
            <Link href={`/${locale}/pharmacy/request`}>{ar ? "إضافة الدواء يدوياً" : "Add medicine manually"}</Link>
            <button type="button" onClick={() => { setMissing(null); setCode(""); }}>{ar ? "مسح باركود آخر" : "Scan another barcode"}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
