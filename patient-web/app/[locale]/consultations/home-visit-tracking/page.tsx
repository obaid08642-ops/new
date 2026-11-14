import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { AutoRefresh } from "@/components-next/consult/auto-refresh";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

// The steps of a home visit and the server states that sit on each: EN_ROUTE is the provider on the way, ARRIVED / CHECKED_IN the provider at the door.
const STEPS = ["PENDING", "CONFIRMED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;
const STEP_OF: Record<string, (typeof STEPS)[number]> = { RESCHEDULED: "CONFIRMED", EN_ROUTE: "PROVIDER_EN_ROUTE", ARRIVED: "PROVIDER_ARRIVED", CHECKED_IN: "PROVIDER_ARRIVED" };

/** Where a home visit is (canvas/OrderTracking): the steps of the visit, the one the server's status says it is at. */
export default async function HomeVisitTrackingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { appointmentId = "" } = await searchParams;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(appointmentId)) notFound();
  const t = await getTranslations("HomeVisitTracking");
  const c = await getTranslations("ConsultWeb");
  const token = await requirePatientAccess(locale);
  const res = await getPatientAppointment(token, appointmentId);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const appt = payload?.data ?? payload;
  const status = String(appt?.status ?? "PENDING").toUpperCase();
  const cancelled = status === "CANCELLED" || status === "NO_SHOW";
  const finished = status === "COMPLETED" || cancelled;
  const idx = STEPS.findIndex((s) => s === (STEP_OF[status] ?? status));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`}>
      {finished ? null : <AutoRefresh />}
      {cancelled ? <Notice warn>{c(status === "NO_SHOW" ? "status.no_show" : "status.cancelled")}</Notice> : null}
      <SectionCard id="visit-steps">
        <Timeline
          label={t("title")}
          steps={STEPS.map((step, i) => ({ id: step, label: t(`step_${step}`), state: idx < 0 ? "upcoming" : i < idx || (i === idx && step === "COMPLETED") ? "done" : i === idx ? "current" : "upcoming" }))}
        />
      </SectionCard>
      {idx < 0 && !cancelled ? <Notice warn>{t("unknownStatus")}</Notice> : null}
    </ConsultPage>
  );
}
