# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/orders/[orderId]/page.tsx`
- **Member SHA-256:** `1d90c3b4f7c7e3ca4ba89d8fea0c5c6d548a0751c804d47298cf99b7a31dd9bd`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function OrderDetailPage({ params }: Props) {`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!detail) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></`
- `28: return <main className={`main ${styles.page}`}>`
- `29: <Link className={styles.back} href={`/${locale}/orders`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
- `40: <Link className={styles.back} href={`/${locale}/orders/${orderId}/tracking`}>{t("open")}</Link>`
### backend_consumers_or_contracts
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `5: import { extractOrderDetail, parseOrderId } from "@/lib/api/orders";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `20: const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);`
- `29: <Link className={styles.back} href={`/${locale}/orders`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
- `40: <Link className={styles.back} href={`/${locale}/orders/${orderId}/tracking`}>{t("open")}</Link>`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!detail) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `16: if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!detail) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></`
- `26: const status = typeof detail.status === "string" ? detail.status : t("statusUnavailable");`
- `31: <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{reference}</h1><span className={styles.status}>{status}</span></div>`
- `36: <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `24: const detail = extractOrderDetail(await response.json().catch(() => null));`
- `25: if (!detail) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
