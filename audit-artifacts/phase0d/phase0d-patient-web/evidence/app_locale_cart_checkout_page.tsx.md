# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/cart/checkout/page.tsx`
- **Member SHA-256:** `1da01825d6868b6471d09c2b07d91ca12351f655a01cdd42e7bbb5d599ad5e1a`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `14: export default async function CartCheckoutPreviewPage({ params }: Props) {`
- `20: const response = await callPatientApi("/cart/checkout", {}, token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main`
- `29: return <main className={`main ${styles.page}`}>`
- `32: <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>`
### backend_consumers_or_contracts
- `5: import { callPatientApi } from "@/lib/api/upstream";`
- `6: import { extractCartSummary } from "@/lib/api/cart";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: const token = await requirePatientAccess(locale);`
- `20: const response = await callPatientApi("/cart/checkout", {}, token);`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `21: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (response.status === 403 || response.status === 404) notFound();`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main`
### payment_insurance_relevance
- `4: import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main`
- `30: <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><CreditCard size={27} aria-hi`
- `31: <section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong>`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `23: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `24: const cart = extractCartSummary(await response.json().catch(() => null));`
- `25: if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
