import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../mental-health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function MentalHealthSelfAssessmentPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/mental-health`}>{locale === "ar" ? "الصحة النفسية" : "Mental health"}</Link>
      <h1>{locale === "ar" ? "التقييم الذاتي (توعوي — ليس تشخيصاً)" : "Self-assessment (awareness only — not a diagnosis)"}</h1>
      <p>
        {locale === "ar"
          ? "هذا التقييم لأغراض التوعية فقط ولا يغني عن استشارة مختص. إذا ظهرت لديك أعراض مقلقة، احجز استشارة نفسية أو تواصل مع جهات الدعم."
          : "This awareness check is not a diagnosis. If you notice concerning symptoms, book a mental-health consultation."}
      </p>
      <ul>
        <li>{locale === "ar" ? "سجّل مزاجك يومياً من صفحة المزاج." : "Track your mood daily from the mood page."}</li>
        <li>{locale === "ar" ? "راجع تمارين التنفس والتأمل للتهدئة." : "Try the breathing and meditation exercises."}</li>
      </ul>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/mental-health/mood`}>{locale === "ar" ? "يوميات المزاج" : "Mood journal"}</Link>
        <Link href={`/${locale}/consultations/doctors`}>{locale === "ar" ? "حجز استشارة نفسية" : "Book a consultation"}</Link>
        <Link href={`/${locale}/mental-health/crisis-contacts`}>{locale === "ar" ? "جهات الدعم العاجل" : "Crisis contacts"}</Link>
      </div>
    </main>
  );
}
