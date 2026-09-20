import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { VectorLabs } from "@/components-next/vector-illustrations";
import type { Metadata } from "next";
import styles from "./labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; home?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, "/diagnostics/labs");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/labs")])), "x-default": localizedUrl("ar", "/diagnostics/labs") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: `${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"}/images/labs/comprehensive-checkup.jpg`, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function LabsServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("LabsServices");
  const search = (query.q ?? "").trim(); const homeOnly = query.home === "1";
  const response = await getPublicLabServices({ search, homeOnly });
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!response || !response.ok) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}><section className={styles.state} role="alert" style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/labs`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{t("retry")}</Link></section></main>;
  const services = extractLabServices(await response.json().catch(() => null));
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section className={styles.hero} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon} style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}>
          <VectorLabs size={48} aria-hidden="true" />
        </span>
      </section>

      <form className={styles.filters} method="get" role="search" style={{ gap: 8, padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <label className={styles.search} style={{ gap: 8 } as any}>
          <Search size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
          <span className="sr-only">{t("searchLabel")}</span>
          <input name="q" defaultValue={search} placeholder={t("searchPlaceholder")} style={{ color: "#1E332E" } as any} />
        </label>
        <label className={styles.toggle} style={{ gap: 8 } as any}>
          <input type="checkbox" name="home" value="1" defaultChecked={homeOnly} />
          <span style={{ overflowWrap: "anywhere" } as any}>{t("homeOnly")}</span>
        </label>
        <button className={styles.submit} type="submit" style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760, gap: 8 } as any}>{t("apply")}</button>
      </form>

      {services.length === 0 ? (
        <section className={styles.state} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px dashed #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyTitle")}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{search || homeOnly ? t("noMatch") : t("emptyBody")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {services.map((service) => {
            const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
            const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
            return (
              <Link className={styles.card} key={service.id} href={`/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(service.id)}`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 16 } as any}>
                <span className={styles.icon} style={{ overflow: "hidden", position: "relative", width: 48, height: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                  {service.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.imageUrl} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                  ) : (
                    <VectorLabs size={48} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.copy} style={{ gap: 8, minWidth: 0 } as any}>
                  <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</strong>
                  {service.shortCode ? <small style={{ overflowWrap: "anywhere" } as any}>{service.shortCode}</small> : null}
                  {description ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{description}</p> : null}
                  <div className={styles.meta} style={{ gap: 8 } as any}>
                    {service.price !== undefined ? <span className={styles.pricePill} style={{ overflowWrap: "anywhere" } as any}>{t("price", { value: service.price })}</span> : null}
                    {service.sampleType ? <span style={{ overflowWrap: "anywhere" } as any}>{service.sampleType}</span> : null}
                    {service.fastingRequired ? <span style={{ overflowWrap: "anywhere" } as any}>{t("fasting")}</span> : null}
                  </div>
                  <div className={styles.badges} style={{ gap: 8 } as any}>
                    {service.homeVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("homeVisit")}</span> : null}
                    {service.facilityVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("facilityVisit")}</span> : null}
                    {service.unavailable ? <span style={{ overflowWrap: "anywhere" } as any}>{t("unavailable")}</span> : null}
                  </div>
                </div>
                <Arrow size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
