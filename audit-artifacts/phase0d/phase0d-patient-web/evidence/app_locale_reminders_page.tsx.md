# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/reminders/page.tsx`
- **Member SHA-256:** `41037ce2c21801e73671edbca6ed3ee4264ce0c00149892eb94baaedf78ee952`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function RemindersPage({ params }: Props) {`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavai`
- `27: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-h`
### backend_consumers_or_contracts
- `4: import { extractMedicationReminderSummaries } from "@/lib/api/reminders";`
- `5: import { getPatientMedicationReminders } from "@/lib/api/reminders-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `18: const token = await requirePatientAccess(locale);`
- `19: const response = await getPatientMedicationReminders(token);`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavai`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `21: if (response.status === 403 || response.status === 404) notFound();`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavai`
- `24: const doseRows = reminders.flatMap((reminder) => (reminder.todayDoses.length ? reminder.todayDoses : reminder.times.map((timeKey) => ({ timeKey, status: "pending" as const }))).map((dose) => ({ reminder, ...dose })));`
- `25: const nextDose = doseRows.filter((dose) => dose.status === "pending").sort((a, b) => a.timeKey.localeCompare(b.timeKey))[0];`
- `26: const takenDoses = doseRows.filter((dose) => dose.status === "taken").length;`
- `27: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-h`
### payment_insurance_relevance
- `27: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-h`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavai`
- `23: const reminders = extractMedicationReminderSummaries(await response.json().catch(() => null));`
- `24: const doseRows = reminders.flatMap((reminder) => (reminder.todayDoses.length ? reminder.todayDoses : reminder.times.map((timeKey) => ({ timeKey, status: "pending" as const }))).map((dose) => ({ reminder, ...dose })));`
- `25: const nextDose = doseRows.filter((dose) => dose.status === "pending").sort((a, b) => a.timeKey.localeCompare(b.timeKey))[0];`
- `27: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-h`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
