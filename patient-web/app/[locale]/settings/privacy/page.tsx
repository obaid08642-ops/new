import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPatientPrivacySettings, getPatientStorage } from "@/lib/api/settings-server";
import { parseStorageSummary } from "@/lib/api/settings";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { HealthTabs } from "@/components-next/health/health-kit";
import { DataExport, DeleteAccount } from "@/components-next/settings/data-rights";
import { SwitchList, type SwitchRow } from "@/components-next/settings/switch-list";
import { FlushCard } from "@/components-next/settings/settings-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = ["privacy", "data", "delete"] as const;
type Tab = (typeof TABS)[number];

const PRIVACY_KEYS = ["location", "analytics", "shareData", "marketing", "thirdParty"] as const;
type PrivacyKey = (typeof PRIVACY_KEYS)[number];
const DEFAULTS: Record<PrivacyKey, boolean> = { shareData: false, analytics: true, location: true, marketing: false, thirdParty: false };

function extract(payload: unknown): Record<PrivacyKey, boolean> {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const src = (root && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root) || {};
  const pick = (key: PrivacyKey) => (typeof src[key] === "boolean" ? (src[key] as boolean) : DEFAULTS[key]);
  return { shareData: pick("shareData"), analytics: pick("analytics"), location: pick("location"), marketing: pick("marketing"), thirdParty: pick("thirdParty") };
}

/**
 * `/settings/privacy` (merge map section 3): three tabs, `?tab=privacy|data|delete`. Privacy is the five switches
 * (/users/me/privacy-settings), My data is the storage summary (/users/me/storage) and the PDPL export, Delete account is the
 * password-confirmed erasure. `/settings/data` redirects to `?tab=data`.
 */
export default async function SettingsPrivacyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.find((item) => item === rawTab) ?? "privacy";
  const t = await getTranslations("SettingsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const base = `/${locale}/settings/privacy`;
  const frame = (body: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("privacyTitle")} backHref={`/${locale}/settings`}>
      <HealthTabs label={t("privacyTabs")} base={base} active={tab} options={[
        { value: "privacy", label: t("tabPrivacy") }, { value: "data", label: t("tabData") }, { value: "delete", label: t("tabDelete") },
      ]} />
      {body}
    </ConsultPage>
  );
  const failed = frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  if (tab === "delete") {
    return frame(<SectionCard id="delete"><DeleteAccount locale={locale} /></SectionCard>);
  }
  if (tab === "data") return frame(await dataTab(locale, token, failed, t));

  const response = await getPatientPrivacySettings(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;
  const initial = extract(await response.json().catch(() => null));
  const rows: SwitchRow[] = PRIVACY_KEYS.map((key) => ({ id: key, key, label: t(`pv.${key}`), sub: t(`pv.${key}Sub`), value: initial[key] }));
  return frame(
    <>
      <p className={forms.body}>{t("privacyIntro")}</p>
      <SwitchList kind="privacy" label={t("tabPrivacy")} rows={rows} />
    </>,
  );
}

async function dataTab(locale: Locale, token: string, failed: React.ReactNode, t: Awaited<ReturnType<typeof getTranslations>>) {
  const response = await getPatientStorage(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;
  const storage = parseStorageSummary(await response.json().catch(() => null));
  return (
    <>
      <section className={styles.section} aria-labelledby="storage">
        <h2 id="storage" className={rx.srOnly}>{t("storageTitle")}</h2>
        <FlushCard label={t("storageTitle")}>
          <div className={styles.itemRow}>
            <span className={styles.itemText}>
              <span className={styles.itemTitle}>{t("storageTitle")}</span>
              <span className={styles.itemSub}>{storage.used && storage.total ? <bdi>{storage.used} / {storage.total}</bdi> : t("notAvailable")}</span>
            </span>
          </div>
          {storage.items.map((item) => (
            <div className={styles.itemRow} key={item.label}>
              <span className={styles.itemText}><span className={styles.itemTitle} dir="auto">{item.label}</span></span>
              <span className={styles.itemEnd}><bdi>{item.value} · {item.percent}%</bdi></span>
            </div>
          ))}
          {storage.items.length === 0 ? <div className={styles.itemRow}><span className={styles.itemSub}>{t("storageEmpty")}</span></div> : null}
        </FlushCard>
      </section>
      <SectionCard id="export" title={t("exportTitle")}><DataExport /></SectionCard>
      <ButtonLink href={`/${locale}/privacy`} label={t("policyLink")} variant="outline" fullWidth />
    </>
  );
}
