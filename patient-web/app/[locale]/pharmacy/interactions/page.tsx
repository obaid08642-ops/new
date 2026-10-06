import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DrugInteractionChecker } from "@/components-next/drug-interaction-checker";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
import { ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function DrugInteractionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)", boxShadow: "0 12px 32px rgba(30,51,46,.07)" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} aria-hidden="true" />{ar ? "صيدلية نبض — خدمة مميزة" : "Nabd Pharmacy — Premium Care"}</p>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: 20, fontWeight: 900, lineHeight: 1.3, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "فاحص تفاعلات الأدوية" : "Drug interaction checker"}</h1>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flexShrink: 0 }}><VectorPharmacy size={48} /></span>
      </section>
      <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)", display: "grid", gap: 12 }}>

      <Link href={`/${locale}/pharmacy`} style={{ color: "#00876F", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
      
      <p>{ar ? "يفحص الخادم أدويتك الحالية مع المدخلة ويرجع التفاعلات المعروفة فقط." : "The server checks your current medications against the entered ones."}</p>
      <DrugInteractionChecker locale={locale} />
          </section>
    </main>
  );
}
