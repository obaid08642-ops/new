import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractFamilyMembers } from "@/lib/api/family";
import { parseFamilyGroup } from "@/lib/api/family-group";
import { getPatientFamilyGroup } from "@/lib/api/family-group-server";
import { getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { CreateFamilyCta } from "./create-family-cta";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "./family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Family");
  const token = await requirePatientAccess(locale);
  const [response, groupResponse] = await Promise.all([getPatientFamilyMembers(token), getPatientFamilyGroup(token)]);
  if (response.status === 401) redirect(`/${locale}/login`);
  // F70: no family yet → create-family CTA instead of a bare 404.
  if (response.status === 404) {
    return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.state} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <Icon name="users-round" size={25} />
        <h1>{t("noFamilyTitle")}</h1>
        <p>{t("noFamilyBody")}</p>
        <CreateFamilyCta locale={locale} label={t("createFamily")} doneLabel={t("familyCreated")} />
      </section>
    </main>;
  }
  if (response.status === 403) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Icon name="users-round" size={25} /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const members = extractFamilyMembers(await response.json().catch(() => null));
  const group = groupResponse.ok ? parseFamilyGroup(await groupResponse.json().catch(() => null)) : null;
   return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
    <section className={styles.intro} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
      <div className={styles.introText}>
        <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}><Icon name="shield-check" size={15} />{t("eyebrow")}</p>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{group?.name || t("title")}</h1><p style={{ overflowWrap: "anywhere" }}>{t("membersCount", { count: group?.memberCount ?? members.length })}</p>
      </div>
      <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
    </section>
     {members.length === 0 ? <section className={styles.state} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}><Icon name="users-round" size={25} /><p style={{ overflowWrap: "anywhere" }}>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <Link className={styles.card} key={member.id} href={`/${locale}/family/${familyMemberRef(member.id)}`} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as React.CSSProperties}>
      <span className={styles.cardIcon}><Icon name="users-round" size={19} /></span>
      <div className={styles.cardBody}>
        <strong className={styles.member}>{member.displayName || t("member")}</strong>
        <span className={styles.role}>{member.role === "owner" ? t("owner") : t("memberRole")}{member.relation ? ` · ${member.relation}` : ""}</span>
        {member.joinedAt ? <span className={styles.date}><Icon name="calendar-days" size={14} />{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(member.joinedAt))}</span> : null}
      </div>
    </Link>)}</section>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Link className={styles.notice} href={`/${locale}/family/invite`} style={{ background: "#5FD9B3", color: "#1E332E", borderColor: "#E8EDEE", borderRadius: 20 }}>{locale === "ar" ? "دعوة فرد جديد" : "Invite someone"}</Link>
      <Link className={styles.notice} href={`/${locale}/family/join`}>{locale === "ar" ? "الانضمام بكود دعوة" : "Join with a code"}</Link>
      <Link className={styles.notice} href={`/${locale}/family/permissions`}>{locale === "ar" ? "أذونات الأعضاء" : "Member permissions"}</Link>
      <Link className={styles.notice} href={`/${locale}/family/calendar`}><Icon name="calendar-days" size={15} /> {locale === "ar" || locale === "ur" ? "فتح تقويم العائلة" : "Open family calendar"}</Link>
    </div>
  </main>;
}
