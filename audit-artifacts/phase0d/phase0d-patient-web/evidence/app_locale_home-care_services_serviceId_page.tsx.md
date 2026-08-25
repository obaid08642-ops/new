# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/services/[serviceId]/page.tsx`
- **Member SHA-256:** `1e83c4bc3b8de9afd44f592838704b87ee96f70683dafdd2c71e9193e95e616d`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: export default async function HomeCareServicePage({ params }: Props) {`
- `15: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/h`
- `18: return <main className={`main ${styles.page}`}><Link href={`/${locale}/home-care/services`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon`
### backend_consumers_or_contracts
- `5: import { extractHomeCareService } from "@/lib/api/home-care-services";`
- `6: import { getPublicHomeCareService } from "@/lib/api/home-care-services-server";`
- `15: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/h`
- `18: return <main className={`main ${styles.page}`}><Link href={`/${locale}/home-care/services`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon`
### auth_ownership
- `15: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/h`
### state_transitions
- `14: if (!response || response.status === 404) notFound();`
- `15: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/h`
### payment_insurance_relevance
- `18: return <main className={`main ${styles.page}`}><Link href={`/${locale}/home-care/services`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon`
### error_empty_loading_retry_cancel
- `16: const service = extractHomeCareService(await response.json().catch(() => null)); if (!service) notFound();`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
