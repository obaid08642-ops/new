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
  const response = await getPublicNursingCatalog();
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  if (!response || !response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorNursing size={54} aria-hidden="true" />
          <h1>{t("unavailable")}</h1>
          <p>{t("unavailableBody")}</p>
        </section>
      </main>
    );
  }

  const items = extractNursingCatalog(await response.json().catch(() => null));

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

      {items.length === 0 ? (
        <section className={styles.state}>
          <VectorNursing size={48} aria-hidden="true" />
          <h2>{t("empty")}</h2>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")}>
          {items.map((item) => {
            const name = rtl ? item.nameAr ?? item.nameEn : item.nameEn ?? item.nameAr;
            const description = rtl ? item.descriptionAr ?? item.descriptionEn : item.descriptionEn ?? item.descriptionAr;
            const duration = [item.durationValue, item.duration].filter(Boolean).join(" ");
            return (
              <Link
                key={item.id}
                href={`/${locale}/nursing/visits?serviceId=${encodeURIComponent(item.id)}`}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  <span className={styles.icon}>
                    <VectorNursing size={36} aria-hidden="true" />
                  </span>
                  <div className={styles.copy}>
                    <h2>{name}</h2>
                    {description ? <p>{description}</p> : null}
                  </div>
                </div>

                <div className={styles.cardBottom}>
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

                  <span className={styles.bookBtn}>
                    <HeartHandshake size={14} aria-hidden="true" />
                    <Arrow size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
