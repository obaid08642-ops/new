# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/packages/[packageId]/page.tsx`
- **Member SHA-256:** `12614ddcbf0c039f8c61141c539cf8166e31b62f34402f01c1af991a990a2322`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function LabPackageDetailPage({ params }: Props) {`
- `18: if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.a`
- `20: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={style`
- `22: if (!pkg) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("invalidBody")}</p></section></main>;`
- `27: return <main className={`main ${styles.page}`}>`
- `28: <Link className={styles.back} href={`/${locale}/diagnostics/packages`}><Arrow size={17} aria-hidden="true" />{t("back")}</Link>`
### backend_consumers_or_contracts
- `5: import { extractLabService, parseLabServiceId } from "@/lib/api/labs";`
- `6: import { getPublicLabPackage } from "@/lib/api/labs-server";`
- `8: import styles from "../../labs/labs.module.css";`
### auth_ownership
- `18: if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.a`
- `20: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={style`
- `22: if (!pkg) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("invalidBody")}</p></section></main>;`
### state_transitions
- `15: if (!parseLabServiceId(packageId).success) notFound();`
- `18: if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.a`
- `19: if (response.status === 404) notFound();`
- `20: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={style`
- `22: if (!pkg) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("invalidBody")}</p></section></main>;`
### payment_insurance_relevance
- `31: {pkg.price !== undefined ? <div className={styles.fact}><strong>{t("priceLabel")}</strong><span>{t("price", { value: pkg.price })}</span></div> : null}`
- `32: {pkg.oldPrice !== undefined && pkg.oldPrice > (pkg.price ?? 0) ? <div className={styles.fact}><strong>{t("previousPrice")}</strong><span>{pkg.oldPrice}</span></div> : null}`
### error_empty_loading_retry_cancel
- `18: if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.a`
- `20: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={style`
- `21: const pkg = extractLabService(await response.json().catch(() => null));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
