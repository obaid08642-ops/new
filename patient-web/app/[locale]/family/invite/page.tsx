import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyInviteClient } from "@/components-next/family-invite-client";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyInvitePage({ params }: Props) {
  const { locale } = await params;
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
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? "دعوة فرد للعائلة" : "Invite a family member"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{locale === "ar" ? "يُنشأ كود الدعوة من الخادم فقط — لا توجد أكواد وهمية." : "Invite codes are issued by the server only."}</p>
        </div>
        <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
      </section>
      <FamilyInviteClient locale={locale} />
      <Link className={styles.notice} href={`/${locale}/family/join`}>{locale === "ar" ? "لديك كود؟ انضم من هنا" : "Have a code? Join here"}</Link>
    </main>
  );
}
