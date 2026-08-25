# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/page.tsx`
- **Member SHA-256:** `7a25927267f37ca087b307ce07d740c1281a62ec708d10793fee40da3d462aea`
- **Line count:** 50
- **Read range:** `1-50`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `35: export default async function HealthPage({ params }: Props) {`
- `40: const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `44: if (response.status === 401) redirect(`/${locale}/login`);`
- `49: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Ac`
### backend_consumers_or_contracts
- `6: import { extractVitalSummary } from "@/lib/api/vitals";`
- `7: import { getPatientVitalSummary } from "@/lib/api/vitals-server";`
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
- `40: const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `41: const token = await requirePatientAccess(locale);`
- `43: try { response = await getPatientVitalSummary(token); } catch { return unavailable; }`
- `44: if (response.status === 401) redirect(`/${locale}/login`);`
### state_transitions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `40: const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `44: if (response.status === 401) redirect(`/${locale}/login`);`
- `45: if (response.status === 403 || response.status === 404) notFound();`
- `49: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Ac`
### payment_insurance_relevance
- `49: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Ac`
### error_empty_loading_retry_cancel
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `40: const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `43: try { response = await getPatientVitalSummary(token); } catch { return unavailable; }`
- `47: const vitals = extractVitalSummary(await response.json().catch(() => null));`
- `49: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Ac`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
