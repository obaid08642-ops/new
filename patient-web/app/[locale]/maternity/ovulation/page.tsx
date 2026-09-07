import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../maternity.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function MaternityOvulationPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/maternity`}>{locale === "ar" ? "الأمومة" : "Maternity"}</Link>
      <h1>{locale === "ar" ? "متتبع التبويض" : "Ovulation tracker"}</h1>
      <p>
        {locale === "ar"
          ? "التقدير هنا حسابي (آخر دورة + طول الدورة − 14 يوماً) ويُعرض مع شارة تقدير — أكّدي بياناتك من صفحة المتتبع الرئيسية."
          : "Estimates are computed locally (last period + cycle length − 14 days) and labelled as estimates."}
      </p>
      <Link href={`/${locale}/maternity/tracker`}>{locale === "ar" ? "فتح المتتبع الكامل" : "Open full tracker"}</Link>
    </main>
  );
}
