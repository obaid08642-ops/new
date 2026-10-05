import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { DrugInteractionChecker } from "@/components-next/drug-interaction-checker";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function DrugInteractionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("PharmacyBrowse");

  return (
    <CoreShell locale={locale} title={t("ixTitle")} backHref={`/${locale}/pharmacy`}>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("ixTitle")}</h1>
        </div>
        <DrugInteractionChecker locale={locale} />
      </div>
    </CoreShell>
  );
}
