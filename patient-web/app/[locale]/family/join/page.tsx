import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UsersRound } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyJoinForm } from "@/components-next/family-join-form";
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
    <main className={`main ${styles.page}`}>
      <Link className={styles.notice} href={`/${locale}/family`}>{locale === "ar" ? "العائلة" : "Family"}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><UsersRound size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "الانضمام لعائلة" : "Join a family"}</h1>
        </div>
      </section>
      <FamilyJoinForm locale={locale} initialCode={sp.code || ""} />
    </main>
  );
}
