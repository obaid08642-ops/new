"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Line = { id: string; sku?: string; name: string; qty: number; selected: boolean };
type Addr = { label?: string; city?: string; lat?: number; lng?: number };

function parseOrder(payload: unknown): Line[] {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  return items.flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const o = it as Record<string, unknown>;
    const name = typeof o.raw_name === "string" ? o.raw_name : typeof o.name_ar === "string" ? o.name_ar : typeof o.name_en === "string" ? o.name_en : null;
    if (!name) return [];
    const sku = typeof o.matched_sku === "string" ? o.matched_sku : undefined;
    return [{ id: sku || String(o.id ?? name), sku, name, qty: Math.max(1, Number(o.qty ?? 1) || 1), selected: true }];
  });
}

function parseAddress(payload: unknown): Addr | null {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const list = Array.isArray(r.addresses) ? r.addresses : Array.isArray(root.addresses) ? root.addresses : [];
  const found = list.find((a) => a && typeof a === "object" && (a as Record<string, unknown>).is_default) ?? list[0];
  if (!found || typeof found !== "object") return null;
  const o = found as Record<string, unknown>;
  return {
    label: typeof o.label === "string" ? o.label : typeof o.city === "string" ? o.city : undefined,
    city: typeof o.city === "string" ? o.city : undefined,
    lat: typeof o.lat === "number" ? o.lat : Number(o.lat),
    lng: typeof o.lng === "number" ? o.lng : Number(o.lng),
  };
}

export function PharmacyReorderClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [address, setAddress] = useState<Addr | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [orderRes, profileRes] = await Promise.all([
        fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/patient/users/me/profile", { cache: "no-store", credentials: "same-origin" }),
      ]);
      if (!orderRes.ok) { setError(ar ? "تعذر تحميل الطلب" : "Could not load order"); return; }
      setLines(parseOrder(await orderRes.json().catch(() => null)));
      if (profileRes.ok) setAddress(parseAddress(await profileRes.json().catch(() => null)));
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setLoading(false); }
  }, [orderId, ar]);

  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setLines((ls) => (ls ?? []).map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  }
  function qty(id: string, delta: number) {
    setLines((ls) => (ls ?? []).map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l)));
  }

  async function submit() {
    const selected = (lines ?? []).filter((l) => l.selected);
    if (selected.length === 0) { setError(ar ? "اختر صنفاً واحداً على الأقل" : "Select at least one item"); return; }
    if (!address || !Number.isFinite(address.lat) || !Number.isFinite(address.lng)) {
      setError(ar ? "حدّث عنوانك ليشمل إحداثيات صالحة قبل إعادة الطلب" : "Update your address with valid coordinates before reordering");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const key = `web-pharmacy-reorder-${orderId}-${Date.now()}`;
      const draft = {
        items: selected.map((l) => ({ ...(l.sku ? { sku: l.sku } : { id: l.id }), name: l.name, qty: l.qty })),
        address: { label: address.label, city: address.city, lat: address.lat, lng: address.lng },
      };
      const created = await fetch("/api/patient/patient/pharmacy/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify(draft),
        credentials: "same-origin",
      });
      if (!created.ok) { setError(ar ? "تعذر إنشاء الطلب" : "Could not create order"); return; }
      const cbody = await created.json().catch(() => null);
      const croot = (cbody && typeof cbody === "object" ? cbody : {}) as Record<string, unknown>;
      const crec = (croot.data && typeof croot.data === "object" ? croot.data : croot) as Record<string, unknown>;
      const nextId = typeof crec.id === "string" ? crec.id : typeof croot.id === "string" ? croot.id : null;
      if (!nextId) { setError(ar ? "تعذر إنشاء الطلب" : "Could not create order"); return; }
      const submitted = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(nextId)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `${key}-submit` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!submitted.ok) { setError(ar ? "تعذر إرسال الطلب" : "Could not submit order"); return; }
      router.replace(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(nextId)}`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setSubmitting(false); }
  }

  if (loading && lines === null) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      {lines !== null && lines.length === 0 && !loading ? <p role="status">{ar ? "لا توجد أصناف قابلة لإعادة الطلب" : "No items available to reorder"}</p> : null}
      <ul>
        {(lines ?? []).map((l) => (
          <li key={l.id}>
            <label>
              <input type="checkbox" checked={l.selected} onChange={() => toggle(l.id)} /> {l.name}
            </label>
            {l.selected ? (
              <span>
                <button type="button" onClick={() => qty(l.id, -1)} aria-label={ar ? "إنقاص" : "Decrease"}>−</button>
                <span> {ar ? "الكمية:" : "Qty:"} {l.qty} </span>
                <button type="button" onClick={() => qty(l.id, 1)} aria-label={ar ? "زيادة" : "Increase"}>+</button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p>{address?.label || address?.city
        ? (ar ? `سيُستخدم عنوان: ${address.label || address.city}` : `Will use address: ${address.label || address.city}`)
        : (ar ? "يلزم عنوان توصيل محفوظ" : "A saved delivery address is required")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={load} disabled={loading || submitting}>{ar ? "تحديث يدوياً" : "Refresh manually"}</button>
        <button type="button" onClick={submit} disabled={submitting || (lines ?? []).filter((l) => l.selected).length === 0}>
          {ar ? "إنشاء طلب جديد وطلب عروض" : "Create new order & request offers"}
        </button>
      </div>
    </div>
  );
}
