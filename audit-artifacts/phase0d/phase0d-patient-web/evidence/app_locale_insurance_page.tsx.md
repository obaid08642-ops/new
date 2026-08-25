# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/insurance/page.tsx`
- **Member SHA-256:** `e6db9e732ddfab6dabf12e1e5b5dcef00bd9252fb9d5b9ae1757ab310ddc7ab6`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: export default async function InsurancePage({ params }: Props) {`
- `25: if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 401)) redirect(`/${locale}/login`);`
### backend_consumers_or_contracts
- `4: import { getPatientClaims } from "@/lib/api/claims-server";`
- `5: import { parseClaims } from "@/lib/api/claims";`
- `6: import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";`
- `7: import { parseInsuranceSummary } from "@/lib/api/insurance";`
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
- `10: import styles from "./insurance.module.css";`
### auth_ownership
- `8: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `21: getPatientInsurancePolicy(token),`
- `22: getPatientInsuranceBenefits(token),`
- `23: getPatientClaims(token),`
- `25: if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 401)) redirect(`/${locale}/login`);`
- `27: if (!policyResponse.ok || !benefitsResponse.ok || !claimsResponse.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `30: if (!summary) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
### state_transitions
- `25: if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 401)) redirect(`/${locale}/login`);`
- `26: if ([policyResponse, benefitsResponse, claimsResponse].some((r) => r.status === 403 || r.status === 404)) notFound();`
- `27: if (!policyResponse.ok || !benefitsResponse.ok || !claimsResponse.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `30: if (!summary) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `31: const statusLabel = (status?: string) => status ? t(`claimStatus.${status}` as "claimStatus.pending") : t("claimStatus.unknown");`
- `34: <section className={styles.grid}><div className={styles.card}><span>{t("policyStatus")}</span><strong>{summary.hasPolicy ? t("active") : t("none")}</strong></div>{summary.companyName ? <div className={styles.card}><span>{t("company")}</span`
- `36: {claims.length === 0 ? <div className={styles.state}><p>{t("claimsEmpty")}</p></div> : <div className={styles.claimsList}>{claims.map((claim) => <article className={styles.card} key={claim.id}><div className={styles.claimTop}><strong>{claim`
### payment_insurance_relevance
- `6: import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";`
- `7: import { parseInsuranceSummary } from "@/lib/api/insurance";`
- `10: import styles from "./insurance.module.css";`
- `14: export default async function InsurancePage({ params }: Props) {`
- `18: const t = await getTranslations("Insurance");`
- `21: getPatientInsurancePolicy(token),`
- `22: getPatientInsuranceBenefits(token),`
- `28: const summary = parseInsuranceSummary(await policyResponse.json().catch(() => null));`
- `34: <section className={styles.grid}><div className={styles.card}><span>{t("policyStatus")}</span><strong>{summary.hasPolicy ? t("active") : t("none")}</strong></div>{summary.companyName ? <div className={styles.card}><span>{t("company")}</span`
- `36: {claims.length === 0 ? <div className={styles.state}><p>{t("claimsEmpty")}</p></div> : <div className={styles.claimsList}>{claims.map((claim) => <article className={styles.card} key={claim.id}><div className={styles.claimTop}><strong>{claim`
### error_empty_loading_retry_cancel
- `28: const summary = parseInsuranceSummary(await policyResponse.json().catch(() => null));`
- `29: const claims = parseClaims(await claimsResponse.json().catch(() => null));`
- `31: const statusLabel = (status?: string) => status ? t(`claimStatus.${status}` as "claimStatus.pending") : t("claimStatus.unknown");`
- `36: {claims.length === 0 ? <div className={styles.state}><p>{t("claimsEmpty")}</p></div> : <div className={styles.claimsList}>{claims.map((claim) => <article className={styles.card} key={claim.id}><div className={styles.claimTop}><strong>{claim`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
