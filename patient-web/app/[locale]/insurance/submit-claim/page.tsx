import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileCheck2 } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { InsuranceSubmitClaimForm } from "@/components-next/insurance-submit-claim-form";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceSubmitClaimPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  await requirePatientAccess(locale);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><FileCheck2 size={15} aria-hidden="true" />{t("claimsEyebrow")}</p>
          <h1>{locale === "ar" ? "تقديم مطالبة تأمين" : "Submit insurance claim"}</h1>
          <p>{t("claimsNotice")}</p>
        </div>
      </section>
      <InsuranceSubmitClaimForm locale={locale} />
    </main>
  );
}
