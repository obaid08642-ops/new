import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Database, LockKeyhole, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { getPatientPrivacySettings, getPatientSecuritySettings, getPatientSessions, getPatientStorage } from "@/lib/api/settings-server";
import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "@/lib/api/settings";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "./settings.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Settings");
  const token = await requirePatientAccess(locale);
  const [privacyResponse, securityResponse, storageResponse, sessionsResponse] = await Promise.all([
    getPatientPrivacySettings(token),
    getPatientSecuritySettings(token),
    getPatientStorage(token),
    getPatientSessions(token),
  ]);
  const responses = [privacyResponse, securityResponse, storageResponse, sessionsResponse];
  if (responses.some((response) => response.status === 401)) redirect(`/${locale}/login`);
  if (responses.some((response) => response.status === 403 || response.status === 404)) notFound();
  if (responses.some((response) => !response.ok)) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const privacy = parsePrivacySettings(await privacyResponse.json().catch(() => null));
  const security = parseSecuritySettings(await securityResponse.json().catch(() => null));
  const storage = parseStorageSummary(await storageResponse.json().catch(() => null));
  const sessions = parseSessions(await sessionsResponse.json().catch(() => null));
  const bool = (value?: boolean) => value === undefined ? t("notAvailable") : value ? t("enabled") : t("disabled");
  const visibleSessions = sessions.slice(0, 8);
  const hiddenSessions = Math.max(0, sessions.length - visibleSessions.length);
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></section>
    <section className={styles.grid}>
      <article className={styles.card}><span className={styles.icon}><ShieldCheck size={20} aria-hidden="true" /></span><div><h2>{t("privacyTitle")}</h2><p>{t("profileVisible")}</p><strong>{bool(privacy.profileVisible)}</strong><p>{t("dataSharing")}</p><strong>{bool(privacy.shareData)}</strong></div></article>
      <article className={styles.card}><span className={styles.icon}><LockKeyhole size={20} aria-hidden="true" /></span><div><h2>{t("securityTitle")}</h2><p>{t("biometric")}</p><strong>{bool(security.biometric)}</strong><p>{t("twoFactor")}</p><strong>{bool(security.twoFactor)}</strong></div></article>
      <article className={styles.card}><span className={styles.icon}><Database size={20} aria-hidden="true" /></span><div><h2>{t("storageTitle")}</h2><p>{storage.used && storage.total ? `${storage.used} / ${storage.total}` : t("notAvailable")}</p>{storage.items.length ? <ul>{storage.items.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value} · {item.percent}%</strong></li>)}</ul> : <p>{t("storageEmpty")}</p>}</div></article>
      <article className={styles.card}><span className={styles.icon}><MonitorSmartphone size={20} aria-hidden="true" /></span><div><h2>{t("sessionsTitle")}</h2>{sessions.length ? <><ul>{visibleSessions.map((session, index) => <li key={`${session.device ?? "unknown"}-${index}`}><span>{session.device || t("deviceUnknown")}</span><strong>{session.expiresInSeconds === undefined ? t("notAvailable") : t("expiresIn", { value: Math.ceil(session.expiresInSeconds / 86400) })}</strong></li>)}</ul>{hiddenSessions ? <p className={styles.sessionsSummary}>{t("sessionsSummary", { shown: visibleSessions.length, total: sessions.length })}</p> : null}</> : <p>{t("sessionsEmpty")}</p>}</div></article>
    </section>
    <p className={styles.boundary}>{t("readOnlyBoundary")}</p>
  </main>;
}
