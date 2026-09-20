import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import NextImage from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, FlaskConical, Home, ShieldCheck } from "lucide-react";
import { extractLabService, parseLabServiceId } from "@/lib/api/labs";
import { getPublicLabPackage } from "@/lib/api/labs-server";
import styles from "../../labs/labs.module.css";

import { ServiceBookingModal } from "@/components-next/service-booking-modal";

type Props = { params: Promise<{ locale: string; packageId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ packageId: string; locale: string }> }): Promise<Metadata> {
  const { locale, packageId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, `/diagnostics/packages/${encodeURIComponent(packageId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, "") )])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function LabPackageDetailPage({ params }: Props) {
  const { locale, packageId } = await params;
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("LabsPackages");
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;

  let pkg = null;
  let response;
  try {
    response = await getPublicLabPackage(packageId);
    if (response && response.status === 404) notFound();
    if (response && response.ok) {
      pkg = extractLabService(await response.json().catch(() => null));
    }
  } catch (err: any) {
    if (err?.message === "NOT_FOUND") throw err;
  }
  if (response?.status === 404) notFound();
  if (!pkg) notFound();

  const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr;
  const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr;
  const preparation = rtl ? pkg.preparationAr ?? pkg.preparationEn : pkg.preparationEn ?? pkg.preparationAr;
  const packagePhoto = (pkg as any)?.image || "/images/labs/comprehensive-checkup.jpg";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <JsonLd data={[medicalWebPage({ title: name ?? t("title"), description: description ?? null, locale, path: `/diagnostics/packages/${packageId}` }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/packages" }, { name: name ?? t("title"), locale, path: `/diagnostics/packages/${packageId}` }])]} />
      <Link className={styles.back} href={`/${locale}/diagnostics/packages`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", gap: 8 } as any}><Arrow size={17} aria-hidden="true" />{t("back")}</Link>
      
      <section className={styles.detailHero} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16 } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8 } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</h1>
          {description ? <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{description}</p> : null}
          <div style={{ marginTop: 8 }}>
            <ServiceBookingModal
              locale={locale}
              serviceId={packageId}
              serviceName={name ?? t("title")}
              servicePrice={pkg.price || 350}
              serviceType="lab"
              homeVisitSupported={Boolean(pkg.homeVisitSupported)}
              buttonLabel={rtl ? "احجز باقة التحليل الآن" : "Book Lab Package Now"}
            />
          </div>
        </div>
        <div style={{ width: 140, height: 140, borderRadius: 20, overflow: "hidden", border: "1px solid #E8EDEE", flexShrink: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <NextImage src={packagePhoto} alt={name ?? ""} width={140} height={140} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </section>

      <section className={styles.facts} aria-label={t("facts")} style={{ gap: 8 } as any}>
        {pkg.price !== undefined ? <div className={styles.fact} style={{ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}><strong style={{ color: "#1E332E" } as any}>{t("priceLabel")}</strong><span>{t("price", { value: pkg.price })}</span></div> : null}
        {pkg.oldPrice !== undefined && pkg.oldPrice > (pkg.price ?? 0) ? <div className={styles.fact} style={{ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}><strong style={{ color: "#1E332E" } as any}>{t("previousPrice")}</strong><span>{pkg.oldPrice}</span></div> : null}
        {pkg.includedServices?.length ? <div className={styles.fact} style={{ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}><strong style={{ color: "#1E332E" } as any}>{t("testsLabel")}</strong><span>{t("tests", { count: pkg.includedServices.length })}</span></div> : null}
        {pkg.turnaroundHours !== undefined ? <div className={styles.fact} style={{ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}><strong style={{ color: "#1E332E" } as any}>{t("turnaround")}</strong><span>{t("hours", { value: pkg.turnaroundHours })}</span></div> : null}
        {pkg.fastingRequired ? <div className={styles.fact} style={{ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}><strong style={{ color: "#1E332E" } as any}>{t("preparation")}</strong><span>{pkg.fastingHours ? t("fastingHours", { value: pkg.fastingHours }) : t("fasting")}</span></div> : null}
      </section>
      {pkg.includedServices?.length ? <section className={styles.panel} style={{ gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16 } as any}><h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("includedTitle")}</h2><ul className={styles.included} style={{ gap: 8 } as any}>{pkg.includedServices.map((item: string) => <li key={item} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}><Check size={16} aria-hidden="true" color="#00876F" />{item}</li>)}</ul></section> : null}
      {preparation?.length ? <section className={styles.panel} style={{ gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16 } as any}><h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("preparationTitle")}</h2><ul className={styles.included} style={{ gap: 8 } as any}>{Array.isArray(preparation) ? preparation.map((item: string) => <li key={item} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}><Check size={16} aria-hidden="true" color="#00876F" />{item}</li>) : <li style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{preparation}</li>}</ul></section> : null}
      <section className={styles.notice} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 8, padding: 12 } as any}><Home size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} /><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{pkg.homeVisitSupported ? t("homeAvailable") : t("homeUnavailable")}</p><span aria-hidden="true"><Arrow size={16} style={{ color: "#1E332E" } as any} /></span></section>
    </main>
  );
}
