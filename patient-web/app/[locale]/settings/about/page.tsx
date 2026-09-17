import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
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
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none" }}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{ar ? "نبض بلس" : "Nabd Plus"}</p>
        <h1 style={{ overflowWrap: "anywhere" }}>{ar ? "عن نبض بلس" : "About Nabd Plus"}</h1>
        <p style={{ overflowWrap: "anywhere" }}>{ar ? "منصة الرعاية الصحية المتكاملة — مبنية بمعايير طبية وتنظيمية عالمية." : "Integrated health platform — built to clinical and regulatory standards."}</p>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flexShrink: 0 }}><ShieldCheck size={22} color="#1E332E" /></span>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: 16 }}>
        {TEAMS.map((t) => (
          <section key={t.en} className={styles.card} style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, color: "#1E332E", fontSize: "1.05rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? t.ar : t.en}</h2>
            <p style={{ margin: 0, color: "#64748B", overflowWrap: "anywhere" }}>{ar ? t.subAr : t.subEn}</p>
          </section>
        ))}
      </div>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/terms`} style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", color: "#1E332E", fontWeight: 700, textDecoration: "none" }}>{ar ? "الشروط" : "Terms"}</Link>
        <Link href={`/${locale}/privacy`} style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", color: "#1E332E", fontWeight: 700, textDecoration: "none" }}>{ar ? "الخصوصية" : "Privacy"}</Link>
      </nav>
    </main>
  );
}
