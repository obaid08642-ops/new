import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentRows } from "@/lib/api/appointments";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { isPast, isUpcoming, isJoinable, isOpen, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { AppointmentCard, type CardAction } from "@/components-next/consult/appointment-card";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { ActionLinks } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> };
type Tab = "upcoming" | "past";

/** My appointments (canvas/Appointments): the upcoming and past tabs, one card per appointment. */
export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab: requestedTab } = (await searchParams) ?? {};
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
  const activeTab: Tab = requestedTab === "past" ? "past" : "upcoming";
  const shown = appointments.filter((appointment) => (activeTab === "upcoming" ? isUpcoming(appointment.status) : isPast(appointment.status)));
  const base = `/${locale}/appointments`;
  const serviceLabel = (serviceType?: string) => { const mode = modeOf(serviceType); return mode ? t(`services.${mode}`) : t("serviceUnavailable"); };

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/profile`}>
      <LinkSegmented
        label={t("title")}
        value={activeTab}
        options={[
          { value: "upcoming", label: c("tabUpcoming"), href: `${base}?tab=upcoming` },
          { value: "past", label: c("tabPast"), href: `${base}?tab=past` },
        ]}
      />
      {shown.length === 0 ? (
        <ConsultState kind="empty" title={t("title")} body={t("empty")} actionLabel={t("browseSpecialties")} actionHref={`/${locale}/consultations/specialties`} />
      ) : (
        <>
          <ul className={styles.list} aria-label={activeTab === "upcoming" ? c("tabUpcoming") : c("tabPast")}>
            {shown.map((appointment) => {
              const mode = modeOf(appointment.serviceType);
              const id = encodeURIComponent(appointment.id);
              const detail: CardAction = { href: `${base}/${id}`, label: t("open") };
              let primary: CardAction | undefined = detail;
              if (activeTab === "upcoming") {
                if (mode === "video" && isJoinable(appointment.status)) primary = { href: `/${locale}/consultations/virtual-waiting-room?appointmentId=${id}`, label: c("actionWaitingRoom") };
                else if (mode === "clinic") primary = { href: `/${locale}/consultations/clinic-confirm?appointmentId=${id}&view=location`, label: c("actionLocation") };
                else if (mode === "home") primary = { href: `/${locale}/consultations/home-visit-tracking?appointmentId=${id}`, label: c("actionTrack") };
              }
              const secondary = activeTab === "upcoming" && isOpen(appointment.status) ? { href: `/${locale}/consultations/cancel-reschedule?appointmentId=${id}`, label: c("actionEdit") } : undefined;
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
                  specialty={appointment.specialty}
                  timeLine={appointment.slotStart ? <LocalTimeLine iso={appointment.slotStart} locale={locale} /> : undefined}
                  primary={primary}
                  secondary={secondary}
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
