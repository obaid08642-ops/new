# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/orders/[orderId]/tracking/page.tsx`
- **Member SHA-256:** `36151e2f5485cb3bbb5c4eb3075e53c8fdc43ef042fe6dee444d338e07eb824b`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function OrderTrackingPage({ params }: Props) {`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section>`
- `27: return <main className={`main ${styles.page}`}>`
- `28: <Link className={styles.back} href={`/${locale}/orders/${orderId}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
### backend_consumers_or_contracts
- `5: import { callPatientApi } from "@/lib/api/upstream";`
- `6: import { extractOrderTracking, parseOrderId } from "@/lib/api/orders";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `20: const response = await callPatientApi(`/orders/${orderId}/tracking`, {}, token);`
- `28: <Link className={styles.back} href={`/${locale}/orders/${orderId}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await callPatientApi(`/orders/${orderId}/tracking`, {}, token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section>`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `16: if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section>`
- `26: const status = tracking.status || t("statusUnavailable");`
- `30: <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><span className={styles.status}>{status}</span></div>`
- `35: <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>`
### payment_insurance_relevance
- `40: {tracking.total !== undefined ? <div className={styles.item}><dt>{t("total")}</dt><dd>{tracking.total} {tracking.currency || ""}</dd></div> : null}`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `24: const tracking = extractOrderTracking(await response.json().catch(() => null));`
- `25: if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
