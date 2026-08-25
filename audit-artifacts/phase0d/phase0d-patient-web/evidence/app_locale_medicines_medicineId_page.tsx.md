# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicines/[medicineId]/page.tsx`
- **Member SHA-256:** `fb1e417c5df26436443807f5d1687e107fdc0600ddb84597c1fec7ce66ab5500`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `40: export default async function MedicineDetailPage({ params }: Props) {`
- `47: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Pill size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></sect`
- `52: const schema = { "@context": "https://schema.org", "@type": "MedicalWebPage", name, url: canonical, inLanguage: locale, mainEntity: { "@type": "Thing", name } };`
- `60: return <main className={`main ${styles.page}`}><JsonLd data={schema} />`
- `61: <Link className={styles.back} href={`/${locale}/medicine-catalog`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
### backend_consumers_or_contracts
- `5: import { extractMedicineDetail, parseMedicineId } from "@/lib/api/medicines";`
- `6: import { getPublicMedicine } from "@/lib/api/public-medicines-server";`
### auth_ownership
- `47: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Pill size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></sect`
### state_transitions
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `18: if (!isLocale(locale) || !parseMedicineId(medicineId).success) return {};`
- `42: if (!isLocale(locale) || !parseMedicineId(medicineId).success) notFound();`
- `46: if (response?.status === 404) notFound();`
- `47: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Pill size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></sect`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `10: import { RetryButton } from "@/components-next/retry-button";`
- `20: const medicine = response?.ok ? extractMedicineDetail(await response.json().catch(() => null)) : null;`
- `47: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Pill size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></sect`
- `48: const medicine = extractMedicineDetail(await response.json().catch(() => null));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
