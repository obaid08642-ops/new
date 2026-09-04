import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
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

  const fallbackMap: Record<string, any> = {
    "pkg-comprehensive": {
      nameAr: "باقة الفحص الطبي الشامل المتقدم",
      nameEn: "Comprehensive Medical Checkup Package",
      descriptionAr: "فحص شامل يغطي 32 مؤشراً حيوياً: صورة الدم الكاملة CBC، وظائف الكبد، وظائف الكلى، الدهون الكاملة، سكر الدم التراكمي، وتحليل البول.",
      descriptionEn: "Comprehensive panel covering 32 vital biomarkers including CBC, liver, kidney, lipid panel, HbA1c, and urinalysis.",
      price: 390,
      oldPrice: 550,
      turnaroundHours: 24,
      fastingRequired: true,
      fastingHours: 10,
      homeVisitSupported: true,
      image: "/images/labs/comprehensive-checkup.jpg",
      includedServices: ["صورة الدم الكاملة (CBC)", "سكر الدم التراكمي (HbA1c)", "وظائف الكلى (Creatinine & Urea)", "وظائف الكبد (ALT, AST, Bilirubin)", "دهون الدم الكاملة (Cholesterol, HDL, LDL, Triglycerides)", "فيتامين د (Vitamin D)", "فيتامين ب12 (Vitamin B12)"],
      preparationAr: ["الصيام عن الأكل والشرب لمدة 10 إلى 12 ساعة (يُسمح بشرب الماء فقط)", "تجنب التمارين الرياضية الشاقة قبل الفحص بـ 24 ساعة"],
    },
    "pkg-vitamins": {
      nameAr: "باقة الفيتامينات والمعادن الحيوية",
      nameEn: "Essential Vitamins & Minerals Panel",
      descriptionAr: "فحص دقيق لمستويات الفيتامينات والمعادن الأساسية للجسم والطاقة والنشاط ومناعة الجسم.",
      descriptionEn: "Vital testing for energy, immunity, and body nutrient levels.",
      price: 280,
      oldPrice: 380,
      turnaroundHours: 18,
      fastingRequired: false,
      homeVisitSupported: true,
      image: "/images/labs/vitamin-panel.jpg",
      includedServices: ["فيتامين د 3 (Vitamin D3)", "فيتامين ب12 (Vitamin B12)", "مخزون الحديد (Ferritin)", "الكالسيوم الكلي (Total Calcium)", "المغنيسيوم (Magnesium)", "حمض الفوليك (Folic Acid)"],
      preparationAr: ["لا يشترط الصيام، ويُفضل إجراؤها صباحاً"],
    },
    "pkg-diabetes": {
      nameAr: "باقة متابعة السكري الشاملة",
      nameEn: "Comprehensive Diabetes Control Panel",
      descriptionAr: "متابعة دقيقة لمرضى السكري والوقاية من مضاعفاته، وتشمل فحص السكر الصائم والتراكمي ووظائف الكلى.",
      descriptionEn: "Accurate monitoring of glucose levels, HbA1c, and kidney function for diabetes care.",
      price: 210,
      oldPrice: 320,
      turnaroundHours: 12,
      fastingRequired: true,
      fastingHours: 8,
      homeVisitSupported: true,
      image: "/images/labs/diabetes-panel.jpg",
      includedServices: ["سكر الدم الصائم (FBS)", "السكر التراكمي (HbA1c)", "الزلال البولي الدقيق (Microalbumin/Creatinine Ratio)", "وظائف الكلى (eGFR)", "دهون الدم الثلاثية"],
      preparationAr: ["الصيام لمدة 8 ساعات قبل سحب العينة"],
    },
    "pkg-women": {
      nameAr: "باقة صحة المرأة الشاملة",
      nameEn: "Women's Comprehensive Wellness",
      descriptionAr: "فحوصات مخصصة لصحة المرأة، التوازن الهرموني، نشاط الغدة الدرقية، ومخزون الحديد والطاقة.",
      descriptionEn: "Tailored checkup for women's hormonal balance, thyroid health, and iron stores.",
      price: 450,
      oldPrice: 620,
      turnaroundHours: 24,
      fastingRequired: true,
      fastingHours: 10,
      homeVisitSupported: true,
      image: "/images/labs/women-health.jpg",
      includedServices: ["هرمون الغدة الدرقية (TSH, Free T4)", "مخزون الحديد والأنيميا (Ferritin & Iron)", "فيتامين د النشط", "الكالسيوم وهشاشة العظام", "صورة الدم الكاملة", "وظائف الكبد والكلى"],
      preparationAr: ["الصيام لمدة 10 ساعات قبل إجراء التحليل"],
    },
    "pkg-cardiac": {
      nameAr: "باقة صحة القلب والشرايين",
      nameEn: "Cardiac & Heart Health Biomarkers",
      descriptionAr: "مؤشرات حيوية لتقييم صحة القلب والشرايين ومستويات الكوليسترول ومخاطر الجلطات.",
      descriptionEn: "Key biomarkers for cardiovascular risk evaluation and lipid health.",
      price: 340,
      oldPrice: 480,
      turnaroundHours: 18,
      fastingRequired: true,
      fastingHours: 12,
      homeVisitSupported: true,
      image: "/images/labs/cardiac-panel.jpg",
      includedServices: ["الدهون الكاملة عالية ومنخفضة الكثافة (Lipid Profile)", "مؤشر الالتهاب الوعائي (hs-CRP)", "وظائف الكلى وإنزيمات القلب", "حمض اليوريك (Uric Acid)"],
      preparationAr: ["الصيام التام لمدة 12 ساعة مع شرب الماء"],
    },
  };

  let pkg = null;
  try {
    const response = await getPublicLabPackage(packageId);
    if (response && response.ok) {
      pkg = extractLabService(await response.json().catch(() => null));
    }
  } catch {}

  const fallback = fallbackMap[packageId] || fallbackMap["pkg-comprehensive"];
  if (!pkg) {
    pkg = {
      id: packageId,
      nameAr: fallback.nameAr,
      nameEn: fallback.nameEn,
      descriptionAr: fallback.descriptionAr,
      descriptionEn: fallback.descriptionEn,
      price: fallback.price,
      oldPrice: fallback.oldPrice,
      turnaroundHours: fallback.turnaroundHours,
      fastingRequired: fallback.fastingRequired,
      fastingHours: fallback.fastingHours,
      homeVisitSupported: fallback.homeVisitSupported,
      includedServices: fallback.includedServices,
      preparationAr: fallback.preparationAr,
      image: fallback.image,
    };
  }

  const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr;
  const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr;
  const preparation = rtl ? pkg.preparationAr ?? pkg.preparationEn : pkg.preparationEn ?? pkg.preparationAr;
  const packagePhoto = (pkg as any).image || fallback.image || "/images/labs/comprehensive-checkup.jpg";

  return (
    <main className={`main ${styles.page}`}>
      <JsonLd data={[medicalWebPage({ title: name ?? t("title"), description: description ?? null, locale, path: `/diagnostics/packages/${packageId}` }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/packages" }, { name: name ?? t("title"), locale, path: `/diagnostics/packages/${packageId}` }])]} />
      <Link className={styles.back} href={`/${locale}/diagnostics/packages`}><Arrow size={17} aria-hidden="true" />{t("back")}</Link>
      
      <section className={styles.detailHero} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{name}</h1>
          {description ? <p className={styles.subtitle}>{description}</p> : null}
          <div style={{ marginTop: "1.25rem" }}>
            <ServiceBookingModal
              locale={locale}
              serviceId={packageId}
              serviceName={name}
              servicePrice={pkg.price || 350}
              serviceType="lab"
              homeVisitSupported={Boolean(pkg.homeVisitSupported)}
              buttonLabel={rtl ? "احجز باقة التحليل الآن" : "Book Lab Package Now"}
            />
          </div>
        </div>
        <div style={{ width: 140, height: 140, borderRadius: "24px", overflow: "hidden", border: "3px solid #5FD9B3", flexShrink: 0, boxShadow: "0 8px 24px rgba(22, 33, 58, 0.12)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={packagePhoto} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </section>

      <section className={styles.facts} aria-label={t("facts")}>
        {pkg.price !== undefined ? <div className={styles.fact}><strong>{t("priceLabel")}</strong><span>{t("price", { value: pkg.price })}</span></div> : null}
        {pkg.oldPrice !== undefined && pkg.oldPrice > (pkg.price ?? 0) ? <div className={styles.fact}><strong>{t("previousPrice")}</strong><span>{pkg.oldPrice}</span></div> : null}
        {pkg.includedServices?.length ? <div className={styles.fact}><strong>{t("testsLabel")}</strong><span>{t("tests", { count: pkg.includedServices.length })}</span></div> : null}
        {pkg.turnaroundHours !== undefined ? <div className={styles.fact}><strong>{t("turnaround")}</strong><span>{t("hours", { value: pkg.turnaroundHours })}</span></div> : null}
        {pkg.fastingRequired ? <div className={styles.fact}><strong>{t("preparation")}</strong><span>{pkg.fastingHours ? t("fastingHours", { value: pkg.fastingHours }) : t("fasting")}</span></div> : null}
      </section>
      {pkg.includedServices?.length ? <section className={styles.panel}><h2>{t("includedTitle")}</h2><ul className={styles.included}>{pkg.includedServices.map((item: string) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></section> : null}
      {preparation?.length ? <section className={styles.panel}><h2>{t("preparationTitle")}</h2><ul className={styles.included}>{Array.isArray(preparation) ? preparation.map((item: string) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>) : <li>{preparation}</li>}</ul></section> : null}
      <section className={styles.notice}><Home size={18} aria-hidden="true" /><p>{pkg.homeVisitSupported ? t("homeAvailable") : t("homeUnavailable")}</p><span aria-hidden="true"><Arrow size={16} /></span></section>
    </main>
  );
}
