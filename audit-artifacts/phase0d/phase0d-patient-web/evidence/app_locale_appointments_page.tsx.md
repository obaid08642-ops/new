# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/appointments/page.tsx`
- **Member SHA-256:** `7b1a09373e4445d94dcc58467056cc4ca3601c7cc30266c4c24a4bc8b38a2792`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `21: export default async function AppointmentsPage({ params, searchParams }: Props) {`
- `29: if (response.status === 401) redirect(`/${locale}/login`);`
- `32: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("un`
- `37: return activeTab === "upcoming" ? ["confirmed", "pending"].includes(status ?? "") : ["completed", "cancelled"].includes(status ?? "");`
- `41: const statusStyle = (status?: string): CSSProperties => { const normalized = status?.toLowerCase(); if (normalized === "confirmed") return { "--status-color": "#1a9fb6", "--status-surface": "#def5f9" } as CSSProperties; if (normalized === "`
- `42: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`
### backend_consumers_or_contracts
- `6: import { extractAppointmentRows } from "@/lib/api/appointments";`
- `7: import { getPatientAppointments } from "@/lib/api/appointments-server";`
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
- `11: import styles from "./appointments.module.css";`
- `42: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`
### auth_ownership
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
- `27: const token = await requirePatientAccess(locale);`
- `28: const response = await getPatientAppointments(token);`
- `29: if (response.status === 401) redirect(`/${locale}/login`);`
- `32: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("un`
### state_transitions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `29: if (response.status === 401) redirect(`/${locale}/login`);`
- `30: if (response.status === 403 || response.status === 404) notFound();`
- `32: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("un`
- `36: const status = appointment.status?.toLowerCase();`
- `37: return activeTab === "upcoming" ? ["confirmed", "pending"].includes(status ?? "") : ["completed", "cancelled"].includes(status ?? "");`
- `41: const statusStyle = (status?: string): CSSProperties => { const normalized = status?.toLowerCase(); if (normalized === "confirmed") return { "--status-color": "#1a9fb6", "--status-surface": "#def5f9" } as CSSProperties; if (normalized === "`
- `42: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`
### payment_insurance_relevance
- `42: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`
### error_empty_loading_retry_cancel
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `32: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("un`
- `33: const appointments = extractAppointmentRows(await response.json().catch(() => null));`
- `37: return activeTab === "upcoming" ? ["confirmed", "pending"].includes(status ?? "") : ["completed", "cancelled"].includes(status ?? "");`
- `41: const statusStyle = (status?: string): CSSProperties => { const normalized = status?.toLowerCase(); if (normalized === "confirmed") return { "--status-color": "#1a9fb6", "--status-surface": "#def5f9" } as CSSProperties; if (normalized === "`
- `42: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
