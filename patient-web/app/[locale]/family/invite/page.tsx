import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UsersRound } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyInviteClient } from "@/components-next/family-invite-client";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyInvitePage({ params }: Props) {
  const { locale } = await params;
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
          <h1>{locale === "ar" ? "دعوة فرد للعائلة" : "Invite a family member"}</h1>
          <p>{locale === "ar" ? "يُنشأ كود الدعوة من الخادم فقط — لا توجد أكواد وهمية." : "Invite codes are issued by the server only."}</p>
        </div>
      </section>
      <FamilyInviteClient locale={locale} />
      <Link className={styles.notice} href={`/${locale}/family/join`}>{locale === "ar" ? "لديك كود؟ انضم من هنا" : "Have a code? Join here"}</Link>
    </main>
  );
}
