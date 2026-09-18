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
      <section className={styles.hero} style={{ borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div>
          <p className={styles.eyebrow}>{ar ? "الذكاء الاصطناعي" : "AI"}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "مترجم الوصفات" : "Prescription translator"}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere" }}>{ar ? "ارفع صورة الوصفة لقراءتها — حد أقصى 8MB." : "Upload a prescription image to read it — max 8MB."}</p>
        </div>
        <span className={styles.heroIcon}><VectorAI size={48} aria-hidden="true" /></span>
      </section>
      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <PrescriptionTranslatorClient locale={locale} />
      </div>
      <Link href={`/${locale}/ai`} style={{ display: "inline-flex", marginTop: 16, color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" }}>{ar ? "← العودة" : "← Back"}</Link>
    </main>
  );
}
