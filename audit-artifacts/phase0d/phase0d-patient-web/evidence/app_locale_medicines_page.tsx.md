# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicines/page.tsx`
- **Member SHA-256:** `9791aadc7b7bb46bccc524f4ced9676679f47aa6e82cfdb74549bcce5c319b11`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `12: type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };`
- `14: export default async function MedicinesPage({ params, searchParams }: Props) {`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `28: return <main className={`main ${styles.page}`}>`
- `41: <button className={`button button-primary ${styles.submit}`} type="submit"><Search size={17} aria-hidden="true" />{t("search")}</button>`
- `44: {medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}>`
### backend_consumers_or_contracts
- `4: import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";`
- `5: import { getPatientMedicines } from "@/lib/api/medicines-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `20: const token = await requirePatientAccess(locale);`
- `21: const response = await getPatientMedicines(token, search);`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (response.status === 403 || response.status === 404) notFound();`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `43: {medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>`
### payment_insurance_relevance
- `44: {medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}>`
- `45: <span className={styles.cardTop}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><ArrowUpLeft className={styles.openIcon} size={17} aria-hidden="true" /></span>`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailabl`
- `26: const medicines = extractMedicineRows(await response.json().catch(() => null));`
- `43: {medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
