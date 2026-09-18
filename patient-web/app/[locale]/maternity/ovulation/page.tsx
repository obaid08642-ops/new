import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Activity, ChevronLeft, Heart } from "lucide-react";
import { VectorMaternity } from "@/components-next/vector-illustrations";
import styles from "../maternity.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function MaternityOvulationPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/maternity`} className={styles.back}><ChevronLeft size={17} aria-hidden="true" />{ar ? "الأمومة" : "Maternity"}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Heart size={15} aria-hidden="true" />{ar ? "الصحة الإنجابية" : "Reproductive health"}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? "متتبع التبويض" : "Ovulation tracker"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "التقدير هنا حسابي (آخر دورة + طول الدورة − 14 يوماً) ويُعرض مع شارة تقدير — أكّدي بياناتك من صفحة المتتبع الرئيسية."
              : "Estimates are computed locally (last period + cycle length − 14 days) and labelled as estimates."}
          </p>
        </div>
        <span className={styles.heroVector}><VectorMaternity size={48} aria-hidden="true" /></span>
      </section>
      <section className={styles.progressCard} style={{ borderLeft: "3px solid #5FD9B3" }}>
        <p style={{ margin: 0, color: "#64748B", lineHeight: "1.7", overflowWrap: "anywhere" }}>{ar ? "انتقلي للمتتبع الكامل لتسجيل دوراتك والحصول على تقدير دقيق لنافذة التبويض." : "Go to the full tracker to log cycles and get a precise ovulation window estimate."}</p>
        <Link href={`/${locale}/maternity/tracker`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 20, background: "#5FD9B3", color: "#1E332E", fontWeight: 760, textDecoration: "none", border: "1px solid #E8EDEE", inlineSize: "fit-content" }}><Activity size={16} aria-hidden="true" />{ar ? "فتح المتتبع الكامل" : "Open full tracker"}</Link>
      </section>
    </main>
  );
}
