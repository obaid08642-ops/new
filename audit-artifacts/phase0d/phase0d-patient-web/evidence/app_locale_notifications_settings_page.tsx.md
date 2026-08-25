# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/notifications/settings/page.tsx`
- **Member SHA-256:** `d4c0b0234e6ad8c6b97b558685d8c8d4b731f5691bcddeec4892cc5092ea2bcf`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `18: export default async function NotificationSettingsPage({ params }: Props) {`
- `26: try { response = await getPatientNotificationSettings(token); } catch { return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></`
- `27: if (response.status === 401) redirect(`/${locale}/login`);`
- `29: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `31: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{settingsT("eyebrow")}</p><h1>{settingsT("title")}</h1><p>{settingsT("notice")}</p></div><span className={styles.headerIcon`
### backend_consumers_or_contracts
- `4: import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";`
- `5: import { extractNotificationSettings } from "@/lib/api/notification-settings";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `24: const token = await requirePatientAccess(locale);`
- `26: try { response = await getPatientNotificationSettings(token); } catch { return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></`
- `27: if (response.status === 401) redirect(`/${locale}/login`);`
- `29: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `26: try { response = await getPatientNotificationSettings(token); } catch { return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></`
- `27: if (response.status === 401) redirect(`/${locale}/login`);`
- `28: if (response.status === 403 || response.status === 404) notFound();`
- `29: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
### payment_insurance_relevance
- `13: ["general", Bell], ["appointments", CalendarDays], ["orders", ShoppingBag], ["offers", Tag],`
- `31: return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{settingsT("eyebrow")}</p><h1>{settingsT("title")}</h1><p>{settingsT("notice")}</p></div><span className={styles.headerIcon`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `26: try { response = await getPatientNotificationSettings(token); } catch { return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></`
- `29: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;`
- `30: const settings = extractNotificationSettings(await response.json().catch(() => null));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
