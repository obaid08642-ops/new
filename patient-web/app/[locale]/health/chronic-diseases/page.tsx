import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientChronicDiseases } from "@/lib/api/chronic-server";
import { parseChronicDiseases } from "@/lib/api/chronic";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ChronicDiseasesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ChronicDiseases");
  const token = await requirePatientAccess(locale);
  let response: Response;
  try {
    response = await getPatientChronicDiseases(token);
  } catch {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const diseases = parseChronicDiseases(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/health`}>
        <Icon name="caret-left" size={17} />
        {t("back")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Icon name="shield-check" size={15} />
            {t("eyebrow")}
          </p>
          <h1>{t("title")}</h1>
        </div>
        <span className={styles.heroVector}>
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>
      {diseases.length ? (
        <section className={styles.grid} aria-label={t("title")}>
          {diseases.map((disease, index) => (
            <article className={styles.card} key={disease.id || `${disease.name}-${index}`}>
              <div className={styles.cardTop}>
                <span>{t("recordedCondition")}</span>
                <span className={styles.glyph}>
                  <Icon name="pulse" size={18} />
                </span>
              </div>
              <p className={styles.value}>{disease.name}</p>
              <p className={styles.date}>
                {t("source")}: {disease.source || t("unknown")}
              </p>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <VectorHealthShield size={48} aria-hidden="true" />
          <p>{t("empty")}</p>
        </section>
      )}
      <p className={styles.notice}>{t("notice")}</p>
    </main>
  );
}
