# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/notifications/page.tsx`
- **Member SHA-256:** `6ba87756f352753d95ec3c78a682d25658daff4fbd495d7cfd7f19ef27330379`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function NotificationsPage({ params }: Props) {`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `25: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} hr`
### backend_consumers_or_contracts
- `5: import { extractPatientNotifications } from "@/lib/api/notifications";`
- `6: import { getPatientNotifications } from "@/lib/api/notifications-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `10: import styles from "./notifications.module.css";`
- `25: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} hr`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await getPatientNotifications(token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `25: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} hr`
### payment_insurance_relevance
- `25: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} hr`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `24: const notifications = extractPatientNotifications(await response.json().catch(() => null));`
- `25: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} hr`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
