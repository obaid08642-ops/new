import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getMyMedicalReports } from "@/lib/api/reports-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { ShareReportPanel } from "@/components-next/share-report";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import { Share2 } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "ShareReport" });
  const canonical = localizedUrl(locale, "/consultations/share-report");
  return {
    title: t("title"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/consultations/share-report")])), "x-default": localizedUrl("ar", "/consultations/share-report") },
    },
    robots: { index: false, follow: false },
  };
}

export default async function ShareReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ShareReport");
  const token = await requirePatientAccess(locale);
  const response = await getMyMedicalReports(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const reports = response.ok ? ((await response.json().catch(() => null)) ?? []) : [];
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus";
  const isAr = locale === "ar";
  return (
    <main className="main" style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px 80px", background: "#FDFDFC" }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "clamp(28px, 4vw, 36px)", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 10px 28px rgba(16,24,40,.07)", marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(95,217,179,0.14)", padding: "5px 12px", borderRadius: 999, overflowWrap: "anywhere" }}>
            <Share2 size={15} aria-hidden="true" />{isAr ? "مشاركة التقرير الطبي" : "Share Medical Report"}
          </p>
          <h1 style={{ margin: "0.4rem 0 0", color: "#1E332E", fontSize: "clamp(1.8rem, 3.2vw, 2.4rem)", letterSpacing: "-0.035em", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("title")}</h1>
          <p style={{ margin: "0.5rem 0 0", color: "#6B7C6E", fontSize: "0.94rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>{t("subtitle")}</p>
        </div>
        <div style={{ display: "grid", placeItems: "center", flex: "0 0 auto", width: 76, height: 76, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(95,217,179,0.12)", boxShadow: "0 10px 24px rgba(30,51,46,0.06)" }}>
          <VectorHealthShield size={48} aria-hidden="true" />
        </div>
      </section>
      <section style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 22px rgba(30,51,46,.06)", padding: 16 }}>
        <ShareReportPanel reports={reports} locale={locale} origin={origin.replace(/\/$/, "")} />
      </section>
    </main>
  );
}
