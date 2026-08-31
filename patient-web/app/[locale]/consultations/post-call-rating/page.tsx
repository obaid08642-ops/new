import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Star } from "lucide-react";
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
  return <main className={`main ${styles.page}`}>
    <section className={styles.card}>
      <h1><Star size={22} aria-hidden="true" />{t("title")}</h1>
      <p className={styles.sub}>{t("subtitle")}</p>
      <PostCallRatingForm locale={locale} appointmentId={appointmentId} labels={{
        comment: t("comment"), commentPh: t("commentPh"), submit: t("submit"),
        submitting: t("submitting"), thanks: t("thanks"), error: t("error"),
      }} />
    </section>
  </main>;
}
