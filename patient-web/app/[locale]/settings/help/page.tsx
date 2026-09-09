import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const TOPICS: Array<{ href: string; ar: string; en: string }> = [
  { href: "appointments", ar: "الحجوزات", en: "Bookings" },
  { href: "pharmacy", ar: "الصيدلية", en: "Pharmacy" },
  { href: "insurance", ar: "التأمين", en: "Insurance" },
  { href: "returns", ar: "الإرجاع", en: "Returns" },
];

export default async function SettingsHelpPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <h1>{ar ? "المساعدة" : "Help"}</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {TOPICS.map((t) => (
          <li key={t.href}>
            <Link href={`/${locale}/${t.href}`}>{ar ? t.ar : t.en}</Link>
          </li>
        ))}
      </ul>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/support`}>{ar ? "محادثة فورية" : "Live chat"}</Link>
        <Link href={`/${locale}/settings/feedback`}>{ar ? "شاركنا رأيك" : "Share feedback"}</Link>
      </nav>
    </main>
  );
}
