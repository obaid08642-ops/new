import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { extractHomeCareServices } from "@/lib/api/home-care-services";
import { getPatientHomeCareServices, getPublicHomeCareServices } from "@/lib/api/home-care-services-server";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";

import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./services.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/home-care/services", t("home-care/services.title"), t("home-care/services.description"));
}

export default async function HomeCareServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HomeCareServices");
  const token = await getOptionalPatientAccessToken();
  let response = token ? await getPatientHomeCareServices(token) : await getPublicHomeCareServices();
  if (!response || !response.ok) {
    response = await getPublicNursingCatalog();
  }
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const services = response && response.ok ? extractHomeCareServices(await response.json().catch(() => null)) : [];
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = services.filter((service) =>
    [service.nameAr, service.nameEn, service.descriptionAr, service.descriptionEn]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase(locale).includes(query)),
  );
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section
        className={styles.hero}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {t("eyebrow")}
            </span>
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {t("title")}
          </h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("subtitle")}
          </p>
        </div>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(95,217,179,.12)",
            border: "1px solid #E8EDEE",
            flex: "0 0 auto",
          } as any}
        >
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </section>
      <form
        className={styles.search}
        method="get"
        role="search"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 16,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <Search size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
        <label className="sr-only" htmlFor="home-care-search">
          {t("searchLabel")}
        </label>
        <input
          id="home-care-search"
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "#1E332E", overflowWrap: "anywhere" } as any}
        />
      </form>
      {filtered.length === 0 ? (
        <section
          className={styles.state}
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center", textAlign: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("emptyTitle")}
          </h2>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{services.length === 0 ? t("emptyBody") : t("noMatch")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {filtered.map((service) => {
            const name = rtl ? (service.nameAr ?? service.nameEn) : (service.nameEn ?? service.nameAr);
            const description = rtl ? (service.descriptionAr ?? service.descriptionEn) : (service.descriptionEn ?? service.descriptionAr);
            return (
              <Link
                href={`/${locale}/home-care/services/${service.id}`}
                className={styles.card}
                key={service.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 16,
                  border: "1px solid #E8EDEE",
                  borderRadius: 20,
                  background: "rgba(255,255,255,.82)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  textDecoration: "none",
                } as any}
              >
                <span
                  className={styles.icon}
                  style={{
                    overflow: "hidden",
                    position: "relative",
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(95,217,179,.12)",
                    border: "1px solid #E8EDEE",
                    display: "grid",
                    placeItems: "center",
                    flex: "0 0 auto",
                  } as any}
                >
                  {service.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.imageUrl} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" } as any} />
                  ) : (
                    <VectorNursing size={48} aria-hidden="true" />
                  )}
                </span>
                <span className={styles.copy} style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
                  <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
                    {name}
                  </strong>
                  {description ? (
                    <small style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
                      {description}
                    </small>
                  ) : null}
                  {service.price !== undefined ? (
                    <small style={{ color: "#1E332E", fontWeight: 750, overflowWrap: "anywhere" } as any}>{t("price", { value: service.price })}</small>
                  ) : null}
                </span>
                <Arrow size={18} aria-hidden="true" style={{ color: "#1E332E", flex: "0 0 auto" } as any} />
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
