import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ScanPrescriptionForm } from "@/components-next/scan-prescription-form";
import styles from "./scan.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ScanPrescriptionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);

  const t = await getTranslations("ScanPrescription");

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.iconWrap}>
            <Icon name="camera" size={26} />
          </span>
          <div>
            <p className={styles.eyebrow}>
              <Icon name="shield-check" size={15} />
              {t("eyebrow")}
            </p>
            <h1>{t("title")}</h1>
          </div>
        </div>
        <p className={styles.description}>{t("description")}</p>

        <ScanPrescriptionForm
          locale={locale}
          labels={{
            title: t("title"),
            description: t("description"),
            uploadLabel: t("uploadLabel"),
            scanBtn: t("scanBtn"),
            submitting: t("submitting"),
            extracting: t("extracting"),
            saving: t("saving"),
            success: t("success"),
            error: t("error"),
          }}
        />
      </section>
    </main>
  );
}
