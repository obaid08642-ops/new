# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/chat/page.tsx`
- **Member SHA-256:** `71de2d8368ad8c221403b1f8e0ad77ddc5f94f342bba3f197a88e0767991eed8`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function ChatPage({ params }: Props) {`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><MessageCircle size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section>`
- `24: return <main className={`main ${styles.page}`}>`
### backend_consumers_or_contracts
- `3: import { extractChatThreadSummaries } from "@/lib/api/chat";`
- `4: import { getPatientChatThreads } from "@/lib/api/chat-server";`
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
- `18: const token = await requirePatientAccess(locale);`
- `19: const response = await getPatientChatThreads(token);`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><MessageCircle size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section>`
### state_transitions
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `21: if (response.status === 403 || response.status === 404) notFound();`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><MessageCircle size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section>`
- `32: {threads.length === 0 ? <section className={styles.state}><MessageCircle size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{threads.map((thread) => <article className={st`
### payment_insurance_relevance
- `32: {threads.length === 0 ? <section className={styles.state}><MessageCircle size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{threads.map((thread) => <article className={st`
- `33: <span className={styles.cardIcon}><MessageCircle size={19} aria-hidden="true" /></span>`
- `34: <div className={styles.cardBody}>`
### error_empty_loading_retry_cancel
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><MessageCircle size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section>`
- `23: const threads = extractChatThreadSummaries(await response.json().catch(() => null));`
- `32: {threads.length === 0 ? <section className={styles.state}><MessageCircle size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{threads.map((thread) => <article className={st`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
