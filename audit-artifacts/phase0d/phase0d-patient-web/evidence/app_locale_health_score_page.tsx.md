# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/score/page.tsx`
- **Member SHA-256:** `01b68a1605e04c22a592aac9978c3f78435410854275fcf1e59aac7fc21a3824`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function HealthScorePage({ params }: Props) {`
- `15: if (response.status === 401) redirect(`/${locale}/login`); if (response.status === 403 || response.status === 404) notFound();`
- `19: return <main className="main"><Link className={styles.back} href={`/${locale}/health`}><ArrowLeft size={16} aria-hidden="true" />{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} ar`
### backend_consumers_or_contracts
- `5: import { getPatientHealthScore } from "@/lib/api/vitals-server";`
- `6: import { parseHealthScore } from "@/lib/api/health-score";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `14: const t = await getTranslations("Health"); const token = await requirePatientAccess(locale); const response = await getPatientHealthScore(token);`
- `15: if (response.status === 401) redirect(`/${locale}/login`); if (response.status === 403 || response.status === 404) notFound();`
- `16: if (!response.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `18: if (!score) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
### state_transitions
- `15: if (response.status === 401) redirect(`/${locale}/login`); if (response.status === 403 || response.status === 404) notFound();`
- `16: if (!response.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `18: if (!score) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `19: return <main className="main"><Link className={styles.back} href={`/${locale}/health`}><ArrowLeft size={16} aria-hidden="true" />{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} ar`
### payment_insurance_relevance
- `19: return <main className="main"><Link className={styles.back} href={`/${locale}/health`}><ArrowLeft size={16} aria-hidden="true" />{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} ar`
### error_empty_loading_retry_cancel
- `17: const score = parseHealthScore(await response.json().catch(() => null));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
