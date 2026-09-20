import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Star } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { PostCallRatingForm } from "@/components-next/post-call-rating-form";
import styles from "./rating.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

export default async function PostCallRatingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const { appointmentId = "" } = await searchParams;
  const t = await getTranslations("PostCallRating");
  return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
    <section className={styles.card} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
      <h1 style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", overflowWrap: "anywhere" } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</span></h1>
      <p className={styles.sub} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p>
      <PostCallRatingForm locale={locale} appointmentId={appointmentId} labels={{
        comment: t("comment"), commentPh: t("commentPh"), submit: t("submit"),
        submitting: t("submitting"), thanks: t("thanks"), error: t("error"),
      }} />
    </section>
  </main>;
}
