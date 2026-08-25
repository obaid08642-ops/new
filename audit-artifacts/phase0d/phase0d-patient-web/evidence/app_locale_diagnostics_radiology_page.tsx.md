# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/radiology/page.tsx`
- **Member SHA-256:** `bb165d0e9c70608913104eac2be5cecc5f18cfc1778063e9ec78d29474a49857`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: export default async function RadiologyServicesPage({ params, searchParams }: Props) {`
- `19: if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className=`
- `21: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitl`
### backend_consumers_or_contracts
- `5: import { extractRadiologyServices } from "@/lib/api/radiology";`
- `6: import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";`
- `8: import styles from "../labs/labs.module.css";`
- `19: if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className=`
### auth_ownership
- `19: if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className=`
- `21: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitl`
### state_transitions
- `19: if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className=`
- `21: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitl`
### payment_insurance_relevance
- `16: const servicesResponse = getPublicRadiologyServices({ modality, bodyPart, search, homeVisit: on(query.home_visit) ? "true" : undefined, homeOnly: on(query.home_only) ? "true" : undefined, highestRated: on(query.highest_rated) ? "true" : und`
- `21: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitl`
### error_empty_loading_retry_cancel
- `19: if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className=`
- `20: const services = extractRadiologyServices(await servicesResult.json().catch(() => null)); const modalityValues = modalitiesResult?.ok ? (await modalitiesResult.json().catch(() => null) as unknown) : []; const modalityList = Array.isArray(mo`
- `21: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitl`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
