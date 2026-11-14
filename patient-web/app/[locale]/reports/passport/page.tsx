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
import { PassportQr } from "@/components-next/health/passport-qr";
import { passportQrText } from "@/lib/health/qr";
import styles from "@/components-next/consult/consult.module.css";
import { TEAL } from "@/lib/health/view";

type Props = { params: Promise<{ locale: string }> };

type PassportToken = { token: string; format: string; version: number; expiresAt: string | null };

const tokenOf = (payload: unknown): PassportToken | null => {
  const outer = payload && typeof payload === "object" ? (payload as { data?: unknown }) : null;
  const root = (outer?.data && typeof outer.data === "object" ? outer.data : payload) as { token?: unknown; format?: unknown; version?: unknown; expires_at?: unknown } | null;
  if (!root || typeof root.token !== "string" || !root.token) return null;
  return {
    token: root.token,
    format: typeof root.format === "string" ? root.format : "nabd_health_passport",
    version: typeof root.version === "number" ? root.version : 2,
    expiresAt: typeof root.expires_at === "string" ? root.expires_at : null,
  };
};

/**
 * The health ID card (merge map, section 1: stays a detail screen, linked from the profile and the hub): the patient's name and
 * basics (GET /medical-profile) and the QR code a provider scans (GET /medical-profile/passport-token: a short-lived token, never medical
 * data; the same QR text as the patient app), with a button that copies the same text.
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
  const back = `/${locale}/health/profile?tab=basics`;
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
  const qrText = passportToken ? passportQrText(passportToken.format, passportToken.version, passportToken.token) : "";
  const expires = passportToken?.expiresAt ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(passportToken.expiresAt)) : null;
  const name = typeof root?.full_name === "string" ? root.full_name : typeof root?.name === "string" ? root.name : undefined;

  return (
    <ConsultPage locale={locale} title={t("secHealthId")} backHref={back}>
      <Hero icon="identification-card" tone="blue" title={name ?? t("secHealthId")} sub={basics.bloodType ? t("idBlood", { type: basics.bloodType }) : undefined} />
      {passportToken ? (
        <SectionCard id="passport-code" title={t("idCodeTitle")}>
          <p className={`${styles.body} ${styles.muted}`}>{t("idCodeBody")}</p>
          <PassportQr text={qrText} label={t("idQrLabel")} />
          {expires ? <p className={`${styles.body} ${styles.muted}`}>{t("idValidUntil", { time: expires })}</p> : null}
          <CopyTextButton text={qrText} />
        </SectionCard>
      ) : (
        <div role="alert"><Notice warn>{t("idCodeFailed")}</Notice></div>
      )}
      {basics.heightCm !== undefined || basics.weightKg !== undefined ? (
        <SectionCard id="passport-basics" title={t("secBasics")}>
          <Facts rows={[
            ...(basics.heightCm !== undefined ? [{ label: t("basicsHeight"), value: <bdi>{basics.heightCm}</bdi>, icon: "user" as const, tone: "blue" as const }] : []),
            ...(basics.weightKg !== undefined ? [{ label: t("basicsWeight"), value: <bdi>{basics.weightKg}</bdi>, icon: "scales" as const, tone: TEAL }] : []),
          ]} />
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
