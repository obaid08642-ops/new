# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/family/page.tsx`
- **Member SHA-256:** `fa83666c9890f4489e426a1c8bfe293e545b736082e2511be2eed97d51f7dfed`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `15: export default async function FamilyPage({ params }: Props) {`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><UsersRound size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></m`
- `27: return <main className={`main ${styles.page}`}>`
### backend_consumers_or_contracts
- `3: import { extractFamilyMembers } from "@/lib/api/family";`
- `4: import { parseFamilyGroup } from "@/lib/api/family-group";`
- `5: import { getPatientFamilyGroup } from "@/lib/api/family-group-server";`
- `6: import { getPatientFamilyMembers } from "@/lib/api/family-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `20: const token = await requirePatientAccess(locale);`
- `21: const [response, groupResponse] = await Promise.all([getPatientFamilyMembers(token), getPatientFamilyGroup(token)]);`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><UsersRound size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></m`
- `39: <span className={styles.role}>{member.role === "owner" ? t("owner") : t("memberRole")}{member.relation ? ` · ${member.relation}` : ""}</span>`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (response.status === 403 || response.status === 404) notFound();`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><UsersRound size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></m`
- `35: {members.length === 0 ? <section className={styles.state}><UsersRound size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <article className={style`
### payment_insurance_relevance
- `35: {members.length === 0 ? <section className={styles.state}><UsersRound size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <article className={style`
- `36: <span className={styles.cardIcon}><UsersRound size={19} aria-hidden="true" /></span>`
- `37: <div className={styles.cardBody}>`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `24: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><UsersRound size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></m`
- `25: const members = extractFamilyMembers(await response.json().catch(() => null));`
- `26: const group = groupResponse.ok ? parseFamilyGroup(await groupResponse.json().catch(() => null)) : null;`
- `35: {members.length === 0 ? <section className={styles.state}><UsersRound size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{members.map((member) => <article className={style`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
