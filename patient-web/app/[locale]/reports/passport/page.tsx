import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { profileBasics, profileRoot } from "@/lib/health/profile";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { CopyTextButton } from "@/components-next/copy-text-button";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

const tokenOf = (payload: unknown): string | null => {
  const root = payload && typeof payload === "object" ? (payload as { token?: unknown; data?: { token?: unknown } }) : null;
  if (typeof root?.token === "string") return root.token;
  return typeof root?.data?.token === "string" ? root.data.token : null;
};

/**
 * The health ID card (merge map, section 1: stays a detail screen, linked from the profile and the hub): the patient's name and
 * basics (GET /medical-profile) and the share code a provider scans or types (GET /medical-profile/passport-token).
 */
export default async function HealthPassportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const [profileRes, tokenRes] = await Promise.all([
    callPatientApi("/medical-profile", {}, token).catch(() => null),
    callPatientApi("/medical-profile/passport-token", {}, token).catch(() => null),
  ]);
  if (profileRes?.status === 401 || tokenRes?.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/health/profile#healthid`;
  if (!profileRes?.ok && !tokenRes?.ok) {
    return (
      <ConsultPage locale={locale} title={t("secHealthId")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const root = profileRes?.ok ? profileRoot(await profileRes.json().catch(() => null)) : null;
  const basics = profileBasics(root);
  const passportToken = tokenRes?.ok ? tokenOf(await tokenRes.json().catch(() => null)) : null;
  const name = typeof root?.full_name === "string" ? root.full_name : typeof root?.name === "string" ? root.name : undefined;

  return (
    <ConsultPage locale={locale} title={t("secHealthId")} backHref={back}>
      <Hero icon="identification-card" tone="blue" title={name ?? t("secHealthId")} sub={basics.bloodType ? t("idBlood", { type: basics.bloodType }) : undefined} />
      {passportToken ? (
        <SectionCard id="passport-code" title={t("idCodeTitle")}>
          <p className={`${styles.body} ${styles.muted}`}>{t("idCodeBody")}</p>
          <p className={styles.codeText}>{passportToken}</p>
          <CopyTextButton text={passportToken} />
        </SectionCard>
      ) : (
        <div role="alert"><Notice warn>{t("idCodeFailed")}</Notice></div>
      )}
      {basics.heightCm !== undefined || basics.weightKg !== undefined ? (
        <SectionCard id="passport-basics" title={t("secBasics")}>
          <Facts rows={[
            ...(basics.heightCm !== undefined ? [{ label: t("basicsHeight"), value: <bdi>{basics.heightCm}</bdi>, icon: "user" as const, tone: "blue" as const }] : []),
            ...(basics.weightKg !== undefined ? [{ label: t("basicsWeight"), value: <bdi>{basics.weightKg}</bdi>, icon: "scales" as const, tone: "teal" as const }] : []),
          ]} />
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
