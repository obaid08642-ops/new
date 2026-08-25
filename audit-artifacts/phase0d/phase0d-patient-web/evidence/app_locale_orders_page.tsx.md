# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/orders/page.tsx`
- **Member SHA-256:** `7ee0d21d7058dd02be070a1e698059f6caed554ee6b76139a46fa8c8ab3974b6`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: type Tab = "all" | "pending" | "completed" | "cancelled";`
- `15: ar: { all: "الكل", pending: "معلقة", completed: "مكتملة", cancelled: "ملغية" },`
- `16: en: { all: "All", pending: "Pending", completed: "Completed", cancelled: "Cancelled" },`
- `17: ur: { all: "سب", pending: "زیر التوا", completed: "مکمل", cancelled: "منسوخ" },`
- `18: hi: { all: "सभी", pending: "लंबित", completed: "पूर्ण", cancelled: "रद्द" },`
- `19: bn: { all: "সব", pending: "অপেক্ষমাণ", completed: "সম্পন্ন", cancelled: "বাতিল" },`
- `20: fil: { all: "Lahat", pending: "Nakabinbin", completed: "Nakumpleto", cancelled: "Kinansela" },`
- `22: function bucket(status?: string): Exclude<Tab, "all"> { const value = status?.toLowerCase(); if (["completed", "delivered", "result_ready", "approved", "resolved"].includes(value ?? "")) return "completed"; if (["cancelled", "rejected", "no`
- `24: export default async function OrdersPage({ params, searchParams }: Props) {`
- `32: if (response.status === 401) redirect(`/${locale}/login`);`
- `35: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("u`
### backend_consumers_or_contracts
- `5: import { callPatientApi } from "@/lib/api/upstream";`
- `6: import { extractOrderRows } from "@/lib/api/orders";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `10: import styles from "./orders.module.css";`
- `31: const response = await callPatientApi("/patient/pharmacy/orders", {}, token);`
- `40: return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t("detailNotice") : t("empty")}</p><`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `30: const token = await requirePatientAccess(locale);`
- `31: const response = await callPatientApi("/patient/pharmacy/orders", {}, token);`
- `32: if (response.status === 401) redirect(`/${locale}/login`);`
- `35: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("u`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: type Tab = "all" | "pending" | "completed" | "cancelled";`
- `15: ar: { all: "الكل", pending: "معلقة", completed: "مكتملة", cancelled: "ملغية" },`
- `16: en: { all: "All", pending: "Pending", completed: "Completed", cancelled: "Cancelled" },`
- `17: ur: { all: "سب", pending: "زیر التوا", completed: "مکمل", cancelled: "منسوخ" },`
- `18: hi: { all: "सभी", pending: "लंबित", completed: "पूर्ण", cancelled: "रद्द" },`
- `19: bn: { all: "সব", pending: "অপেক্ষমাণ", completed: "সম্পন্ন", cancelled: "বাতিল" },`
- `20: fil: { all: "Lahat", pending: "Nakabinbin", completed: "Nakumpleto", cancelled: "Kinansela" },`
- `22: function bucket(status?: string): Exclude<Tab, "all"> { const value = status?.toLowerCase(); if (["completed", "delivered", "result_ready", "approved", "resolved"].includes(value ?? "")) return "completed"; if (["cancelled", "rejected", "no`
- `32: if (response.status === 401) redirect(`/${locale}/login`);`
- `33: if (response.status === 403 || response.status === 404) notFound();`
- `35: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("u`
### payment_insurance_relevance
- `22: function bucket(status?: string): Exclude<Tab, "all"> { const value = status?.toLowerCase(); if (["completed", "delivered", "result_ready", "approved", "resolved"].includes(value ?? "")) return "completed"; if (["cancelled", "rejected", "no`
- `40: return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t("detailNotice") : t("empty")}</p><`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: type Tab = "all" | "pending" | "completed" | "cancelled";`
- `15: ar: { all: "الكل", pending: "معلقة", completed: "مكتملة", cancelled: "ملغية" },`
- `16: en: { all: "All", pending: "Pending", completed: "Completed", cancelled: "Cancelled" },`
- `17: ur: { all: "سب", pending: "زیر التوا", completed: "مکمل", cancelled: "منسوخ" },`
- `18: hi: { all: "सभी", pending: "लंबित", completed: "पूर्ण", cancelled: "रद्द" },`
- `19: bn: { all: "সব", pending: "অপেক্ষমাণ", completed: "সম্পন্ন", cancelled: "বাতিল" },`
- `20: fil: { all: "Lahat", pending: "Nakabinbin", completed: "Nakumpleto", cancelled: "Kinansela" },`
- `22: function bucket(status?: string): Exclude<Tab, "all"> { const value = status?.toLowerCase(); if (["completed", "delivered", "result_ready", "approved", "resolved"].includes(value ?? "")) return "completed"; if (["cancelled", "rejected", "no`
- `35: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("u`
- `36: const orders = extractOrderRows(await response.json().catch(() => null));`
- `37: const activeTab: Tab = ["pending", "completed", "cancelled"].includes(requestedTab ?? "") ? requestedTab as Exclude<Tab, "all"> : "all";`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
