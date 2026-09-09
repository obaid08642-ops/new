import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const TEAMS: Array<{ ar: string; en: string; subAr: string; subEn: string }> = [
  { ar: "فريق الهندسة", en: "Engineering team", subAr: "تطوير التطبيق والبنية التحتية", subEn: "App & infrastructure development" },
  { ar: "فريق المنتج", en: "Product team", subAr: "التصميم وتجربة المستخدم", subEn: "Design & user experience" },
  { ar: "الفريق الطبي", en: "Medical team", subAr: "المراجعة والاستشارات الطبية", subEn: "Review & medical consultations" },
  { ar: "فريق الدعم", en: "Support team", subAr: "خدمة العملاء على مدار الساعة", subEn: "24/7 customer service" },
];

export default async function SettingsAboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <h1>{ar ? "عن نبض بلس" : "About Nabd Plus"}</h1>
      {TEAMS.map((t) => (
        <section key={t.en}>
          <h2>{ar ? t.ar : t.en}</h2>
          <p>{ar ? t.subAr : t.subEn}</p>
        </section>
      ))}
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/terms`}>{ar ? "الشروط" : "Terms"}</Link>
        <Link href={`/${locale}/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
      </nav>
    </main>
  );
}
