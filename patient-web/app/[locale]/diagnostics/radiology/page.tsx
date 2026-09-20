import Link from "next/link";
import NextImage from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CircleAlert, Search, ShieldCheck } from "lucide-react";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { VectorRadiology } from "@/components-next/vector-illustrations";
import type { Metadata } from "next";
import styles from "../labs/labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, "/diagnostics/radiology");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/radiology")])), "x-default": localizedUrl("ar", "/diagnostics/radiology") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const on = (value: string | string[] | undefined) => first(value) === "1";
export default async function RadiologyServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = (await searchParams) ?? {}; const search = (first(query.search) ?? "").trim(); const modality = first(query.modality) ?? ""; const bodyPart = first(query.body_part) ?? "";
  const servicesResponse = getPublicRadiologyServices({ modality, bodyPart, search, homeVisit: on(query.home_visit) ? "true" : undefined, homeOnly: on(query.home_only) ? "true" : undefined, highestRated: on(query.highest_rated) ? "true" : undefined, nearest: on(query.nearest) ? "true" : undefined, lowestPrice: on(query.lowest_price) ? "true" : undefined });
  const modalitiesResponse = getPublicRadiologyModalities(); const [servicesResult, modalitiesResult] = await Promise.all([servicesResponse, modalitiesResponse]);
  const t = await getTranslations("RadiologyServices"); const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!servicesResult?.ok) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}><section className={styles.state} role="alert" style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorRadiology size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/radiology`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{t("retry")}</Link></section></main>;
  const services = extractRadiologyServices(await servicesResult.json().catch(() => null)); const modalityValues = modalitiesResult?.ok ? (await modalitiesResult.json().catch(() => null) as unknown) : []; const modalityList = Array.isArray(modalityValues) ? modalityValues.filter((x): x is string => typeof x === "string") : [];
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section className={styles.hero} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon} style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}>
          <VectorRadiology size={48} aria-hidden="true" />
        </span>
      </section>

      <form className={styles.filters} method="get" role="search" style={{ gap: 8, padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <label className={styles.search} style={{ gap: 8 } as any}>
          <Search size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
          <span className="sr-only">{t("searchLabel")}</span>
          <input name="search" defaultValue={search} placeholder={t("searchPlaceholder")} style={{ color: "#1E332E" } as any} />
        </label>
        <select className={styles.filterSelect} name="modality" defaultValue={modality} aria-label={t("modalityLabel")} style={{ borderRadius: 20, border: "1px solid #E8EDEE" } as any}>
          <option value="">{t("allModalities")}</option>
          {modalityList.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
        </select>
        <input className={styles.filterInput} name="body_part" defaultValue={bodyPart} placeholder={t("bodyPartPlaceholder")} aria-label={t("bodyPartLabel")} style={{ borderRadius: 20, border: "1px solid #E8EDEE" } as any} />
        <label className={styles.toggle} style={{ gap: 8 } as any}><input type="checkbox" name="home_visit" value="1" defaultChecked={on(query.home_visit)} /><span style={{ overflowWrap: "anywhere" } as any}>{t("homeVisit")}</span></label>
        <label className={styles.toggle} style={{ gap: 8 } as any}><input type="checkbox" name="highest_rated" value="1" defaultChecked={on(query.highest_rated)} /><span style={{ overflowWrap: "anywhere" } as any}>{t("highestRated")}</span></label>
        <label className={styles.toggle} style={{ gap: 8 } as any}><input type="checkbox" name="lowest_price" value="1" defaultChecked={on(query.lowest_price)} /><span style={{ overflowWrap: "anywhere" } as any}>{t("lowestPrice")}</span></label>
        <button className={styles.submit} type="submit" style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760, gap: 8 } as any}>{t("apply")}</button>
      </form>

      {services.length === 0 ? (
        <section className={styles.state} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px dashed #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorRadiology size={48} aria-hidden="true" /></span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyTitle")}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{search || modality || bodyPart ? t("noMatch") : t("emptyBody")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {services.map((service) => {
            const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
            const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
            return (
              <Link className={styles.card} key={service.id} href={`/${locale}/diagnostics/radiology/${encodeURIComponent(service.id)}`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 16 } as any}>
                <span className={styles.icon} style={{ overflow: "hidden", position: "relative", width: 48, height: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                  {service.imageUrl ? (
                    <NextImage src={service.imageUrl} alt={name || ""} fill sizes="(max-width: 720px) 50vw, 25vw" style={{ objectFit: "cover", borderRadius: "inherit" }} />
                  ) : (
                    <VectorRadiology size={48} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.copy} style={{ gap: 8, minWidth: 0 } as any}>
                  <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</strong>
                  {service.shortCode ? <small style={{ overflowWrap: "anywhere" } as any}>{service.shortCode}</small> : null}
                  {description ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{description}</p> : null}
                  <div className={styles.meta} style={{ gap: 8 } as any}>
                    {service.modality ? <span style={{ overflowWrap: "anywhere" } as any}>{service.modality}</span> : null}
                    {service.bodyPart ? <span style={{ overflowWrap: "anywhere" } as any}>{service.bodyPart}</span> : null}
                    {service.price !== undefined ? <span className={styles.pricePill} style={{ overflowWrap: "anywhere" } as any}>{t("price", { value: service.price })}</span> : null}
                    {service.durationMinutes !== undefined ? <span style={{ overflowWrap: "anywhere" } as any}>{t("duration", { value: service.durationMinutes })}</span> : null}
                  </div>
                  <div className={styles.badges} style={{ gap: 8 } as any}>
                    {service.homeVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("homeVisit")}</span> : null}
                    {service.facilityVisitSupported ? <span style={{ overflowWrap: "anywhere" } as any}>{t("facilityVisit")}</span> : null}
                    {service.contrastRequired ? <span style={{ overflowWrap: "anywhere" } as any}>{t("contrast")}</span> : null}
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
