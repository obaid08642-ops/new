import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractFamilyMembers } from "@/lib/api/family";
import { parseFamilyGroup } from "@/lib/api/family-group";
import { getPatientFamilyGroup } from "@/lib/api/family-group-server";
import { getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorFamily } from "@/components-next/vector-illustrations";
import { CalendarDays, ShieldCheck, UsersRound } from "lucide-react";
import styles from "./family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Family");
  let members: any[] = [];
  let group: any = null;
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const [response, groupResponse] = await Promise.all([getPatientFamilyMembers(token), getPatientFamilyGroup(token)]);
      if (response && response.ok) {
        members = extractFamilyMembers(await response.json().catch(() => null));
      }
      if (groupResponse && groupResponse.ok) {
        group = parseFamilyGroup(await groupResponse.json().catch(() => null));
      }
    }
  } catch {}
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{group?.name || t("title")}</h1><p>{t("membersCount", { count: group?.memberCount ?? members.length })}</p>
      </div>
      <div className={styles.introVector}><VectorFamily size={80} /></div>
    </section>
    {members.length === 0 ? <section className={styles.state}><UsersRound size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <Link className={styles.card} key={member.id} href={`/${locale}/family/${familyMemberRef(member.id)}`}>
      <span className={styles.cardIcon}><UsersRound size={19} aria-hidden="true" /></span>
      <div className={styles.cardBody}>
        <strong className={styles.member}>{member.displayName || t("member")}</strong>
        <span className={styles.role}>{member.role === "owner" ? t("owner") : t("memberRole")}{member.relation ? ` · ${member.relation}` : ""}</span>
        {member.joinedAt ? <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(member.joinedAt))}</span> : null}
      </div>
    </Link>)}</section>}
    <Link className={styles.notice} href={`/${locale}/family/calendar`}><CalendarDays size={15} aria-hidden="true" /> {locale === "ar" || locale === "ur" ? "فتح تقويم العائلة" : "Open family calendar"}</Link>
  </main>;
}
