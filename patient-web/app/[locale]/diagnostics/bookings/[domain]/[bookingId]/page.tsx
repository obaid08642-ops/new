import { notFound, redirect } from "next/navigation";
import { pickName } from "@/lib/i18n/localized";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBooking, extractDiagnosticTracking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBooking, getDiagnosticTracking } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Facts, Hero, Notice, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { LAB, RADIOLOGY, TagRow, minutesText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { formatWhen } from "@/components-next/pharmacy-offers/format";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { DiagnosticBookingCancel } from "@/components-next/diagnostics/booking-cancel";
import { CANCELLABLE_STATES, RADIOLOGY_STAGES, radiologyStageIndex } from "@/components-next/diagnostics/stages";
import { formatPrice } from "@/lib/format-price";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string; domain: string; bookingId: string }> };

/** A lab or radiology booking (canvas/OrderTracking head): the status, when and where, whether a referral is required, and for a lab the steps the server logged. The total, the collector, the radiology stages and the result rows (when the booking carries them) are drawn; documents never are. */
export default async function DiagnosticDetailPage({ params }: Props) {
  const { locale, domain: rawDomain, bookingId } = await params;
  const domain = parseDiagnosticDomain(rawDomain);
  if (!isLocale(locale) || !domain || !parseDiagnosticBookingId(bookingId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const w = await getTranslations("DiagWeb");
  const token = await requirePatientAccess(locale);
  const response = await getDiagnosticBooking(token, domain, bookingId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const backHref = `/${locale}/diagnostics/bookings`;
  const booking = response.ok ? extractDiagnosticBooking(await response.json().catch(() => null)) : null;
  if (!booking) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={w("retry")} actionLabel={w("backToBookings")} actionHref={backHref} />
      </ConsultPage>
    );
  }
  const trackingResponse = await getDiagnosticTracking(token, domain, bookingId);
  const tracking = domain === "labs" && trackingResponse.ok ? extractDiagnosticTracking(await trackingResponse.json().catch(() => null)) : null;
  const visual = domain === "labs" ? LAB : RADIOLOGY;
  const label = domain === "labs" ? t("labs.label") : pickName(locale, booking.scanNames) ?? t("radiology.label");
  const status = diagStatus(booking.state);
  const statusText = status.key === "unknown" ? t("statusUnavailable") : w(`status_${status.key}`);
  const when = booking.scheduledAt ? formatWhen(locale, booking.scheduledAt) : null;
  const home = booking.locationType === "HOME_COLLECTION" || booking.locationType === "MOBILE_HOME_VISIT";
  const rows: FactRow[] = [
    { label: t("status"), value: statusText, icon: "check-circle", tone: status.tone },
    ...(when ? [{ label: t("scheduled"), value: <bdi>{when}</bdi>, icon: "calendar-dots", tone: DIAG_TONES.health } as FactRow] : []),
    ...(booking.locationType ? [{ label: t("location"), value: home ? w("locationHome") : w("locationFacility"), icon: home ? "moped" : "hospital", tone: DIAG_TONES.facility } as FactRow] : []),
    ...(booking.total ? [{ label: w("bookingTotal"), value: <bdi>{formatPrice(locale, booking.total).text}</bdi>, icon: "tag", tone: DIAG_TONES.info } as FactRow] : []),
    ...(booking.medicalReferralRequired !== undefined ? [{ label: t("referral"), value: booking.medicalReferralRequired ? t("yes") : t("no"), icon: "file-text", tone: DIAG_TONES.info } as FactRow] : []),
  ];
  const steps = tracking?.steps ?? [];
  const last = steps.length - 1;
  const stageIndex = domain === "radiology" ? radiologyStageIndex(booking.state) : -1;
  const cancelled = status.key === "cancelled";
  const canCancel = !cancelled && CANCELLABLE_STATES.has((booking.state ?? "").toUpperCase());
  const collectorVisible = domain === "labs" && home && !cancelled && !booking.hasReport && Boolean(tracking?.techName || tracking?.techPhone);
  const FINAL = new Set(["REPORTED", "CANCELLED", "SAMPLE_REJECTED"]);
  const actions: LinkAction[] = domain === "labs"
    ? [
        // journeys#54: the report itself, as a file the browser opens (patient BFF -> GET labs/bookings/:id/reports/:reportId).
        ...(booking.reportIds ?? []).map((rid, i, all) => ({ href: `/api/patient/labs/bookings/${encodeURIComponent(booking.id)}/reports/${encodeURIComponent(rid)}`, label: all.length > 1 ? w("openReportN", { n: i + 1 }) : w("openReport"), variant: "primary", external: true } as LinkAction)),
        { href: `/${locale}/diagnostics/sample-tracking?bookingId=${encodeURIComponent(booking.id)}`, label: w("trackSample"), ...((booking.reportIds ?? []).length ? { variant: "outline" as const } : {}) },
        { href: `/${locale}/diagnostics/insurance-approval?orderId=${encodeURIComponent(booking.id)}`, label: w("uploadInsurance"), variant: "outline" },
      ]
    : [];

  return (
    <ConsultPage locale={locale} title={label} backHref={backHref}>
      <Hero icon={visual.icon} tone={visual.tone} title={label} sub={statusText}>
        {booking.hasReport ? <TagRow tags={[{ label: t("reportReady"), tone: DIAG_TONES.good }]} /> : null}
      </Hero>
      <SectionCard id="diag-facts" title={w("bookingDetails")}><Facts rows={rows} label={label} /></SectionCard>
      {steps.length > 0 ? (
        <SectionCard id="diag-steps" title={w("sampleSteps")}>
          <Timeline
            label={w("sampleSteps")}
            steps={steps.map((step, i) => {
              const key = diagStatus(step.state).key;
              return { id: `${i}`, label: key === "unknown" ? t("statusUnavailable") : w(`status_${key}`), time: (step.at && formatWhen(locale, step.at)) || undefined, state: i < last || FINAL.has(step.state) ? "done" : "current" };
            })}
          />
        </SectionCard>
      ) : null}
      {collectorVisible && tracking ? (
        <SectionCard id="diag-collector" title={w("collectorLabel")}>
          <div className={styles.eta}>
            <div className={styles.etaText}>
              {tracking.techName ? <span className={styles.etaValue}>{tracking.techName}</span> : null}
              {tracking.eta ? <span className={styles.etaLabel}>{w("trackingArriving")} <bdi>{minutesText(locale, tracking.eta)}</bdi></span> : null}
            </div>
            {tracking.techPhone ? <a className={styles.callLink} href={`tel:${tracking.techPhone}`}>{w("collectorCall")}</a> : null}
          </div>
        </SectionCard>
      ) : null}
      {domain === "radiology" && !cancelled && stageIndex >= 0 ? (
        <SectionCard id="diag-stages" title={w("radiologyStagesTitle")}>
          <Timeline
            label={w("radiologyStagesTitle")}
            steps={RADIOLOGY_STAGES.map((stage, i) => ({ id: stage.key, label: w(stage.label), state: i < stageIndex ? "done" : i === stageIndex ? "current" : "upcoming" }))}
          />
        </SectionCard>
      ) : null}
      {booking.results?.length ? (
        <SectionCard id="diag-results" title={w("bookingResultsTitle")}>
          <ul className={styles.stack} aria-label={w("bookingResultsTitle")}>
            {booking.results.map((row) => (
              <li key={row.id}>
                <span className={styles.etaLabel}>{row.name}</span>
                <span className={styles.etaValue}>
                  <bdi>{row.result}</bdi>
                  {row.abnormal ? <> <Icon name="warning" size={16} tone="currentColor" /><span className="sr-only">{w("resultAbnormal")}</span></> : null}
                </span>
                {row.reference ? <span className={styles.etaLabel}>{w("resultReference")}: <bdi>{row.reference}</bdi></span> : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <Notice>{t("detailNotice")}</Notice>
      <ActionLinks actions={actions} />
      {canCancel ? <DiagnosticBookingCancel domain={domain} bookingId={booking.id} /> : null}
    </ConsultPage>
  );
}
