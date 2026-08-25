# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/wishlist/page.tsx`
- **Member SHA-256:** `bbf92adbd36edd713878784a05c9294b53d7eb51cdd56994d1055342f77b099a`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function WishlistPage({ params }: Props) {`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `25: return <main className={`main ${styles.page}`}>`
- `27: {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article classN`
### backend_consumers_or_contracts
- `5: import { getPatientWishlist } from "@/lib/api/wishlist-server";`
- `6: import { extractWishlist } from "@/lib/api/wishlist";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await getPatientWishlist(token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `26: <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><`
- `27: {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article classN`
### payment_insurance_relevance
- `27: {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article classN`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></ma`
- `24: const items = extractWishlist(await response.json().catch(() => null));`
- `26: <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><`
- `27: {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article classN`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
