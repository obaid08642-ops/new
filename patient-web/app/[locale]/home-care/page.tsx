import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareBookings } from "@/lib/api/home-care";
import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { RowCard, Notice } from "@/components-next/consult/consult-parts";
import { Caret, MetaLine, NURSING, RowList, StatusLine, nursingStatus, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { SectionHead, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }> };

/** The home care hub (canvas/ServiceHub): the ways in (services, providers, my visits) and the patient's own home care bookings. */
export default async function HomeCarePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareBookings(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const rtl = getDirection(locale) === "rtl";
  const frame = (children: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("hubTitle")} backHref={`/${locale}`}>
      {children}
    </ConsultPage>
  );
  if (!response.ok) {
    return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />);
  }
  const bookings = extractHomeCareBookings(await response.json().catch(() => null));
  const caret = <Caret rtl={rtl} />;
  return frame(
    <>
      <RowList label={t("hubLinks")}>
        <li><RowCard href={`/${locale}/home-care/services`} icon={NURSING.icon} tone={NURSING.tone} title={t("browseServices")} sub={t("browseServicesSub")} caret={caret} /></li>
        <li><RowCard href={`/${locale}/home-care/providers`} icon="user-circle" tone={NURSING.tone} title={t("providersLink")} sub={t("providersLinkSub")} caret={caret} /></li>
        <li><RowCard href={`/${locale}/nursing/visits`} icon="clock-counter-clockwise" tone={NURSING.tone} title={t("visitsLink")} sub={t("visitsLinkSub")} caret={caret} /></li>
      </RowList>
      <SectionHead id="home-care-bookings" title={t("bookingsTitle")} />
      {bookings.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("bookingsEmpty")} actionLabel={t("browseServices")} actionHref={`/${locale}/home-care/services`} />
      ) : (
        <RowList label={t("bookingsTitle")}>
          {bookings.map((booking) => {
            const name = pickText(locale, booking.serviceNameAr, booking.serviceNameEn) ?? t("serviceUnavailable");
            const status = nursingStatus(booking.state);
            return (
              <li key={booking.id}>
                <RowCard
                  icon={serviceIcon(booking.serviceNameAr, booking.serviceNameEn)}
                  tone={NURSING.tone}
                  title={name}
                  sub={[booking.sessionsCount ? t("sessions", { count: booking.sessionsCount }) : "", booking.duration ?? ""].filter(Boolean).join(" · ") || undefined}
                  extra={
                    <>
                      {booking.scheduledAt ? <MetaLine><LocalTimeLine iso={booking.scheduledAt} locale={locale} /></MetaLine> : null}
                      <StatusLine label={t(`status.${status.key}`)} tone={status.tone} />
                    </>
                  }
                />
              </li>
            );
          })}
        </RowList>
      )}
      <Notice>{t("notice")}</Notice>
    </>,
  );
}
