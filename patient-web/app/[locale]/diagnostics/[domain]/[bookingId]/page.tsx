import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBooking, extractDiagnosticTracking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBooking, getDiagnosticTracking } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Facts, Hero, Notice, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { LAB, RADIOLOGY, TagRow, pickText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { formatWhen } from "@/components-next/pharmacy-offers/format";

type Props = { params: Promise<{ locale: string; domain: string; bookingId: string }> };

/** A lab or radiology booking (canvas/OrderTracking head): the status, when and where, whether a referral is required, and for a lab the steps the server logged. Reports, documents and prices are never drawn here. */
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
  const label = domain === "labs" ? t("labs.label") : pickText(locale, booking.scanNameAr, booking.scanNameEn) ?? t("radiology.label");
  const status = diagStatus(booking.state);
  const statusText = status.key === "unknown" ? t("statusUnavailable") : w(`status_${status.key}`);
  const when = booking.scheduledAt ? formatWhen(locale, booking.scheduledAt) : null;
  const home = booking.locationType === "HOME_COLLECTION" || booking.locationType === "MOBILE_HOME_VISIT";
  const rows: FactRow[] = [
    { label: t("status"), value: statusText, icon: "check-circle", tone: status.tone },
    ...(when ? [{ label: t("scheduled"), value: <bdi>{when}</bdi>, icon: "calendar-dots", tone: "coral" } as FactRow] : []),
    ...(booking.locationType ? [{ label: t("location"), value: home ? w("locationHome") : w("locationFacility"), icon: home ? "moped" : "hospital", tone: "teal" } as FactRow] : []),
    ...(booking.medicalReferralRequired !== undefined ? [{ label: t("referral"), value: booking.medicalReferralRequired ? t("yes") : t("no"), icon: "file-text", tone: "blue" } as FactRow] : []),
  ];
  const steps = tracking?.steps ?? [];
  const current = steps.findIndex((step) => !step.done);
  const actions: LinkAction[] = domain === "labs"
    ? [
        { href: `/${locale}/diagnostics/sample-tracking?bookingId=${encodeURIComponent(booking.id)}`, label: w("trackSample") },
        ...(home ? [{ href: `/${locale}/diagnostics/technician-tracking?bookingId=${encodeURIComponent(booking.id)}`, label: w("trackCollector"), variant: "outline" } as LinkAction] : []),
        { href: `/${locale}/diagnostics/insurance-upload?bookingId=${encodeURIComponent(booking.id)}`, label: w("uploadInsurance"), variant: "outline" },
      ]
    : [];

  return (
    <ConsultPage locale={locale} title={label} backHref={backHref}>
      <Hero icon={visual.icon} tone={visual.tone} title={label} sub={statusText}>
        {booking.hasReport ? <TagRow tags={[{ label: t("reportReady"), tone: "mint" }]} /> : null}
      </Hero>
      <SectionCard id="diag-facts" title={w("bookingDetails")}><Facts rows={rows} label={label} /></SectionCard>
      {steps.length > 0 ? (
        <SectionCard id="diag-steps" title={w("sampleSteps")}>
          <Timeline
            label={w("sampleSteps")}
            steps={steps.map((step, i) => ({ id: `${i}`, label: step.title, time: step.time, state: step.done ? "done" : i === current ? "current" : "upcoming" }))}
          />
        </SectionCard>
      ) : null}
      <Notice>{t("detailNotice")}</Notice>
      <ActionLinks actions={actions} />
    </ConsultPage>
  );
}
