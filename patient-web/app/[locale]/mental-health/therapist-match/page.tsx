import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../mental-health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function TherapistMatchPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/mental-health`}>{locale === "ar" ? "الصحة النفسية" : "Mental health"}</Link>
      <h1>{locale === "ar" ? "مطابقة المعالج المناسب" : "Find the right therapist"}</h1>
      <p>
        {locale === "ar"
          ? "اختر التخصص (نفسي/استشاري) وطريقة الجلسة (عيادة/فيديو/منزلية) من دليل الأطباء، ثم احجز مباشرة."
          : "Pick a specialty and session type (clinic/video/home) from the doctors directory, then book directly."}
      </p>
      <Link href={`/${locale}/consultations/doctors`}>{locale === "ar" ? "تصفح الأطباء النفسيين" : "Browse therapists"}</Link>
    </main>
  );
}
