# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicine-catalog/page.tsx`
- **Member SHA-256:** `3eb6ab43642c6bf97f25be65f7edad3a9403dd3671aefd10c6256340cf9e0be6`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };`
- `32: export default async function PublicMedicineCatalogPage({ params, searchParams }: Props) {`
- `39: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{`
- `44: return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><`
### backend_consumers_or_contracts
- `4: import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";`
- `5: import { getPublicMedicines } from "@/lib/api/public-medicines-server";`
### auth_ownership
- `39: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `39: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{`
- `44: return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><`
### payment_insurance_relevance
- `44: return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `39: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{`
- `40: const medicines = extractMedicineRows(await response.json().catch(() => null));`
- `44: return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
