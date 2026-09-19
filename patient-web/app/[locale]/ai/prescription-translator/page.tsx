import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorAI } from "@/components-next/vector-illustrations";
import { PrescriptionTranslatorClient } from "@/components-next/prescription-translator-client";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function PrescriptionTranslatorPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}>{ar ? "الذكاء الاصطناعي" : "AI"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "مترجم الوصفات" : "Prescription translator"}</h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "ارفع صورة الوصفة لقراءتها — حد أقصى 8MB." : "Upload a prescription image to read it — max 8MB."}</p>
        </div>
        <span className={styles.heroIcon} style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, border: "1px solid #E8EDEE", borderRadius: 16, background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><VectorAI size={48} aria-hidden="true" /></span>
      </section>
      <div className={styles.card} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <PrescriptionTranslatorClient locale={locale} />
      </div>
      <Link href={`/${locale}/ai`} style={{ display: "inline-flex", gap: 8, marginTop: 16, color: "#1E332E", fontWeight: 700, background: "#5FD9B3", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", textDecoration: "none", overflowWrap: "anywhere" }}>{ar ? "← العودة" : "← Back"}</Link>
    </main>
  );
}
