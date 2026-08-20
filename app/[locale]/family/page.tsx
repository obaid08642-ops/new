import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractFamilyMembers } from "@/lib/api/family";
import { getPatientFamilyMembers } from "@/lib/api/family-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, ShieldCheck, UsersRound } from "lucide-react";
import styles from "./family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Family");
  const token = await requirePatientAccess(locale);
  const response = await getPatientFamilyMembers(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><UsersRound size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const members = extractFamilyMembers(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.introIcon}><UsersRound size={27} aria-hidden="true" /></span>
    </section>
    {members.length === 0 ? <section className={styles.state}><UsersRound size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <article className={styles.card} key={member.id}>
      <span className={styles.cardIcon}><UsersRound size={19} aria-hidden="true" /></span>
      <div className={styles.cardBody}>
        <strong className={styles.member}>{t("member")}</strong>
        <span className={styles.role}>{member.role === "owner" ? t("owner") : t("memberRole")}</span>
        {member.joinedAt ? <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(member.joinedAt))}</span> : null}
      </div>
    </article>)}</section>}
    <p className={styles.notice}>{t("notice")}</p>
  </main>;
}
