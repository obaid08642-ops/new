import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareBookings } from "@/lib/api/home-care";
import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { readPublicHomeCareProviders, readPublicHomeCareServices } from "@/lib/api/public-services-server";
import { parsePublicProviders, signInHref } from "@/lib/services/guest";
import { CareHero } from "@/components-next/care/care-kit";
import { GuestAction, GuestList } from "@/components-next/guest/guest-service";
import { guestListLabels } from "@/components-next/guest/guest-labels";
import { getDirection, isLocale, type Locale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { RowCard, Notice } from "@/components-next/consult/consult-parts";
import { Caret, MetaLine, NURSING, RowList, StatusLine, nursingStatus, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { SectionHead, money, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }> };

/** The home care hub (canvas/ServiceHub): the ways in (services, providers, my visits) and the patient's own home care bookings. */
export default async function HomeCarePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await getOptionalPatientAccessToken();
  if (!token) return <GuestHomeCare locale={locale} />;
  const response = await getPatientHomeCareBookings(token);
  if (response.status === 401) redirect(signInHref(locale, `/${locale}/home-care`));
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
        <li><RowCard href={`/${locale}/nursing/catalog`} icon={NURSING.icon} tone={NURSING.tone} title={t("browseServices")} sub={t("browseServicesSub")} caret={caret} /></li>
        <li><RowCard href={`/${locale}/home-care/providers`} icon="user-circle" tone={NURSING.tone} title={t("providersLink")} sub={t("providersLinkSub")} caret={caret} /></li>
        <li><RowCard href={`/${locale}/nursing/visits`} icon="clock-counter-clockwise" tone={NURSING.tone} title={t("visitsLink")} sub={t("visitsLinkSub")} caret={caret} /></li>
      </RowList>
      <SectionHead id="home-care-bookings" title={t("bookingsTitle")} />
      {bookings.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("bookingsEmpty")} actionLabel={t("browseServices")} actionHref={`/${locale}/nursing/catalog`} />
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

/** How many providers the guest page lists (the published services are all listed, with their prices). */
const GUEST_ROWS = 6;

/**
 * Issue 1550: the home care page of a guest. What the service is, the published services with their prices (the public
 * GET /nursing/catalog; each opens its public service page, where booking asks for the sign-in) and the published home care
 * providers (the public GET /providers?type=home_care). The patient's own bookings are read only with a session.
 */
async function GuestHomeCare({ locale }: { locale: Locale }) {
  const t = await getTranslations("NursingWeb");
  const g = await getTranslations("GuestServices");
  const [servicesRead, providersRead] = await Promise.all([readPublicHomeCareServices(), readPublicHomeCareProviders()]);
  const services = servicesRead.failed ? [] : extractNursingCatalog(servicesRead.body);
  const providers = providersRead.failed ? [] : parsePublicProviders(providersRead.body);
  const [serviceLabels, providerLabels] = await Promise.all([guestListLabels(g("homeCare.servicesEmpty")), guestListLabels(g("homeCare.providersEmpty"))]);
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;
  return (
    <ConsultPage locale={locale} title={t("hubTitle")} backHref={`/${locale}`}>
      <CareHero tone={NURSING.tone} icon={NURSING.icon} label={t("hubTitle")} title={g("homeCare.heroTitle")} lines={[g("homeCare.heroBody")]} />
      <SectionHead id="home-care-services" title={g("homeCare.servicesTitle")} href={`/${locale}/nursing/catalog`} linkLabel={g("seeAll")} />
      <GuestList failed={servicesRead.failed} count={services.length} error={serviceLabels.error} empty={serviceLabels.empty}>
        <RowList label={g("homeCare.servicesTitle")}>
          {services.map((item) => (
            <li key={item.id}>
              <RowCard
                href={`/${locale}/home-care/services/${encodeURIComponent(item.id)}`}
                icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)}
                tone={NURSING.tone}
                title={pickText(locale, item.nameAr, item.nameEn) ?? t("serviceUnavailable")}
                sub={item.price !== undefined ? money(locale, item.price) : undefined}
                caret={caret}
              />
            </li>
          ))}
        </RowList>
      </GuestList>
      <SectionHead id="home-care-providers" title={g("homeCare.providersTitle")} />
      <GuestList failed={providersRead.failed} count={providers.length} error={providerLabels.error} empty={providerLabels.empty}>
        <RowList label={g("homeCare.providersTitle")}>
          {providers.slice(0, GUEST_ROWS).map((provider) => (
            <li key={provider.id}>
              <RowCard icon="user-circle" tone={NURSING.tone} title={pickText(locale, provider.nameAr, provider.nameEn) ?? ""} sub={provider.city} />
            </li>
          ))}
        </RowList>
      </GuestList>
      <GuestAction id="home-care-sign-in" title={g("homeCare.actionTitle")} body={g("homeCare.actionBody")} label={g("homeCare.action")} href={signInHref(locale, `/${locale}/home-care`)} />
    </ConsultPage>
  );
}
