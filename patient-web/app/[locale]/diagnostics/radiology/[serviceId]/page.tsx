import { JsonLd } from "@/components-next/json-ld";
import { service as serviceLd, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import NextImage from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseRadiologyService } from "@/lib/api/radiology";
import { getPublicRadiologyServiceDetail } from "@/lib/api/radiology-server";
import styles from "../../labs/labs.module.css";
import { ServiceBookingModal } from "@/components-next/service-booking-modal";
import { VectorRadiology } from "@/components-next/vector-illustrations";

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
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, ""))])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
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
  if (!service) notFound();

  const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
  const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
  const preparation = rtl ? service.preparationAr ?? service.preparationEn : service.preparationEn ?? service.preparationAr;
  const servicePhoto = (service as any)?.image || "/images/radiology/mri.jpg";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <JsonLd data={[serviceLd({ name: name ?? t("title"), path: `/diagnostics/radiology/${serviceId}`, locale, description: description ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/radiology" }, { name: name ?? t("title"), locale, path: `/diagnostics/radiology/${serviceId}` }])]} />
      <Link className={styles.back} href={`/${locale}/diagnostics/radiology`} style={{ color: "#1E332E", gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere" } as any}><Arrow size={17} aria-hidden="true" /><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("backToRadiology")}</span></Link>

      <section className={styles.hero} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{description ?? t("detailDescriptionUnavailable")}</p>
          <div style={{ marginTop: 8 } as any}>
            <ServiceBookingModal
              locale={locale}
              serviceId={serviceId}
              serviceName={name ?? t("title")}
              servicePrice={service.price || 450}
              serviceType="radiology"
              homeVisitSupported={Boolean(service.homeVisitSupported)}
              buttonLabel={rtl ? "احجز موعد الأشعة الآن" : "Book Radiology Appointment"}
            />
          </div>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto", overflow: "hidden" } as any}><VectorRadiology size={48} aria-hidden="true" /></span>
      </section>

      <section className={styles.detailCard} aria-label={t("detailTitle")} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div className={styles.meta} style={{ gap: 8, overflowWrap: "anywhere" } as any}>
          {service.modality ? <span style={{ overflowWrap: "anywhere" } as any}>{service.modality}</span> : null}
          {service.bodyPart ? <span style={{ overflowWrap: "anywhere" } as any}>{service.bodyPart}</span> : null}
          {service.price !== undefined ? <span style={{ overflowWrap: "anywhere" } as any}>{t("price", { value: service.price })}</span> : null}
          {service.durationMinutes !== undefined ? <span style={{ overflowWrap: "anywhere" } as any}>{t("duration", { value: service.durationMinutes })}</span> : null}
          {service.turnaroundHours !== undefined ? <span style={{ overflowWrap: "anywhere" } as any}>{t("turnaround", { value: service.turnaroundHours })}</span> : null}
        </div>
        <div className={styles.badges} style={{ gap: 8 } as any}>
          {service.homeVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("homeVisit")}</span> : null}
          {service.facilityVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("facilityVisit")}</span> : null}
          {service.contrastRequired ? <span style={{ overflowWrap: "anywhere" } as any}>{t("contrast")}</span> : null}
          {service.fastingRequired ? <span style={{ overflowWrap: "anywhere" } as any}>{t("fasting")}</span> : null}
        </div>
        {preparation?.length ? (
          <div className={styles.section} style={{ gap: 8 } as any}>
            <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("preparationTitle")}</h2>
            <ul style={{ display: "grid", gap: 8, margin: 0, paddingInlineStart: "1.4rem" } as any}>{Array.isArray(preparation) ? preparation.map((item: string) => <li key={item} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{item}</li>) : <li style={{ overflowWrap: "anywhere" } as any}>{preparation}</li>}</ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
