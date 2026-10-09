import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Facts, Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { RetryButton } from "@/components-next/retry-button";
import { AccountSummary, profileIdentity } from "@/components-next/account/account-summary";
import { SignOutAction } from "@/components-next/account/sign-out-action";
import { NavRows } from "@/components-next/settings/settings-kit";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }> };
type Domain = { id: string; title: string; fields: ProfileField[]; state: ProfileDomainState };

async function resolveDomain(response: Response, acceptedKeys: string[]): Promise<Pick<Domain, "fields" | "state">> {
  if (!response.ok) return { fields: [], state: profileDomainState(response.status, 0) };
  // the account record names the patient `full_name`; the field labels know it as `fullName`
  const fields = readProfileFields(extractRecord(await response.json().catch(() => null)), acceptedKeys).map((field) => (field.key === "full_name" ? { ...field, key: "fullName" } : field));
  return { fields, state: profileDomainState(response.status, fields.length) };
}

/**
 * `/profile` (canvas/Account): the account head, the three shortcuts (orders, appointments, points), the rows to the
 * account's other screens and the details the server holds (identity, medical summary, insurance), each with its own state.
 * Editing the details is the medical profile screen (`/health/profile`).
 */
export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const a = await getTranslations("AccountWeb");
  const token = await requirePatientAccess(locale);
  const [profileResponse, medicalResponse, insuranceResponse] = await Promise.all([
    callPatientApi("/auth/me", {}, token),
    callPatientApi("/medical-profile", {}, token),
    callPatientApi("/users/me/insurance", {}, token),
  ]);
  if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);
  const [identity, medical, insurance] = await Promise.all([
    resolveDomain(profileResponse, ["fullName", "full_name", "name", "email", "phone", "mobile", "dateOfBirth"]),
    resolveDomain(medicalResponse, ["bloodType", "height", "weight", "gender", "is_smoker", "drinks_alcohol", "is_pregnant", "is_breastfeeding"]),
    resolveDomain(insuranceResponse, ["providerName", "companyName", "status"]),
  ]);
  const domains: Domain[] = [
    { id: "identity", title: t("identity"), ...identity },
    { id: "medical", title: t("medical"), ...medical },
    { id: "insurance", title: t("insurance"), ...insurance },
  ];
  const stateMessage = (state: ProfileDomainState) => state === "empty" ? t("empty") : state === "forbidden" ? t("forbidden") : t("unavailable");
  const displayFieldValue = (field: ProfileField): string | null => {
    if (typeof field.value === "boolean") return t(field.value ? "yes" : "no");
    if (field.key === "gender") return field.value === "male" || field.value === "female" ? t(`gender.${field.value}`) : null;
    return String(field.value);
  };
  const head = profileIdentity(identity.state === "available" ? extractFieldsRecord(identity.fields) : null);
  const insurer = insurance.fields.find((field) => field.key === "providerName" || field.key === "companyName");
  const base = `/${locale}`;
  const tiles = [
    { href: `${base}/orders`, icon: "package", tone: "coral", label: a("tileOrders") },
    { href: `${base}/appointments`, icon: "calendar-dots", tone: "blue", label: a("tileAppointments") },
    { href: `${base}/loyalty`, icon: "star", tone: "amber", label: a("tilePoints") },
  ] as const;

  return (
    <ConsultPage locale={locale} title={a("profileTitle")} backHref={base}>
      <AccountSummary
        label={a("profileTitle")}
        name={head.name || a("accountFallback")}
        lines={head.lines}
        action={<ButtonLink href={`${base}/health/profile`} label={a("edit")} variant="outline" size="sm" />}
      />
      <ul className={styles.tiles} aria-label={a("shortcuts")}>
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link href={tile.href} className={styles.tile}>
              <FIcon icon={tile.icon} tone={tile.tone} size={40} />
              <span className={styles.tileLabel}>{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <NavRows
        locale={locale}
        label={a("accountRows")}
        rows={[
          { href: `${base}/health/profile`, icon: "heartbeat", tone: "coral", title: a("rowHealth") },
          { href: `${base}/profile/addresses`, icon: "map-pin", tone: "coral", title: a("rowAddresses") },
          { href: `${base}/family`, icon: "users-three", tone: "peach", title: a("rowFamily") },
          { href: `${base}/insurance`, icon: "shield-check", tone: "teal", title: t("insurance"), sub: insurer ? <bdi>{String(insurer.value)}</bdi> : undefined },
          { href: `${base}/prescriptions`, icon: "prescription", tone: "violet", title: a("rowPrescriptions") },
        ]}
      />
      <NavRows
        locale={locale}
        label={a("settingsRows")}
        rows={[
          { href: `${base}/settings`, icon: "gear", tone: "ink", title: a("rowSettings"), sub: a("rowSettingsSub") },
          { href: `${base}/settings/help`, icon: "headset", tone: "mint", title: a("rowSupport") },
          { href: `${base}/settings/privacy`, icon: "key", tone: "violet", title: a("rowPrivacy") },
        ]}
      />
      {domains.map((domain) => {
        const rows = domain.fields.flatMap((field) => {
          const value = displayFieldValue(field);
          return value === null ? [] : [{ label: t(`fields.${field.key}`), value: <bdi>{value}</bdi> }];
        });
        return (
          <SectionCard key={domain.id} id={`domain-${domain.id}`} title={domain.title}>
            {domain.state === "available" ? <Facts rows={rows} label={domain.title} /> : (
              <div role={domain.state === "error" ? "alert" : undefined}>
                <Notice warn={domain.state === "error"}>{stateMessage(domain.state)}</Notice>
                {domain.state === "error" ? <RetryButton /> : null}
              </div>
            )}
          </SectionCard>
        );
      })}
      <SignOutAction locale={locale} />
    </ConsultPage>
  );
}

function extractFieldsRecord(fields: ProfileField[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.key, field.value]));
}
