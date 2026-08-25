# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/cart/page.tsx`
- **Member SHA-256:** `836c660d9ad8a9895eb8f7c2f454ccdafd277ee571098c025cd98124cd1b27c0`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function CartPage({ params }: Props) {`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `30: return <main className={`main ${styles.page}`}>`
- `32: {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count `
### backend_consumers_or_contracts
- `5: import { callPatientApi } from "@/lib/api/upstream";`
- `6: import { extractCartSummary } from "@/lib/api/cart";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await callPatientApi("/cart", {}, token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `31: <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{hasItems ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><Shop`
- `32: {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count `
### payment_insurance_relevance
- `32: {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count `
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></secti`
- `24: const cart = extractCartSummary(await response.json().catch(() => null));`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `31: <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{hasItems ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><Shop`
- `32: {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
