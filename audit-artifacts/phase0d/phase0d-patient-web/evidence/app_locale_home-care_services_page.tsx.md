# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/services/page.tsx`
- **Member SHA-256:** `f89f85c8d5f2b8d2e27d1c013adc3306b71cac2bc73bd3c731c9e59b04d4f672`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function HomeCareServicesPage({ params, searchParams }: Props) {`
- `18: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`
### backend_consumers_or_contracts
- `5: import { extractHomeCareServices } from "@/lib/api/home-care-services";`
- `6: import { getPublicHomeCareServices } from "@/lib/api/home-care-services-server";`
- `18: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`
### auth_ownership
- `18: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`
### state_transitions
- `18: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`
### payment_insurance_relevance
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`
### error_empty_loading_retry_cancel
- `18: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`
- `19: const services = extractHomeCareServices(await response.json().catch(() => null));`
- `22: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIc`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
