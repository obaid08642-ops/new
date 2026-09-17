import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock, HeartHandshake, ShieldCheck } from "lucide-react";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import {
  VectorNursing,
  VectorLabs,
  VectorVitals,
  VectorHealthShield,
  VectorFamily,
} from "@/components-next/vector-illustrations";
import { ServiceBookingModal } from "@/components-next/service-booking-modal";
import type { Metadata } from "next";
import styles from "./catalog.module.css";

function getNursingVector(item: any) {
  const text = `${item.id} ${item.category || ""} ${item.nameAr || ""} ${item.nameEn || ""}`.toLowerCase();
  if (text.includes("دم") || text.includes("تحاليل") || text.includes("blood") || text.includes("lab")) {
    return <VectorLabs size={48} />;
  }
  if (text.includes("علامات") || text.includes("ضغط") || text.includes("سكر") || text.includes("vital")) {
    return <VectorVitals size={48} />;
  }
  if (text.includes("جروح") || text.includes("سكري") || text.includes("غيار") || text.includes("قرح") || text.includes("wound")) {
    return <VectorHealthShield size={48} />;
  }
  if (text.includes("مسن") || text.includes("كبار") || text.includes("elderly") || text.includes("companion")) {
    return <VectorFamily size={48} />;
  }
  return <VectorNursing size={48} />;
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingCatalog" });
  const canonical = localizedUrl(locale, "/nursing/catalog");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/nursing/catalog")])), "x-default": localizedUrl("ar", "/nursing/catalog") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: `${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"}/images/nursing/home-nurse.jpg`, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function NursingCatalogPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingCatalog");
  let items: any[] = [];
  try {
    const response = await getPublicNursingCatalog();
    if (response && response.ok) {
      items = extractNursingCatalog(await response.json().catch(() => null));
    }
  } catch {}

  const rtl = locale === "ar" || locale === "ur";

  return (
    <main className={`main ${styles.page}`} dir={rtl ? "rtl" : "ltr"} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere" }}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </section>

      {items.length === 0 ? (
        <section className={styles.state} role="status">
          <VectorNursing size={48} aria-hidden="true" />
          <h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("emptyTitle") ?? (locale === "ar" ? "لا توجد خدمات تمريض حالياً" : "No nursing services available")}</h2>
          <p style={{ overflowWrap: "anywhere" }}>{t("emptyBody") ?? (locale === "ar" ? "لم نتمكن من تحميل كتالوج التمريض. يرجى المحاولة لاحقاً." : "Could not load nursing catalog. Please try again later.")}</p>
        </section>
      ) : (
      <section className={styles.grid} aria-label={t("title")}>
        {items.map((item) => {
          const name = rtl ? item.nameAr ?? item.nameEn : item.nameEn ?? item.nameAr;
          const description = rtl ? item.descriptionAr ?? item.descriptionEn : item.descriptionEn ?? item.descriptionAr;
          const duration = [item.durationValue, item.duration].filter(Boolean).join(" ");
          return (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.icon} style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(95,217,179,0.12)", border: "1px solid #E8EDEE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getNursingVector(item)}
                </span>
                <div className={styles.copy}>
                  <h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{name}</h2>
                  {description ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p> : null}
                </div>
              </div>

              <div className={styles.cardBottom} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                <div className={styles.meta}>
                  {item.price !== undefined ? (
                    <span className={styles.priceBadge}>
                      {t("price", { value: item.price })}
                    </span>
                  ) : null}
                  {duration ? (
                    <span className={styles.durationBadge}>
                      <Clock size={12} aria-hidden="true" />
                      {duration}
                    </span>
                  ) : null}
                  {item.insuranceAvailable ? (
                    <span className={styles.insuranceBadge}>
                      <ShieldCheck size={12} aria-hidden="true" />
                      {t("insurance")}
                    </span>
                  ) : null}
                </div>

                <div>
                  <ServiceBookingModal
                    locale={locale}
                    serviceId={item.id}
                    serviceName={name}
                    servicePrice={item.price || 180}
                    serviceType="nursing"
                    homeVisitSupported={true}
                    buttonLabel={rtl ? "احجز الآن" : "Book Now"}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>
      )}
    </main>
  );
}
