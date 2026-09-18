import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HelpCircle, ShieldCheck } from "lucide-react";
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
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{ar ? "مركز المساعدة" : "Help center"}</p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? "المساعدة" : "Help"}</h1>
        <p style={{ overflowWrap: "anywhere" }}>{ar ? "إرشادات سريعة وروابط مباشرة لأهم الخدمات." : "Quick guides and direct links to key services."}</p>
      </section>
      <section className={styles.grid}>
        {TOPICS.map((t) => (
          <Link key={t.href} href={`/${locale}/${t.href}`} className={styles.card} style={{ textDecoration: "none", alignItems: "center" }}>
            <span className={styles.icon}><HelpCircle size={20} aria-hidden="true" /></span>
            <div><h2 style={{ margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? t.ar : t.en}</h2><p style={{ margin: "4px 0 0" }}>{ar ? "عرض التفاصيل" : "View details"}</p></div>
          </Link>
        ))}
      </section>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href={`/${locale}/support`} style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, textDecoration: "none" }}>{ar ? "محادثة فورية" : "Live chat"}</Link>
        <Link href={`/${locale}/settings/feedback`} style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", fontWeight: 700, textDecoration: "none" }}>{ar ? "شاركنا رأيك" : "Share feedback"}</Link>
      </nav>
    </main>
  );
}
