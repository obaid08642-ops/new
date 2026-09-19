import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyJoinForm } from "@/components-next/family-join-form";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string }> };

export default async function FamilyJoinPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Family");
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link className={styles.notice} href={`/${locale}/family`}>{locale === "ar" ? "العائلة" : "Family"}</Link>
      <section className={styles.intro} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
        <div className={styles.introText}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? "الانضمام لعائلة" : "Join a family"}</h1>
        </div>
        <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
      </section>
      <FamilyJoinForm locale={locale} initialCode={sp.code || ""} />
    </main>
  );
}
