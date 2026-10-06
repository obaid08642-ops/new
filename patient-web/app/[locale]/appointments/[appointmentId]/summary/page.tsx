import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Hero, SectionCard, type LinkAction } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

/** What the doctor wrote after the visit: diagnosis, notes, prescription, recommendations, and the follow-up when one is advised. */
export default async function AppointmentSummaryPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}/summary`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/appointments/${encodeURIComponent(appointmentId)}`;
  if (response.status === 403 || response.status === 404) {
    return (
      <ConsultPage locale={locale} title={c("summaryTitle")} backHref={back}>
        <ConsultState kind="empty" title={c("summaryPendingTitle")} body={c("summaryPendingBody")} actionLabel={c("backToAppointment")} actionHref={back} />
      </ConsultPage>
    );
  }
  if (!response.ok) notFound();
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const summary = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  const diagnosis = typeof summary?.diagnosis === "string" ? summary.diagnosis : undefined;
  const notes = typeof summary?.notes === "string" ? summary.notes : undefined;
  const recommendations = typeof summary?.recommendations === "string" ? summary.recommendations : undefined;
  const prescription = Array.isArray(summary?.prescription) ? (summary.prescription as unknown[]) : [];
  const followUpRecommended = summary?.follow_up_recommended === true;
  const windowDays = typeof summary?.follow_up_window_days === "number" ? summary.follow_up_window_days : 7;
  const doctorId = typeof summary?.doctor_id === "string" ? summary.doctor_id : undefined;
  const id = encodeURIComponent(appointmentId);
  const empty = !diagnosis && !notes && prescription.length === 0;

  const actions: LinkAction[] = [];
  if (followUpRecommended) actions.push({ href: `/${locale}/consultations/booking-status?appointmentId=${id}&followUp=true&windowDays=${windowDays}${doctorId ? `&doctorId=${encodeURIComponent(doctorId)}` : ""}`, label: c("actionBookFollowUp") });
  if (prescription.length > 0) actions.push({ href: `/${locale}/prescriptions`, label: c("actionPrescriptions"), variant: followUpRecommended ? "outline" : "primary" }, { href: `/${locale}/pharmacy`, label: c("actionOrderMedicines"), variant: "outline" });
  actions.push({ href: `/${locale}/diagnostics/labs`, label: c("actionBookTests"), variant: "outline" }, { href: `/${locale}/consultations/post-call-rating?appointmentId=${id}`, label: c("actionRate"), variant: "outline" });

  return (
    <ConsultPage locale={locale} title={c("summaryTitle")} backHref={back}>
      <Hero icon="clipboard-text" title={c("summaryTitle")} sub={c("summarySub")} />
      {empty ? <ConsultState kind="empty" title={c("summaryPendingTitle")} body={c("summaryEmpty")} /> : null}
      {diagnosis ? <SectionCard id="summary-diagnosis" title={c("summaryDiagnosis")}><p className={styles.body}>{diagnosis}</p></SectionCard> : null}
      {notes ? <SectionCard id="summary-notes" title={c("summaryNotes")}><p className={styles.body}>{notes}</p></SectionCard> : null}
      {prescription.length > 0 ? (
        <SectionCard id="summary-prescription" title={c("summaryPrescription")}>
          <ul className={styles.plain}>
            {prescription.map((item, index) => {
              const r = item as Record<string, unknown>;
              const name = String(r.name ?? r.medication ?? r.drug ?? "");
              return <li key={`${name}-${index}`}>{name}{typeof r.dose === "string" ? ` · ${r.dose}` : ""}</li>;
            })}
          </ul>
        </SectionCard>
      ) : null}
      {!empty && recommendations ? <SectionCard id="summary-recommendations" title={c("summaryRecommendations")}><p className={styles.body}>{recommendations}</p></SectionCard> : null}
      {!empty && followUpRecommended ? (
        <SectionCard id="summary-follow-up" title={c("summaryFollowUp", { days: windowDays })}>
          <p className={styles.body}>{c("summaryFollowUpBody")}</p>
        </SectionCard>
      ) : null}
      {!empty ? <ActionLinks actions={actions} /> : null}
    </ConsultPage>
  );
}
