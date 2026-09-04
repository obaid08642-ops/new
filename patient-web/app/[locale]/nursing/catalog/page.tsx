import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock, HeartHandshake, ShieldCheck } from "lucide-react";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { VectorNursing } from "@/components-next/vector-illustrations";
import type { Metadata } from "next";
import styles from "./catalog.module.css";

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
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
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

  const isAr = locale === "ar";
  if (items.length === 0) {
    items = [
      { id: "nur-home-care", nameAr: "رعاية تمريضية منزلية متكاملة", nameEn: "Comprehensive Home Nursing Care", descriptionAr: "فحص المؤشرات الحيوية، قياس الضغط والسكر، وتناول الأدوية بإشراف ممرض/ممرضة مرخصة.", descriptionEn: "Vital signs monitoring, blood sugar & blood pressure checks by certified nurses.", price: 180, duration: isAr ? "ساعتان" : "2 Hours", insuranceAvailable: true, image: "/images/nursing/home-nurse.jpg" },
      { id: "nur-elderly", nameAr: "رعاية ومرافقة كبار السن المنزلية", nameEn: "Elderly Home Care & Companionship", descriptionAr: "رعاية شخصية وصحية متخصصة لكبار السن، المساعدة في الحركة، والتمارين العلاجية.", descriptionEn: "Personalized senior care, mobility assistance, and medication routine support.", price: 260, duration: isAr ? "4 ساعات" : "4 Hours", insuranceAvailable: true, image: "/images/nursing/elderly-care.jpg" },
      { id: "nur-iv-therapy", nameAr: "إعطاء المحاليل والإبر الوريدية (IV Drip)", nameEn: "IV Infusion & Injection Therapy", descriptionAr: "تركيب الكانيولا، إعطاء المضادات الحيوية والفيتامينات الوريدية بأعلى معايير التعقيم الطبي.", descriptionEn: "Cannula insertion, IV drip and prescribed antibiotic administration safely at home.", price: 150, duration: isAr ? "ساعة واحدة" : "1 Hour", insuranceAvailable: true, image: "/images/nursing/iv-therapy.jpg" },
      { id: "nur-wound-care", nameAr: "العناية بالجروح والغيار الجراحي المعقم", nameEn: "Post-Surgical Wound Care & Dressing", descriptionAr: "تنظيف وتعقيم الجروح بعد العمليات الجراحية، قرح الفراش، وإزالة الغرز الجراحية.", descriptionEn: "Sterile surgical dressing, post-op wound treatment, and suture removal.", price: 160, duration: isAr ? "ساعة واحدة" : "1 Hour", insuranceAvailable: true, image: "/images/nursing/wound-care.jpg" },
    ];
  }

  return (
    <main className={`main ${styles.page}`} dir={rtl ? "rtl" : "ltr"}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorNursing size={52} aria-hidden="true" />
        </span>
      </section>

      <section className={styles.grid} aria-label={t("title")}>
        {items.map((item) => {
          const name = rtl ? item.nameAr ?? item.nameEn : item.nameEn ?? item.nameAr;
          const description = rtl ? item.descriptionAr ?? item.descriptionEn : item.descriptionEn ?? item.descriptionAr;
          const duration = [item.durationValue, item.duration].filter(Boolean).join(" ");
          const itemPhoto = item.image || "/images/nursing/home-nurse.jpg";
          return (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.icon} style={{ width: 64, height: 64, borderRadius: "16px", overflow: "hidden", border: "2px solid #5FD9B3", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={itemPhoto} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </span>
                <div className={styles.copy}>
                  <h2>{name}</h2>
                  {description ? <p>{description}</p> : null}
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
    </main>
  );
}
