# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/page.tsx`
- **Member SHA-256:** `6269a4a7fae430aca15dcd785f9a9ea10a3c1dafe6693ba3261a2d250dc8b8aa`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { extractDiagnosticBookings } from "@/lib/api/diagnostics";`
- `5: import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";`
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function DiagnosticsPage({ params }: Props) {`
- `20: const [labsResponse, radiologyResponse] = await Promise.all([getDiagnosticBookings(token, "labs"), getDiagnosticBookings(token, "radiology")]);`
- `21: if (labsResponse.status === 401 || radiologyResponse.status === 401) redirect(`/${locale}/login`);`
- `22: const toState = async (domain: "labs" | "radiology", response: Response) => ({ domain, response, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });`
- `24: return <main className={`main ${styles.page}`}>`
- `32: <div className={styles.domains}>{domains.map(({ domain, response, bookings }) => {`
- `36: {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length`
- `39: <strong className={styles.name}>{domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label")}</strong>`
- `40: <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>`
### backend_consumers_or_contracts
- `4: import { extractDiagnosticBookings } from "@/lib/api/diagnostics";`
- `5: import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const [labsResponse, radiologyResponse] = await Promise.all([getDiagnosticBookings(token, "labs"), getDiagnosticBookings(token, "radiology")]);`
- `21: if (labsResponse.status === 401 || radiologyResponse.status === 401) redirect(`/${locale}/login`);`
- `36: {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (labsResponse.status === 401 || radiologyResponse.status === 401) redirect(`/${locale}/login`);`
- `22: const toState = async (domain: "labs" | "radiology", response: Response) => ({ domain, response, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });`
- `23: const domains = await Promise.all([toState("labs", labsResponse), toState("radiology", radiologyResponse)]);`
- `36: {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length`
- `40: <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>`
- `41: {booking.scheduledAt ? <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</span> : null}{booking.ha`
### payment_insurance_relevance
- `36: {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length`
- `37: <span className={styles.cardIcon}><DomainIcon size={19} aria-hidden="true" /></span>`
- `38: <span className={styles.cardBody}>`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `22: const toState = async (domain: "labs" | "radiology", response: Response) => ({ domain, response, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });`
- `36: {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
