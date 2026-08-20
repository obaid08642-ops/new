import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }> };
type Domain = { title: string; fields: ProfileField[]; state: ProfileDomainState };

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
    resolveDomain(insuranceResponse, ["providerName", "companyName", "policyNumber", "memberId", "status"])
  ]);
  const domains: Domain[] = [{ title: t("identity"), ...identity }, { title: t("medical"), ...medical }, { title: t("insurance"), ...insurance }];
  const stateMessage = (state: ProfileDomainState) => state === "empty" ? t("empty") : state === "forbidden" ? t("forbidden") : t("unavailable");
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><p className="profile-intro">{t("body")}</p><div className="profile-grid">{domains.map((domain) => <section className="status-card" key={domain.title}><h2>{domain.title}</h2>{domain.state === "available" ? <dl className="order-detail">{domain.fields.map((field) => <div key={field.key}><dt>{t(`fields.${field.key}`)}</dt><dd>{typeof field.value === "boolean" ? t(field.value ? "yes" : "no") : field.key === "gender" && (field.value === "male" || field.value === "female") ? t(`gender.${field.value}`) : String(field.value)}</dd></div>)}</dl> : <>{<p role={domain.state === "error" ? "alert" : undefined}>{stateMessage(domain.state)}</p>}{domain.state === "error" ? <RetryButton /> : null}</>}</section>)}</div></main>;
}
