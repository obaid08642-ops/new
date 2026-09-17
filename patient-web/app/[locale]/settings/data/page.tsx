import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app settings/data: real storage usage + rights; destructive/export actions route to support (no silent no-ops). */
export default async function SettingsDataPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/users/me/storage", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const payload = response.ok ? asRecord(await response.json().catch(() => null)) : null;
  const rec = asRecord(payload?.data) ?? payload;
  const itemsRaw = rec && Array.isArray(rec.items) ? rec.items : [];
  const items = itemsRaw.flatMap((it) => {
    const o = asRecord(it);
    if (!o) return [];
    return [{
      label: typeof o.label === "string" ? o.label : "",
      val: typeof o.val === "string" ? o.val : "",
      pct: Number(o.pct ?? 0) || 0,
    }];
  });
  const total = rec && typeof rec.total === "string" ? rec.total : "0 MB";
  return (
    <main className="main" style={{ background: "#FDFDFC", padding: "24px 16px", maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none" }}>{ar ? "الإعدادات" : "Settings"}</Link>
      <h1 style={{ color: "#1E332E", fontSize: "1.5rem", fontWeight: 800, margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? "إدارة بياناتي" : "Manage my data"}</h1>
      <p style={{ color: "#64748B", margin: 0, overflowWrap: "anywhere" }}>{ar ? "لك الحق في الوصول لبياناتك وتصحيحها ونقلها وحذفها وفق نظام حماية البيانات." : "You have the right to access, correct, port and delete your data."}</p>
      <section aria-label={ar ? "مساحة البيانات المستخدمة" : "Storage used"} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <h2 style={{ color: "#1E332E", margin: 0, overflowWrap: "anywhere" }}>{ar ? "مساحة البيانات المستخدمة" : "Storage used"}</h2>
        {items.length === 0 ? (
          <p role="status" style={{ color: "#64748B" }}>{ar ? "جارٍ التحميل…" : "Loading…"}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8, margin: 0 }}>
            {items.map((it, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 16, border: "1px solid #E8EDEE", background: "#FDFDFC", overflowWrap: "anywhere" }}><span style={{ overflowWrap: "anywhere" }}>{it.label}</span><strong style={{ color: "#1E332E" }}>{it.val} ({it.pct}%)</strong></li>
            ))}
          </ul>
        )}
        <p style={{ color: "#64748B", margin: 0 }}>{ar ? `الإجمالي: ${total} من 2 GB` : `Total: ${total} of 2 GB`}</p>
      </section>
      <section aria-label={ar ? "إجراءات البيانات" : "Data actions"} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 16, boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <h2 style={{ color: "#1E332E", margin: 0 }}>{ar ? "إجراءات البيانات" : "Data actions"}</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8, margin: 0 }}>
          <li style={{ padding: 12, borderRadius: 16, background: "#FDFDFC", border: "1px solid #E8EDEE" }}>
            <strong style={{ color: "#1E332E", overflowWrap: "anywhere" }}>{ar ? "تحميل نسخة من بياناتي" : "Download a copy of my data"}</strong>
            <p style={{ color: "#64748B", margin: "4px 0 8px", overflowWrap: "anywhere" }}>{ar ? "JSON/PDF — اطلبها عبر الدعم وتصلك خلال 24 ساعة." : "JSON/PDF — request via support, delivered within 24 hours."}</p>
            <Link href={`/${locale}/support/chat`} style={{ color: "#1E332E", fontWeight: 700, textDecoration: "underline" }}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
          <li style={{ padding: 12, borderRadius: 16, background: "#FDFDFC", border: "1px solid #E8EDEE" }}>
            <strong style={{ color: "#1E332E" }}>{ar ? "نقل بياناتي لمنصة أخرى" : "Port my data elsewhere"}</strong>
            <p style={{ color: "#64748B", margin: "4px 0 8px" }}>FHIR R4/HL7 — {ar ? "اطلبها عبر الدعم." : "request via support."}</p>
            <Link href={`/${locale}/support/chat`} style={{ color: "#1E332E", fontWeight: 700, textDecoration: "underline" }}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
          <li style={{ padding: 12, borderRadius: 16, background: "#FDFDFC", border: "1px solid #E8EDEE" }}>
            <strong style={{ color: "#1E332E" }}>{ar ? "ما البيانات التي نجمعها؟" : "What data do we collect?"}</strong>
            <p style={{ margin: "4px 0 0" }}><Link href={`/${locale}/privacy`} style={{ color: "#1E332E", fontWeight: 700 }}>{ar ? "راجع سياسة الخصوصية" : "Review the privacy policy"}</Link></p>
          </li>
          <li style={{ padding: 12, borderRadius: 16, background: "#FDFDFC", border: "1px solid #E8EDEE" }}>
            <strong style={{ color: "#1E332E" }}>{ar ? "حذف بياناتي نهائياً" : "Delete my data permanently"}</strong>
            <p style={{ color: "#64748B", margin: "4px 0 8px", overflowWrap: "anywhere" }}>{ar ? "لا يمكن التراجع — يتم عبر الدعم مع تحقق الهوية." : "Irreversible — handled via support with identity verification."}</p>
            <Link href={`/${locale}/support/chat`} style={{ color: "#EF4444", fontWeight: 700 }}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
