import { LocalizedField } from "@/components-next/ui/localized-field";
import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { notFound, redirect } from "next/navigation";
import { pickName } from "@/lib/i18n/localized";
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
import { Caret, MetaLine, NURSING, NursingPackageCard, RowList, ServiceChips, StatusLine, nursingStatus, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { nursingOfferLine } from "@/components-next/nursing/nursing-offers";
import { Rail, SearchForm, SectionHead, money, pickText } from "@/components-next/diagnostics/diag-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { callPatientApi } from "@/lib/api/upstream";
import { servicePayFlow, type PayFlow } from "@/lib/nursing/pay-flow";
import consult from "@/components-next/consult/consult.module.css";
import Link from "next/link";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; pay?: string }> };

/** The search box narrows the services and packages (every name the record carries), as the app's hub does. */
function matchesSearch(item: { nameAr?: string; nameEn?: string }, needle: string) {
  return !needle || [item.nameAr, item.nameEn].some((name) => name?.toLocaleLowerCase().includes(needle));
}

/** The home care hub (canvas/ServiceHub): the ways in (services, providers, my visits) and the patient's own home care bookings. */
export default async function HomeCarePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const search = (query.q ?? "").trim();
  const pay: PayFlow = servicePayFlow(query.pay);
  const t = await getTranslations("NursingWeb");
  const w = await getTranslations("DiagWeb");
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
  // Parity with the app hub: the care packages (GET /home-care/packages) and the services (GET /nursing/catalog) on one page, narrowed by the search.
  const [servicesRead, packagesRead] = await Promise.all([
    readPublicHomeCareServices().catch(() => ({ failed: true, body: null })),
    callPatientApi("/home-care/packages", { cache: "no-store" }).catch(() => null),
  ]);
  const needle = search.toLocaleLowerCase();
  const services = (servicesRead.failed ? [] : extractNursingCatalog(servicesRead.body)).filter((item) => matchesSearch(item, needle) && (pay === "card" || item.insuranceAvailable !== false));
  const packages = (packagesRead && packagesRead.ok ? extractNursingCatalog(await packagesRead.json().catch(() => null)) : []).filter((item) => matchesSearch(item, needle) && (pay === "card" || item.insuranceAvailable !== false));
  const payHref = (next: PayFlow) => `/${locale}/home-care?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(next === "insurance" ? { pay: "insurance" } : {}) }).toString()}`;
  const serviceHref = (id: string) => `/${locale}/home-care/services/${encodeURIComponent(id)}${pay === "insurance" ? "?pay=insurance" : ""}`;
  return frame(
    <>
      <div className={consult.actions}>
        <ButtonLink href={`/${locale}/nursing/visits`} label={t("visitsLink")} variant="outline" size="sm" />
      </div>
      <SearchForm suggest={{ locale, scope: SUGGEST_SCOPES.nursing }} placeholder={t("searchPlaceholder")} label={t("searchLabel")} submitLabel={t("searchSubmit")} defaultValue={search} below={pay === "insurance" ? <input type="hidden" name="pay" value="insurance" /> : undefined} />
      <nav className={consult.segLinks} aria-label={t("formMethod")}>
        <Link href={payHref("card")} replace aria-current={pay === "card" ? "page" : undefined}>{t("method_card")}</Link>
        <Link href={payHref("insurance")} replace aria-current={pay === "insurance" ? "page" : undefined}>{t("method_insurance")}</Link>
      </nav>
      {packages.length > 0 ? (
        <>
          <SectionHead id="home-care-packages" title={t("carePackages")} />
          <Rail label={t("carePackages")}>
            {packages.map((item) => (
              <NursingPackageCard
                key={item.id}
                href={serviceHref(item.id)}
                title={pickName(locale, item.names) ? <LocalizedField locale={locale} ar={item.names.ar} en={item.names.en} /> : t("serviceUnavailable")}
                sub={item.duration}
                price={item.price !== undefined ? money(locale, item.price) : undefined}
                cta={t("bookCta")}
                icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)}
              />
            ))}
          </Rail>
        </>
      ) : null}
      <SectionHead id="home-care-services" title={t("servicesTitle")} />
      {services.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={search ? t("noMatch") : t("servicesEmpty")} body={search ? undefined : t("servicesEmptyBody")} />
      ) : (
        <RowList label={t("servicesTitle")}>
          {services.map((item) => {
            const offer = nursingOfferLine({ locale, tr: (key, values) => w(key, values), offer: item.offer, price: item.price });
            return (
              <li key={item.id}>
                <RowCard href={serviceHref(item.id)} icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)} tone={NURSING.tone} title={pickName(locale, item.names) ? <LocalizedField locale={locale} ar={item.names.ar} en={item.names.en} /> : t("serviceUnavailable")} sub={offer.line} extra={<ServiceChips extras={offer.chips} />} caret={caret} />
              </li>
            );
          })}
        </RowList>
      )}
      <RowList label={t("hubLinks")}>
        <li><RowCard href={`/${locale}/home-care/providers`} icon="user-circle" tone={NURSING.tone} title={t("providersLink")} sub={t("providersLinkSub")} caret={caret} /></li>
        <li><RowCard href={`/${locale}/nursing/visits`} icon="clock-counter-clockwise" tone={NURSING.tone} title={t("visitsLink")} sub={t("visitsLinkSub")} caret={caret} /></li>
      </RowList>
      <SectionHead id="home-care-bookings" title={t("bookingsTitle")} />
      {bookings.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("bookingsEmpty")} actionLabel={t("browseServices")} actionHref={`/${locale}/nursing/catalog`} />
      ) : (
        <RowList label={t("bookingsTitle")}>
          {bookings.map((booking) => {
            const name = pickName(locale, booking.serviceNames) ? <LocalizedField locale={locale} ar={booking.serviceNames?.ar} en={booking.serviceNames?.en} /> : t("serviceUnavailable");
            const status = nursingStatus(booking.state);
            return (
              <li key={booking.id}>
                <RowCard
                  href={`/${locale}/nursing/visits/${encodeURIComponent(booking.id)}`}
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
 * GET /home-care/services; each opens its public service page, where booking asks for the sign-in) and the published home care
 * providers (the public GET /providers?type=home_care). The patient's own bookings are read only with a session.
 */
async function GuestHomeCare({ locale }: { locale: Locale }) {
  const t = await getTranslations("NursingWeb");
  const g = await getTranslations("GuestServices");
  const w = await getTranslations("DiagWeb");
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
          {services.map((item) => {
            const offer = nursingOfferLine({ locale, tr: (key, values) => w(key, values), offer: item.offer, price: item.price });
            return (
              <li key={item.id}>
                <RowCard
                  href={`/${locale}/home-care/services/${encodeURIComponent(item.id)}`}
                  icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)}
                  tone={NURSING.tone}
                  title={pickName(locale, item.names) ? <LocalizedField locale={locale} ar={item.names.ar} en={item.names.en} /> : t("serviceUnavailable")}
                  sub={offer.line}
                  extra={<ServiceChips extras={offer.chips} />}
                  caret={caret}
                />
              </li>
            );
          })}
        </RowList>
      </GuestList>
      <SectionHead id="home-care-providers" title={g("homeCare.providersTitle")} />
      <GuestList failed={providersRead.failed} count={providers.length} error={providerLabels.error} empty={providerLabels.empty}>
        <RowList label={g("homeCare.providersTitle")}>
          {providers.slice(0, GUEST_ROWS).map((provider) => (
            <li key={provider.id}>
              <RowCard icon="user-circle" tone={NURSING.tone} title={<LocalizedField locale={locale} ar={provider.nameAr} en={provider.nameEn} />} sub={provider.city} />
            </li>
          ))}
        </RowList>
      </GuestList>
      <GuestAction id="home-care-sign-in" title={g("homeCare.actionTitle")} body={g("homeCare.actionBody")} label={g("homeCare.action")} href={signInHref(locale, `/${locale}/home-care`)} />
    </ConsultPage>
  );
}
