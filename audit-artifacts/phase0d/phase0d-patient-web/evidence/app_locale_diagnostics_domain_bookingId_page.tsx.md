# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx`
- **Member SHA-256:** `a31a1a0ab65c00d86242f96d1816948cff4aeca754f208e852ede28ef4f1c815`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { extractDiagnosticBooking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";`
- `5: import { getDiagnosticBooking } from "@/lib/api/diagnostics-server";`
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `12: type Props = { params: Promise<{ locale: string; domain: string; bookingId: string }> };`
- `14: export default async function DiagnosticDetailPage({ params }: Props) {`
- `15: const { locale, domain: rawDomain, bookingId } = await params;`
- `17: if (!isLocale(locale) || !domain || !parseDiagnosticBookingId(bookingId).success) notFound();`
- `21: const response = await getDiagnosticBooking(token, domain, bookingId);`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section><`
- `25: const booking = extractDiagnosticBooking(await response.json().catch(() => null));`
- `26: if (!booking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
### backend_consumers_or_contracts
- `4: import { extractDiagnosticBooking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";`
- `5: import { getDiagnosticBooking } from "@/lib/api/diagnostics-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `20: const token = await requirePatientAccess(locale);`
- `21: const response = await getDiagnosticBooking(token, domain, bookingId);`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section><`
- `26: if (!booking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `17: if (!isLocale(locale) || !domain || !parseDiagnosticBookingId(bookingId).success) notFound();`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (response.status === 403 || response.status === 404) notFound();`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section><`
- `26: if (!booking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
- `29: const status = booking.state || t("statusUnavailable");`
- `32: <section className={styles.hero}><div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{label}</h1><span className={styles.status}>{status}</span></div><span classNa`
- `34: <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section><`
- `25: const booking = extractDiagnosticBooking(await response.json().catch(() => null));`
- `26: if (!booking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
