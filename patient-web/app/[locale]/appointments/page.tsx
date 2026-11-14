import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentRows, specialtyFor } from "@/lib/api/appointments";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { formatPrice } from "@/lib/format-price";
import { isBooked, isCurrent, isPast, isJoinable, isOpen, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { AppointmentCard, type CardAction } from "@/components-next/consult/appointment-card";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { HideVisitButton } from "@/components-next/consult/hide-visit-button";
import { callPatientApi } from "@/lib/api/upstream";
import { canHideStatus, readHiddenVisits, visitKey } from "@/lib/history/hidden-visits";
import { ActionLinks } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string; hidden?: string }> };
type Tab = "upcoming" | "current" | "past";

/** My appointments (canvas/Appointments): the upcoming, current and past tabs, one card per appointment. */
export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab: requestedTab, hidden: showHiddenParam } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const c = await getTranslations("ConsultWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointments(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/profile`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const appointments = extractAppointmentRows(await response.json().catch(() => null));
  const activeTab: Tab = requestedTab === "past" ? "past" : requestedTab === "current" ? "current" : "upcoming";
  const tabRows = appointments.filter((appointment) => (activeTab === "upcoming" ? isBooked(appointment.status) : activeTab === "current" ? isCurrent(appointment.status) : isPast(appointment.status)));
  // PT-54: the past tab leaves out the visits the patient hid (they are listed under "Show hidden visits"). The server's timeline says which
  // are hidden; if it cannot be read, nothing is hidden (the list never loses a visit because of a failed side read).
  let hiddenIds = new Set<string>();
  if (activeTab === "past") {
    try {
      const timeline = await callPatientApi("/unified-bookings/mine?kind=consultation&include_hidden=1", { cache: "no-store" }, token);
      if (timeline?.ok) hiddenIds = readHiddenVisits(await timeline.json().catch(() => null));
    } catch {
      // the hidden set could not be read: nothing is hidden
    }
  }
  const isHidden = (id: string) => hiddenIds.has(visitKey("consultation", id));
  const showHidden = activeTab === "past" && showHiddenParam === "1";
  const hiddenCount = tabRows.filter((appointment) => isHidden(appointment.id)).length;
  const shown = activeTab === "past" ? tabRows.filter((appointment) => isHidden(appointment.id) === showHidden) : tabRows;
  const hc = await getTranslations("ConsultClient");
  const base = `/${locale}/appointments`;
  const serviceLabel = (serviceType?: string) => { const mode = modeOf(serviceType); return mode ? t(`services.${mode}`) : t("serviceUnavailable"); };

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/profile`}>
      <LinkSegmented
        label={t("title")}
        value={activeTab}
        options={[
          { value: "upcoming", label: c("tabUpcoming"), href: `${base}?tab=upcoming` },
          { value: "current", label: c("tabCurrent"), href: `${base}?tab=current` },
          { value: "past", label: c("tabPast"), href: `${base}?tab=past` },
        ]}
      />
      {activeTab === "past" && (hiddenCount > 0 || showHidden) ? (
        <ActionLinks actions={[showHidden ? { href: `${base}?tab=past`, label: hc("backToHistory"), variant: "outline" } : { href: `${base}?tab=past&hidden=1`, label: hc("showHiddenLink", { n: hiddenCount }), variant: "outline" }]} />
      ) : null}
      {shown.length === 0 ? (
        <ConsultState kind="empty" title={showHidden ? hc("emptyHidden") : activeTab === "upcoming" ? t("emptyUpcoming") : activeTab === "current" ? t("emptyCurrent") : t("emptyPast")} body={t("empty")} actionLabel={activeTab === "upcoming" ? c("actionBookConsultation") : undefined} actionHref={activeTab === "upcoming" ? `/${locale}/consultations/doctors?sort=available_today` : undefined} />
      ) : (
        <>
          <ul className={styles.list} aria-label={activeTab === "upcoming" ? c("tabUpcoming") : activeTab === "current" ? c("tabCurrent") : c("tabPast")}>
            {shown.map((appointment) => {
              const mode = modeOf(appointment.serviceType);
              const id = encodeURIComponent(appointment.id);
              const detail: CardAction = { href: `${base}/${id}`, label: t("open") };
              let primary: CardAction | undefined = detail;
              // The visit-specific action only once the visit is confirmed (as the app); a booking still waiting only opens its details.
              if (activeTab !== "past" && isJoinable(appointment.status)) {
                if (mode === "video") primary = { href: `/${locale}/consultations/virtual-waiting-room?appointmentId=${id}`, label: c("actionWaitingRoom") };
                else if (mode === "clinic") primary = { href: `/${locale}/consultations/booking-status?appointmentId=${id}&view=location`, label: c("actionLocation") };
                else if (mode === "home") primary = { href: `/${locale}/consultations/home-visit-tracking?appointmentId=${id}`, label: c("actionTrack") };
              } else if (activeTab === "past" && appointment.doctorId && appointment.status?.toLowerCase() === "completed") {
                primary = { href: `/${locale}/consultations/book/${encodeURIComponent(appointment.doctorId)}`, label: t("bookAgain") };
              }
              const secondary = activeTab !== "past" && isOpen(appointment.status) ? { href: `/${locale}/consultations/cancel-reschedule?appointmentId=${id}`, label: c("actionEdit") } : undefined;
              const key = statusKey(appointment.status);
              return (
                <AppointmentCard
                  key={appointment.id}
                  locale={locale}
                  href={detail.href}
                  title={appointment.doctorName ?? serviceLabel(appointment.serviceType)}
                  mode={mode}
                  modeLabel={mode ? t(`services.${mode}`) : undefined}
                  statusLabel={key ? c(`status.${key}`) : t("statusUnavailable")}
                  statusTone={statusTone(appointment.status)}
                  slotStart={appointment.slotStart}
                  specialty={specialtyFor(appointment, locale)}
                  timeLine={appointment.slotStart ? <LocalTimeLine iso={appointment.slotStart} locale={locale} /> : undefined}
                  primary={primary}
                  primaryInk={activeTab !== "past" && isJoinable(appointment.status) && (mode === "clinic" || mode === "home")}
                  secondary={secondary}
                  priceText={appointment.price !== undefined ? formatPrice(locale, appointment.price).text : undefined}
                  extra={activeTab === "past" && canHideStatus(appointment.status) ? <HideVisitButton kind="consultation" id={appointment.id} hidden={showHidden} /> : undefined}
                />
              );
            })}
          </ul>
          <ActionLinks actions={[{ href: `/${locale}/consultations/specialties`, label: t("browseSpecialties"), variant: "outline" }]} />
        </>
      )}
    </ConsultPage>
  );
}
