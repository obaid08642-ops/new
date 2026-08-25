# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/doctors/[doctorId]/page.tsx`
- **Member SHA-256:** `f4bd02360d591462dafb7e3c57708564e4bdccc46dc9bd928c761e1aa9454cbd`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { AppointmentBookingForm } from "@/components-next/appointment-booking-form";`
- `14: export default async function DoctorDetailPage({ params, searchParams }: Props) {`
- `18: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}`
- `21: return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailI`
### backend_consumers_or_contracts
- `5: import { extractDoctor, extractDoctorSlots } from "@/lib/api/doctors";`
- `6: import { getPublicDoctor, getPublicDoctorSlots } from "@/lib/api/doctors-server";`
### auth_ownership
- `18: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}`
- `21: return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailI`
### state_transitions
- `17: const t = await getTranslations("Doctors"); const response = await getPublicDoctor(doctorId); if (!response || response.status === 404) notFound();`
- `18: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}`
- `21: return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailI`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}`
- `19: const doctor = extractDoctor(await response.json().catch(() => null)); if (!doctor) notFound();`
- `20: const slotsResponse = await getPublicDoctorSlots({ id: doctor.id, date, serviceType }); const slots = slotsResponse?.ok ? extractDoctorSlots(await slotsResponse.json().catch(() => null)) : null; const rtl = locale === "ar" || locale === "ur`
- `21: return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailI`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
