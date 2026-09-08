import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../maternity.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function BabyGrowthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/maternity`}>{locale === "ar" ? "الأمومة" : "Maternity"}</Link>
      <h1>{locale === "ar" ? "نمو الجنين وتطور الطفل" : "Baby growth & development"}</h1>
      <p>
        {locale === "ar"
          ? "محتوى توعوي أسبوعي مرتبط بملف الحمل في المتتبع — ليس بديلاً عن المتابعة الطبية."
          : "Weekly educational content linked to your maternity profile — not a substitute for medical follow-up."}
      </p>
      <Link href={`/${locale}/maternity/tracker`}>{locale === "ar" ? "فتح المتتبع الكامل" : "Open full tracker"}</Link>
    </main>
  );
}
