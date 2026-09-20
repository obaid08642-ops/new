import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FlaskConical, Home, MapPin, Phone, Star } from "lucide-react";
import { getPublicLab, extractLab } from "@/lib/api/labs-server";
import { VectorLabs } from "@/components-next/vector-illustrations";
import styles from "./lab-detail.module.css";

type Props = { params: Promise<{ locale: string; labId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, labId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsDetail" });
  const canonical = localizedUrl(locale, `/diagnostics/labs/${encodeURIComponent(labId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/diagnostics/labs/${encodeURIComponent(labId)}`)])),
        "x-default": localizedUrl("ar", `/diagnostics/labs/${encodeURIComponent(labId)}`),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function LabDetailPage({ params }: Props) {
  const { locale, labId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("LabsDetail");
  const response = await getPublicLab(labId);
  if (!response || response.status === 404) notFound();

  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section className={styles.state} role="alert" style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableBody")}</p>
          <Link href={`/${locale}/diagnostics/labs`} className={styles.action} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>
            {t("retry")}
          </Link>
        </section>
      </main>
    );
  }

  const lab = extractLab(await response.json().catch(() => null));
  if (!lab) notFound();

  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link href={`/${locale}/diagnostics/labs`} className={styles.back} style={{ color: "#1E332E", gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere" } as any}>
        <Arrow size={17} aria-hidden="true" />
        <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("back")}</span>
      </Link>

      <article className={styles.detail} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div className={styles.heroBanner}>
          {lab.image ? (
            <img src={lab.image} alt={lab.name} className={styles.coverImage} />
          ) : (
            <div className={styles.placeholderBanner}>
              <VectorLabs size={48} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.header}>
          <div className={styles.badge}>{t("typeLabel")}</div>
          <div className={styles.rating}>
            <Star size={16} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
            <strong>{lab.rating?.toFixed(1)}</strong>
          </div>
        </div>

        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? lab.name_ar || lab.name : lab.name_en || lab.name}</h1>

        {lab.city || lab.address ? (
          <p className={styles.location}>
            <MapPin size={16} aria-hidden="true" />
            <span>{lab.city || lab.address}</span>
          </p>
        ) : null}

        {lab.home_visit ? (
          <p className={styles.homeBadge}>
            <Home size={15} aria-hidden="true" />
            <span>{t("homeVisitSupported")}</span>
          </p>
        ) : null}

        {lab.phone ? (
          <p className={styles.contact}>
            <Phone size={16} aria-hidden="true" />
            <a href={`tel:${lab.phone}`}>{lab.phone}</a>
          </p>
        ) : null}

        <section className={styles.section} style={{ gap: 8 } as any}>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("aboutTitle")}</h2>
          <p className={styles.aboutText} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{lab.description || t("defaultAbout")}</p>
        </section>

        {lab.services && lab.services.length > 0 ? (
          <section className={styles.section} style={{ gap: 16 } as any}>
            <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("servicesTitle")}</h2>
            <div className={styles.serviceGrid} style={{ gap: 16 } as any}>
              {lab.services.map((svc) => (
                <Link
                  key={svc.id}
                  href={`/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(svc.id)}&labId=${encodeURIComponent(lab.id)}`}
                  className={styles.serviceCard}
                  style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.72)", gap: 8, padding: 16 } as any}
                >
                  <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
                  <div className={styles.serviceInfo} style={{ gap: 8 } as any}>
                    <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? svc.name_ar || svc.name : svc.name_en || svc.name}</strong>
                    {svc.sample_type ? <small style={{ overflowWrap: "anywhere" } as any}>{svc.sample_type}</small> : null}
                    {svc.price !== undefined ? (
                      <span className={styles.price} style={{ overflowWrap: "anywhere" } as any}>{t("price", { value: svc.price })}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
