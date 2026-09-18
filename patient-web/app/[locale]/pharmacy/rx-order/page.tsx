import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
import { ShieldCheck, FileText } from "lucide-react";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ prescriptionId?: string; id?: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
type RxLine = { name: string; qty: number };
function linesOf(rx: Record<string, unknown>): RxLine[] {
  const raw = [rx.items, rx.lines, rx.medications].find(Array.isArray);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((it) => {
    if (typeof it === "string") return [{ name: it, qty: 1 }];
    const o = asRecord(it);
    if (!o) return [];
    const name = typeof o.name === "string" ? o.name : null;
    if (!name) return [];
    return [{ name, qty: Math.max(1, Number(o.qty ?? o.quantity ?? 1) || 1) }];
  });
}

/** Parity with app rx-order: pick an active prescription (or a specific one) then continue to checkout. */
export default async function PharmacyRxOrderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const requestedId = (sp.prescriptionId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);

  if (requestedId) {
    const res = await callPatientApi(`/prescriptions/${encodeURIComponent(requestedId)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (!res.ok) notFound();
    const raw = asRecord(await res.json().catch(() => null));
    const rx = asRecord(raw?.data) ?? raw;
    if (!rx) notFound();
    const lines = linesOf(rx);
    return (
      <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)", boxShadow: "0 12px 32px rgba(30,51,46,.07)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} />{ar ? "صيدلية نبض — وصفات" : "Nabd Pharmacy — Prescriptions"}</p>
            <h1 style={{ margin: 0, color: "#1E332E", fontSize: 20, fontWeight: 900, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "طلب أدوية الوصفة" : "Order prescription medicines"}</h1>
            <Link href={`/${locale}/pharmacy`} style={{ color: "#00876F", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{ar ? "← الصيدلية" : "← Pharmacy"}</Link>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE" }}><VectorPharmacy size={48} /></span>
        </section>
        <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#5A6B62", overflowWrap: "anywhere", lineHeight: 1.6 }}>{ar ? "تُرسل هذه الوصفة للصيدلية لصرف أصنافها." : "This prescription is sent to the pharmacy to dispense its items."}</p>
        {lines.length === 0 ? (
          <p role="status">{ar ? "لا توجد أصناف في هذه الوصفة" : "No items in this prescription"}</p>
        ) : (
          <>
            <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>{lines.map((l, i) => <li key={i} style={{ padding: "10px 12px", border: "1px solid #E8EDEE", borderRadius: 16, background: "#FDFDFC", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.name} — {ar ? "الكمية:" : "Qty:"} {l.qty}</li>)}</ul>
            <Link href={`/${locale}/cart/checkout?prescriptionId=${encodeURIComponent(requestedId)}`} style={{ display: "inline-flex", padding: "10px 16px", borderRadius: 16, background: "#1E332E", color: "#FDFDFC", fontWeight: 800, textDecoration: "none", width: "fit-content", overflowWrap: "anywhere" }}>{ar ? "مراجعة العنوان وطلب عروض" : "Review address & request offers"}</Link>
          </>
        )}
      </section>
    </main>
    );
  }

  const res = await callPatientApi("/prescriptions/active", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (!res.ok) notFound();
  const payload = await res.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.data, root.items, root.prescriptions].find(Array.isArray);
  const active = (Array.isArray(list) ? list : []).flatMap((it) => {
    const o = asRecord(it);
    if (!o || typeof o.id !== "string") return [];
    return [{ id: o.id, count: linesOf(o).length }];
  });
  return (
    <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)", boxShadow: "0 12px 32px rgba(30,51,46,.07)" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} />{ar ? "صيدلية نبض — وصفات" : "Nabd Pharmacy — Prescriptions"}</p>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: 20, fontWeight: 900, overflowWrap: "anywhere" }}>{ar ? "طلب أدوية الوصفة" : "Order prescription medicines"}</h1>
          <Link href={`/${locale}/pharmacy`} style={{ color: "#00876F", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{ar ? "← الصيدلية" : "← Pharmacy"}</Link>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE" }}><VectorPharmacy size={48} /></span>
      </section>
      <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)", display: "grid", gap: 12 }}>
      <p style={{ margin: 0, color: "#5A6B62", overflowWrap: "anywhere" }}>{ar ? "اختر وصفة نشطة لصرف أدويتها." : "Choose an active prescription to dispense."}</p>
      {active.length === 0 ? (
        <p role="status" style={{ margin: 0, color: "#5A6B62", overflowWrap: "anywhere" }}>{ar ? "لا توجد وصفات نشطة" : "No active prescriptions"}</p>
      ) : (
        <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
          {active.map((rx) => (
            <li key={rx.id} style={{ padding: "10px 12px", border: "1px solid #E8EDEE", borderRadius: 16, background: "#FDFDFC", overflowWrap: "anywhere" }}>
              <Link href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(rx.id)}`} style={{ color: "#1E332E", fontWeight: 800, textDecoration: "none", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {ar ? `وصفة #${rx.id.slice(-6)}` : `Prescription #${rx.id.slice(-6)}`} — {rx.count} {ar ? "أصناف" : "items"}
              </Link>
            </li>
          ))}
        </ul>
      )}
      </section>
    </main>
  );
}
