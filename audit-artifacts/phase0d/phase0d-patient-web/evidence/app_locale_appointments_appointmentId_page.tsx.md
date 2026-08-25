# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/appointments/[appointmentId]/page.tsx`
- **Member SHA-256:** `418eb47b4de91c87fb91106f4170d4e4ff88199ef3a397308bd35731fa718051`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `10: import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";`
- `17: export default async function AppointmentDetailPage({ params }: Props) {`
- `24: if (response.status === 401) redirect(`/${locale}/login`);`
- `26: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `28: if (!appointment) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `31: return <main className={`main ${styles.page}`}>`
- `32: <Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
- `42: </dl><p className={styles.notice}>{t("detailNotice")}</p></section>{["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ `
### backend_consumers_or_contracts
- `4: import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";`
- `5: import { getPatientAppointment } from "@/lib/api/appointments-server";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `32: <Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `11: import { CallTokenLauncher } from "@/components-next/call-token-launcher";`
- `22: const token = await requirePatientAccess(locale);`
- `23: const response = await getPatientAppointment(token, appointmentId);`
- `24: if (response.status === 401) redirect(`/${locale}/login`);`
- `26: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `28: if (!appointment) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `42: </dl><p className={styles.notice}>{t("detailNotice")}</p></section>{["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ `
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `19: if (!isLocale(locale) || !parseAppointmentId(appointmentId).success) notFound();`
- `24: if (response.status === 401) redirect(`/${locale}/login`);`
- `25: if (response.status === 403 || response.status === 404) notFound();`
- `26: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `28: if (!appointment) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `30: const status = appointment.status || t("statusUnavailable");`
- `34: <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{appointment.doctorName || serviceLabel}</h1><span className={styles.status}>{status}</span></div>`
- `39: <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>`
- `42: </dl><p className={styles.notice}>{t("detailNotice")}</p></section>{["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ `
### payment_insurance_relevance
- `42: </dl><p className={styles.notice}>{t("detailNotice")}</p></section>{["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ `
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `26: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `27: const appointment = extractAppointmentDetail(await response.json().catch(() => null));`
- `28: if (!appointment) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></sectio`
- `42: </dl><p className={styles.notice}>{t("detailNotice")}</p></section>{["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
