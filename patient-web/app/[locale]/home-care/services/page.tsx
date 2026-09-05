import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { extractHomeCareServices } from "@/lib/api/home-care-services";
import { getPatientHomeCareServices, getPublicHomeCareServices } from "@/lib/api/home-care-services-server";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./services.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export default async function HomeCareServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("HomeCareServices");
  const token = await getOptionalPatientAccessToken();
  let response = token ? await getPatientHomeCareServices(token) : await getPublicHomeCareServices();
  if (!response || !response.ok) {
    response = await getPublicNursingCatalog();
  }
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  const services = response && response.ok ? extractHomeCareServices(await response.json().catch(() => null)) : [];
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = services.filter((service) => [service.nameAr, service.nameEn, service.descriptionAr, service.descriptionEn].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query)));
  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={14} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorNursing size={52} aria-hidden="true" />
        </span>
      </section>
      <form className={styles.search} method="get" role="search">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="home-care-search">{t("searchLabel")}</label>
        <input id="home-care-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} />
      </form>
      {filtered.length === 0 ? (
        <section className={styles.state}>
          <VectorNursing size={48} aria-hidden="true" />
          <h2>{t("emptyTitle")}</h2>
          <p>{services.length === 0 ? t("emptyBody") : t("noMatch")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")}>
          {filtered.map((service, index) => {
            const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
            const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
            return (
              <Link href={`/${locale}/home-care/services/${service.id}`} className={styles.card} key={service.id}>
                <span className={styles.icon}>
                  <VectorNursing size={36} aria-hidden="true" />
                </span>
                <span className={styles.copy}>
                  <strong>{name}</strong>
                  {description ? <small>{description}</small> : null}
                  {service.price !== undefined ? <small style={{ color: "#00876F", fontWeight: 750 }}>{t("price", { value: service.price })}</small> : null}
                </span>
                <Arrow size={18} aria-hidden="true" />
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
