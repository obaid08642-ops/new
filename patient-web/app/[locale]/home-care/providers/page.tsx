import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, ShieldCheck } from "lucide-react";
import { extractHomeCareProviders } from "@/lib/api/home-care-providers";
import { getPatientHomeCareProviders } from "@/lib/api/home-care-providers-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./providers.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HomeCareProvidersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HomeCareProviders");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareProviders(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();

  if (!response.ok) {
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

  const providers = extractHomeCareProviders(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`} dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon} style={{ display: "grid", placeItems: "center" }}>
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </header>

      {providers.length === 0 ? (
        <section className={styles.state}>
          <VectorNursing size={48} aria-hidden="true" />
          <h2>{t("empty")}</h2>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")}>
          {providers.map((provider) => (
            <article className={styles.card} key={provider.id}>
              <span className={styles.icon}>
                <VectorNursing size={28} aria-hidden="true" />
              </span>
              <div>
                <h2>{locale === "ar" ? provider.nameAr || provider.nameEn : provider.nameEn || provider.nameAr}</h2>
                {provider.city ? (
                  <p className={styles.location}>
                    <MapPin size={14} aria-hidden="true" />
                    {provider.city}
                  </p>
                ) : null}
                <span className={styles.status}>{t("verified")}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
