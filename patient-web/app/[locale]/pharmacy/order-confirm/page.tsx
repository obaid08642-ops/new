import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
import { ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeFor(state: string, orderId: string, locale: string): string {
  const q = `orderId=${encodeURIComponent(orderId)}`;
  if (state === "OFFERS_READY" || state === "ORDER_BROADCASTING") return `/${locale}/pharmacy/broadcast-status?${q}`;
  if (["OFFER_SELECTED", "FINAL_QUOTE_READY", "FINAL_QUOTE_ACCEPTED", "COD_REGISTERED"].includes(state)) return `/${locale}/pharmacy/final-quote?${q}`;
  if (state === "INSURANCE_PROCESSING" || state === "INSURANCE_DECISION_READY") return `/${locale}/pharmacy/insurance-decision?${q}`;
  return `/${locale}/orders/${encodeURIComponent(orderId)}/tracking`;
}

/** Parity with app order-confirm: governed router — reads state server-side, redirects to the right step. */
export default async function PharmacyOrderConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  if (!idPattern.test(orderId)) {
    return (
      <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} />{ar ? "صيدلية نبض" : "Nabd Pharmacy"}</p>
            <h1 style={{ margin: 0, color: "#1E332E", fontWeight: 900, overflowWrap: "anywhere" }}>{ar ? "تأكيد الطلب" : "Confirm order"}</h1>
            <Link href={`/${locale}/pharmacy`} style={{ color: "#00876F", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{ar ? "← الصيدلية" : "← Pharmacy"}</Link>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE" }}><VectorPharmacy size={48} /></span>
        </section>
        <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)", display: "grid", gap: 12 }}>
          <p role="alert" style={{ margin: 0, color: "#5A6B62", overflowWrap: "anywhere", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 16, padding: 12 }}>{ar ? "يلزم رقم طلب الصيدلية — لا يمكن اعتماد سلة غير مكتملة." : "A pharmacy order id is required — cannot confirm an incomplete cart."}</p>
        </section>
      </main>
    );
  }
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) {
    return (
      <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} />{ar ? "صيدلية نبض" : "Nabd Pharmacy"}</p>
            <h1 style={{ margin: 0, color: "#1E332E", fontWeight: 900, overflowWrap: "anywhere" }}>{ar ? "تأكيد الطلب" : "Confirm order"}</h1>
            <Link href={`/${locale}/pharmacy`} style={{ color: "#00876F", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{ar ? "← الصيدلية" : "← Pharmacy"}</Link>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE" }}><VectorPharmacy size={48} /></span>
        </section>
        <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)", display: "grid", gap: 12 }}>
          <p role="alert" style={{ margin: 0, color: "#991B1B", overflowWrap: "anywhere", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: 12 }}>{ar ? "تعذر فتح خطوة الطلب" : "Could not open the order step"}</p>
          <Link href={`/${locale}/orders/${orderId}`} style={{ display: "inline-flex", padding: "10px 16px", borderRadius: 16, background: "#1E332E", color: "#FDFDFC", fontWeight: 800, textDecoration: "none", width: "fit-content" }}>{ar ? "حالة الطلب" : "Order status"}</Link>
        </section>
      </main>
    );
  }
  const payload = await response.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const rec = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const state = typeof rec.governed_state === "string" ? rec.governed_state : "";
  redirect(routeFor(state, orderId, locale));
}
