# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/page.tsx`
- **Member SHA-256:** `3a0fc2d03e52b58d35a8947143e2ca268560709a3cb0e97a3241270648a9383a`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { extractHomeCareBookings } from "@/lib/api/home-care";`
- `5: import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";`
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function HomeCarePage({ params }: Props) {`
- `20: const response = await getPatientHomeCareBookings(token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></ma`
- `24: const bookings = extractHomeCareBookings(await response.json().catch(() => null));`
- `25: const serviceName = (booking: typeof bookings[number]) => locale === "ar" ? booking.serviceNameAr || booking.serviceNameEn || t("serviceUnavailable") : booking.serviceNameEn || booking.serviceNameAr || t("serviceUnavailable");`
- `26: return <main className={`main ${styles.page}`}><section className={styles.intro}>`
- `33: <Link href={`/${locale}/home-care/services`} className={styles.notice}>{t("browseServices")}</Link>`
- `34: {bookings.length === 0 ? <section className={styles.state}><HousePlus size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{bookings.map((booking) => <article className={sty`
### backend_consumers_or_contracts
- `4: import { extractHomeCareBookings } from "@/lib/api/home-care";`
- `5: import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `10: import styles from "./home-care.module.css";`
- `33: <Link href={`/${locale}/home-care/services`} className={styles.notice}>{t("browseServices")}</Link>`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await getPatientHomeCareBookings(token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></ma`
- `40: {booking.sessionsCount ? <span className={styles.detail}>{t("sessions", { count: booking.sessionsCount })}</span> : null}`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></ma`
- `34: {bookings.length === 0 ? <section className={styles.state}><HousePlus size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{bookings.map((booking) => <article className={sty`
- `38: <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>`
### payment_insurance_relevance
- `34: {bookings.length === 0 ? <section className={styles.state}><HousePlus size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{bookings.map((booking) => <article className={sty`
- `35: <span className={styles.cardIcon}><HousePlus size={19} aria-hidden="true" /></span>`
- `36: <div className={styles.cardBody}>`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></ma`
- `24: const bookings = extractHomeCareBookings(await response.json().catch(() => null));`
- `34: {bookings.length === 0 ? <section className={styles.state}><HousePlus size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{bookings.map((booking) => <article className={sty`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
