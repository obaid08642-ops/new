# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/settings/page.tsx`
- **Member SHA-256:** `aa3a2339987d213456cb564571fd38d6d2703865f769d3453dfc2ec9e2a5784b`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function SettingsPage({ params }: Props) {`
- `25: if (responses.some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `35: return <main className={`main ${styles.page}`}>`
### backend_consumers_or_contracts
- `4: import { getPatientPrivacySettings, getPatientSecuritySettings, getPatientSessions, getPatientStorage } from "@/lib/api/settings-server";`
- `5: import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "@/lib/api/settings";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `4: import { getPatientPrivacySettings, getPatientSecuritySettings, getPatientSessions, getPatientStorage } from "@/lib/api/settings-server";`
- `5: import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "@/lib/api/settings";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `17: const token = await requirePatientAccess(locale);`
- `18: const [privacyResponse, securityResponse, storageResponse, sessionsResponse] = await Promise.all([`
- `19: getPatientPrivacySettings(token),`
- `20: getPatientSecuritySettings(token),`
- `21: getPatientStorage(token),`
- `22: getPatientSessions(token),`
- `24: const responses = [privacyResponse, securityResponse, storageResponse, sessionsResponse];`
- `25: if (responses.some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `27: if (responses.some((response) => !response.ok)) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
### state_transitions
- `25: if (responses.some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `26: if (responses.some((response) => response.status === 403 || response.status === 404)) notFound();`
- `27: if (responses.some((response) => !response.ok)) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `40: <article className={styles.card}><span className={styles.icon}><Database size={20} aria-hidden="true" /></span><div><h2>{t("storageTitle")}</h2><p>{storage.used && storage.total ? `${storage.used} / ${storage.total}` : t("notAvailable")}</p`
- `41: <article className={styles.card}><span className={styles.icon}><MonitorSmartphone size={20} aria-hidden="true" /></span><div><h2>{t("sessionsTitle")}</h2>{sessions.length ? <><ul>{visibleSessions.map((session, index) => <li key={`${session.`
### payment_insurance_relevance
- `38: <article className={styles.card}><span className={styles.icon}><ShieldCheck size={20} aria-hidden="true" /></span><div><h2>{t("privacyTitle")}</h2><p>{t("profileVisible")}</p><strong>{bool(privacy.profileVisible)}</strong><p>{t("dataSharing`
- `39: <article className={styles.card}><span className={styles.icon}><LockKeyhole size={20} aria-hidden="true" /></span><div><h2>{t("securityTitle")}</h2><p>{t("biometric")}</p><strong>{bool(security.biometric)}</strong><p>{t("twoFactor")}</p><st`
- `40: <article className={styles.card}><span className={styles.icon}><Database size={20} aria-hidden="true" /></span><div><h2>{t("storageTitle")}</h2><p>{storage.used && storage.total ? `${storage.used} / ${storage.total}` : t("notAvailable")}</p`
- `41: <article className={styles.card}><span className={styles.icon}><MonitorSmartphone size={20} aria-hidden="true" /></span><div><h2>{t("sessionsTitle")}</h2>{sessions.length ? <><ul>{visibleSessions.map((session, index) => <li key={`${session.`
### error_empty_loading_retry_cancel
- `28: const privacy = parsePrivacySettings(await privacyResponse.json().catch(() => null));`
- `29: const security = parseSecuritySettings(await securityResponse.json().catch(() => null));`
- `30: const storage = parseStorageSummary(await storageResponse.json().catch(() => null));`
- `31: const sessions = parseSessions(await sessionsResponse.json().catch(() => null));`
- `40: <article className={styles.card}><span className={styles.icon}><Database size={20} aria-hidden="true" /></span><div><h2>{t("storageTitle")}</h2><p>{storage.used && storage.total ? `${storage.used} / ${storage.total}` : t("notAvailable")}</p`
- `41: <article className={styles.card}><span className={styles.icon}><MonitorSmartphone size={20} aria-hidden="true" /></span><div><h2>{t("sessionsTitle")}</h2>{sessions.length ? <><ul>{visibleSessions.map((session, index) => <li key={`${session.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
