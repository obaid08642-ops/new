import { JsonLd } from "@/components-next/json-ld";
import { service as serviceLd, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Image, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseRadiologyService, parseRadiologyServiceId } from "@/lib/api/radiology";
import { getPublicRadiologyServiceDetail } from "@/lib/api/radiology-server";
import styles from "../../labs/labs.module.css";

import { ServiceBookingModal } from "@/components-next/service-booking-modal";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string; locale: string }> }): Promise<Metadata> {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, `/diagnostics/radiology/${encodeURIComponent(serviceId)}`);
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

export default async function RadiologyServiceDetailPage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RadiologyServices");
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const fallbackMap: Record<string, any> = {
    "rad-mri": {
      nameAr: "أشعة الرنين المغناطيسي المتقدم (MRI)",
      nameEn: "Advanced Magnetic Resonance Imaging (MRI)",
      descriptionAr: "تصوير بالرنين المغناطيسي عالي الدقة (3 تسلا) للمخ والعمود الفقري والمفاصل والأنسجة الرخوة.",
      descriptionEn: "High-resolution 3 Tesla MRI scanning for brain, spine, joints, and soft tissue.",
      modality: "MRI",
      bodyPart: "شامل / متعدد المناطق",
      price: 850,
      durationMinutes: 30,
      turnaroundHours: 12,
      homeVisitSupported: false,
      facilityVisitSupported: true,
      contrastRequired: false,
      fastingRequired: false,
      image: "/images/radiology/mri.jpg",
      preparationAr: ["إزالة جميع المعادن والمجوهرات وبطاقات الصراف", "إبلاغ الفني في حال وجود منظم ضربات قلب أو دعامات معدنية"],
    },
    "rad-ct": {
      nameAr: "الأشعة المقطعية المبرمجة (CT Scan)",
      nameEn: "Computed Tomography (CT Scan)",
      descriptionAr: "تصوير مقطعي سريع فائق الدقة ثلاثي الأبعاد لفحص الصدر والبطن والحوض والأوعية الدموية.",
      descriptionEn: "Multi-slice high-speed 3D CT scan for chest, abdomen, pelvis, and angiography.",
      modality: "CT",
      bodyPart: "الصدر والبطن",
      price: 650,
      durationMinutes: 15,
      turnaroundHours: 8,
      homeVisitSupported: false,
      facilityVisitSupported: true,
      contrastRequired: true,
      fastingRequired: true,
      image: "/images/radiology/ct-scan.jpg",
      preparationAr: ["الصيام لمدة 4 ساعات قبل الفحص في حال استخدام الصبغة", "شرب كميات كافية من الماء بعد الفحص"],
    },
    "rad-ultrasound": {
      nameAr: "الموجات فوق الصوتية والسونار (Ultrasound 4D)",
      nameEn: "Ultrasound & 4D Sonogram",
      descriptionAr: "فحص آمن غير إشعاعي للبطن والحوض، متابعة الجنين والحمل، والغدة الدرقية والشرايين بالدوبلر.",
      descriptionEn: "Safe radiation-free ultrasound for abdomen, pregnancy 4D, thyroid, and Doppler.",
      modality: "Ultrasound",
      bodyPart: "البطن والحمل",
      price: 280,
      durationMinutes: 20,
      turnaroundHours: 4,
      homeVisitSupported: true,
      facilityVisitSupported: true,
      contrastRequired: false,
      fastingRequired: true,
      image: "/images/radiology/ultrasound.jpg",
      preparationAr: ["الصيام لمدة 6 ساعات لفحوصات البطن العلوية والمرارة", "شرب لتر من الماء قبل فحص الحوض والمثانة بنصف ساعة"],
    },
    "rad-xray": {
      nameAr: "الأشعة السينية الرقمية (Digital X-Ray)",
      nameEn: "Digital Diagnostic X-Ray",
      descriptionAr: "تصوير إشعاعي رقمي فوري ومنخفض الجرعة للعظام والمفاصل وفحص الصدر والرئتين.",
      descriptionEn: "Instant low-dose digital radiography for bones, joints, and chest screening.",
      modality: "X-Ray",
      bodyPart: "الصدر والعظام",
      price: 150,
      durationMinutes: 10,
      turnaroundHours: 2,
      homeVisitSupported: true,
      facilityVisitSupported: true,
      contrastRequired: false,
      fastingRequired: false,
      image: "/images/radiology/xray.jpg",
      preparationAr: ["لا يشترط الصيام", "نزع الإكسسوارات والمجوهرات حول المنطقة المراد تصويرها"],
    },
  };

  let service = null;
  let response;
  try {
    response = await getPublicRadiologyServiceDetail(serviceId);
    if (response && response.status === 404) notFound();
    if (response && response.ok) {
      service = parseRadiologyService(await response.json().catch(() => null));
    }
  } catch (err: any) {
    if (err?.message === "NOT_FOUND") throw err;
  }

  if (response?.status === 404) notFound();

  const fallback = fallbackMap[serviceId];
  if (!service && fallback) {
    service = {
      id: serviceId,
      nameAr: fallback.nameAr,
      nameEn: fallback.nameEn,
      descriptionAr: fallback.descriptionAr,
      descriptionEn: fallback.descriptionEn,
      modality: fallback.modality,
      bodyPart: fallback.bodyPart,
      price: fallback.price,
      durationMinutes: fallback.durationMinutes,
      turnaroundHours: fallback.turnaroundHours,
      homeVisitSupported: fallback.homeVisitSupported,
      facilityVisitSupported: fallback.facilityVisitSupported,
      contrastRequired: fallback.contrastRequired,
      fastingRequired: fallback.fastingRequired,
      preparationAr: fallback.preparationAr,
      image: fallback.image,
    };
  }
  if (!service) notFound();

  const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
  const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
  const preparation = rtl ? service.preparationAr ?? service.preparationEn : service.preparationEn ?? service.preparationAr;
  const servicePhoto = (service as any).image || fallback.image || "/images/radiology/mri.jpg";

  return (
    <main className={`main ${styles.page}`}>
      <JsonLd data={[serviceLd({ name: name ?? t("title"), path: `/diagnostics/radiology/${serviceId}`, locale, description: description ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/radiology" }, { name: name ?? t("title"), locale, path: `/diagnostics/radiology/${serviceId}` }])]} />
      <Link className={styles.back} href={`/${locale}/diagnostics/radiology`}><Arrow size={17} aria-hidden="true" />{t("backToRadiology")}</Link>
      
      <section className={styles.hero} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{name}</h1>
          <p className={styles.subtitle}>{description ?? t("detailDescriptionUnavailable")}</p>
          <div style={{ marginTop: "1.25rem" }}>
            <ServiceBookingModal
              locale={locale}
              serviceId={serviceId}
              serviceName={name}
              servicePrice={service.price || 450}
              serviceType="radiology"
              homeVisitSupported={Boolean(service.homeVisitSupported)}
              buttonLabel={rtl ? "احجز موعد الأشعة الآن" : "Book Radiology Appointment"}
            />
          </div>
        </div>
        <div style={{ width: 140, height: 140, borderRadius: "24px", overflow: "hidden", border: "3px solid #5FD9B3", flexShrink: 0, boxShadow: "0 8px 24px rgba(22, 33, 58, 0.12)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={servicePhoto} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </section>

      <section className={styles.detailCard} aria-label={t("detailTitle")}>
        <div className={styles.meta}>
          {service.modality ? <span>{service.modality}</span> : null}
          {service.bodyPart ? <span>{service.bodyPart}</span> : null}
          {service.price !== undefined ? <span>{t("price", { value: service.price })}</span> : null}
          {service.durationMinutes !== undefined ? <span>{t("duration", { value: service.durationMinutes })}</span> : null}
          {service.turnaroundHours !== undefined ? <span>{t("turnaround", { value: service.turnaroundHours })}</span> : null}
        </div>
        <div className={styles.badges}>
          {service.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}
          {service.facilityVisitSupported ? <span>{t("facilityVisit")}</span> : null}
          {service.contrastRequired ? <span>{t("contrast")}</span> : null}
          {service.fastingRequired ? <span>{t("fasting")}</span> : null}
        </div>
        {preparation?.length ? (
          <div className={styles.section}>
            <h2>{t("preparationTitle")}</h2>
            <ul>{Array.isArray(preparation) ? preparation.map((item: string) => <li key={item}>{item}</li>) : <li>{preparation}</li>}</ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
