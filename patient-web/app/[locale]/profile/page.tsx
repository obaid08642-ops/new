import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { ArrowUpLeft, BadgeCheck, Bell, BookOpen, CalendarDays, CircleAlert, FileText, HeartPulse, Pill, Settings, ShieldCheck, ShoppingBag, UserRound, UsersRound } from "lucide-react";
import styles from "./profile.module.css";

type Props = { params: Promise<{ locale: string }> };
type Domain = { title: string; fields: ProfileField[]; state: ProfileDomainState; kind: "identity" | "medical" | "insurance" };

async function resolveDomain(response: Response, acceptedKeys: string[]): Promise<Pick<Domain, "fields" | "state">> {
  if (!response.ok) return { fields: [], state: profileDomainState(response.status, 0) };
  const fields = readProfileFields(extractRecord(await response.json().catch(() => null)), acceptedKeys);
  return { fields, state: profileDomainState(response.status, fields.length) };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const dashboardT = await getTranslations("Dashboard");
  const token = await requirePatientAccess(locale);
  const [profileResponse, medicalResponse, insuranceResponse] = await Promise.all([
    callPatientApi("/users/me/profile", {}, token),
    callPatientApi("/medical-profile", {}, token),
    callPatientApi("/users/me/insurance", {}, token)
  ]);
  if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);
  const [identity, medical, insurance] = await Promise.all([
    resolveDomain(profileResponse, ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]),
    resolveDomain(medicalResponse, ["bloodType", "height", "weight", "gender", "is_smoker", "drinks_alcohol", "is_pregnant", "is_breastfeeding"]),
    resolveDomain(insuranceResponse, ["providerName", "companyName", "status"])
  ]);
  const domains: Domain[] = [{ title: t("identity"), ...identity, kind: "identity" }, { title: t("medical"), ...medical, kind: "medical" }, { title: t("insurance"), ...insurance, kind: "insurance" }];
  const stateMessage = (state: ProfileDomainState) => state === "empty" ? t("empty") : state === "forbidden" ? t("forbidden") : t("unavailable");
  const domainVisual = { identity: { Icon: UserRound, accent: "#2E86FF" }, medical: { Icon: HeartPulse, accent: "#23B5CE" }, insurance: { Icon: ShieldCheck, accent: "#7A6BEA" } } as const;
  const quickActions = [
    { key: "health", href: `/${locale}/health`, Icon: HeartPulse, accent: "#E11D48" },
    { key: "appointments", href: `/${locale}/appointments`, Icon: CalendarDays, accent: "#0284C7" },
    { key: "orders", href: `/${locale}/orders`, Icon: ShoppingBag, accent: "#D97706" },
    { key: "prescriptions", href: `/${locale}/prescriptions`, Icon: FileText, accent: "#7A6BEA" },
    { key: "medicines", href: `/${locale}/medicines`, Icon: Pill, accent: "#16A34A" },
    { key: "family", href: `/${locale}/family`, Icon: UsersRound, accent: "#0D9488" },
    { key: "notifications", href: `/${locale}/notifications`, Icon: Bell, accent: "#64748B" },
    { key: "settings", href: `/${locale}/settings`, Icon: Settings, accent: "#475569" },
    { key: "articles", href: `/${locale}/articles`, Icon: BookOpen, accent: "#0F766E" },
  ] as const;
  const displayFieldValue = (field: ProfileField): string | null => {
    if (typeof field.value === "boolean") return t(field.value ? "yes" : "no");
    if (field.key === "gender") return field.value === "male" || field.value === "female" ? t(`gender.${field.value}`) : null;
    return String(field.value);
  };
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={styles.heroIcon}><UserRound size={27} aria-hidden="true" /></span></section><nav className={styles.quick} aria-label={dashboardT("title")}>{quickActions.map(({ key, href, Icon, accent }) => <Link className={styles.quickCard} href={href} key={key} style={{ "--quick-accent": accent } as React.CSSProperties}><span className={styles.quickIcon}><Icon size={19} aria-hidden="true" /></span><span className={styles.quickLabel}>{dashboardT(key)}</span><ArrowUpLeft className={styles.quickArrow} size={15} aria-hidden="true" /></Link>)}</nav><div className={styles.grid}>{domains.map((domain) => { const { Icon, accent } = domainVisual[domain.kind]; const isError = domain.state === "error"; const fields = domain.fields.flatMap((field) => { const value = displayFieldValue(field); return value === null ? [] : [{ field, value }]; }); return <section className={styles.domain} key={domain.title} style={{ "--domain-accent": accent } as React.CSSProperties}><div className={styles.domainHead}><span className={styles.domainIcon}><Icon size={20} aria-hidden="true" /></span><h2>{domain.title}</h2></div>{domain.state === "available" ? <dl className={styles.fields}>{fields.map(({ field, value }) => <div className={styles.field} key={field.key}><dt>{t(`fields.${field.key}`)}</dt><dd>{value}</dd></div>)}</dl> : <div className={styles.state}><span className={`${styles.stateIcon} ${isError ? styles.stateIconAlert : ""}`}>{isError ? <CircleAlert size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}</span><p className={isError ? styles.stateAlert : undefined} role={isError ? "alert" : undefined}>{stateMessage(domain.state)}</p>{isError ? <RetryButton /> : null}</div>}</section>; })}</div></main>;
}
