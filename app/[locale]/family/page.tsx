import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractFamilyMembers } from "@/lib/api/family";
import { getPatientFamilyMembers } from "@/lib/api/family-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const members = extractFamilyMembers(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{members.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="family-grid" aria-label={t("title")}>{members.map((member) => <article className="family-card" key={member.id}><strong>{t("member")}</strong><span>{member.role === "owner" ? t("owner") : t("memberRole")}</span>{member.joinedAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(member.joinedAt))}</span> : null}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
