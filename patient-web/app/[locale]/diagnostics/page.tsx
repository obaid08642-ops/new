import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings, type DiagnosticBooking } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { extractLabServices, insuranceOffered, labPaymentFits, type LabService } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { extractLabProviders } from "@/lib/api/lab-providers";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";
import { OrderContextBar } from "@/components-next/ordering/order-context-bar";
import { AddToBasketIcon } from "@/components-next/ordering/add-to-basket";
import { BasketBar } from "@/components-next/ordering/basket-bar";
import { defaultAddressLine, insuranceClass } from "@/components-next/ordering/order-context";
import { isLocale, locales } from "@/lib/i18n";
import { contextQuery } from "@/lib/ordering/context";
import { localizedUrl } from "@/lib/seo";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ReferralNote, LabCard, LAB, PackageCard, QuickLink, RADIOLOGY, RadiologyTile, Rail, SearchForm, SectionHead, TestList, TestRow, hoursText, money, pickText, type Tag } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { RowCard } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/diagnostics/diag.module.css";
import type { Metadata } from "next";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { diagnosticBookingHref } from "@/lib/diagnostics-links";
import { byPrice, byRating, matchesQuery, parseHubFilter } from "@/lib/diagnostics-hub";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { pickTexts } from "@/lib/i18n/localized";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ kind?: string; place?: string; pay?: string; q?: string; show?: string; sort?: string }> };

const LIMIT_TESTS = 8;
const LIMIT_PACKAGES = 6;
const LIMIT_RADIOLOGY = 8;
const LIMIT_BOOKINGS = 3;

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Diagnostics" });
  const canonical = localizedUrl(locale, "/diagnostics");
  return {
    title: t("title"),
    description: t("eyebrow"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics")])), "x-default": localizedUrl("ar", "/diagnostics") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("eyebrow"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("eyebrow") },
    robots: { index: true, follow: true },
  };
}

type Domain = { domain: "labs" | "radiology"; ok: boolean; bookings: DiagnosticBooking[] };

/** The hub (canvas/ServiceHub): search, the two kinds, the place and payment filters, the quick links, packages and tests or radiology scans, and the patient's own requests when signed in. */
export default async function DiagnosticsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const kind = query.kind === "radiology" ? "radiology" : "labs";
  const filter = parseHubFilter(query);
  const place = query.place === "facility" ? "facility" : "home";
  // Decision 30 (owner 2026-10-14, question 5): insurance or self-pay first; self-pay is the default.
  const wantedPay = query.pay === "insurance" ? "insurance" : "self_pay";
  const t = await getTranslations("DiagWeb");
  const d = await getTranslations("Diagnostics");
  const oc = await getTranslations("OrderContext");
  const o = await getTranslations("OrderingFlow");
  const rtl = locale === "ar" || locale === "ur";

  // The patient's own requests (a signed-in patient only); the public catalogue below needs no session.
  let token: string | null = null;
  try {
    token = await requirePatientAccess(locale);
  } catch {
    token = null;
  }
  // Ord01: the saved address and insurance for the context bar (signed in only; GET /users/me/*, read on the server).
  let address: string | null | undefined;
  let insurance: { hasPolicy: boolean; cls: string | null } | undefined;
  let domains: Domain[] = [];
  if (token) {
    const [addressesResponse, insuranceResponse] = await Promise.all([
      callPatientApi("/users/me/addresses", { cache: "no-store" }, token).catch(() => null),
      callPatientApi("/users/me/insurance", { cache: "no-store" }, token).catch(() => null),
    ]);
    address = addressesResponse?.ok ? defaultAddressLine(await addressesResponse.json().catch(() => null)) : null;
    insurance = insuranceResponse?.ok ? insuranceClass(await insuranceResponse.json().catch(() => null)) : { hasPolicy: false, cls: null };
    const [labsResponse, radiologyResponse] = await Promise.all([getDiagnosticBookings(token, "labs"), getDiagnosticBookings(token, "radiology")]);
    const toDomain = async (domain: "labs" | "radiology", response: Response): Promise<Domain> => ({ domain, ok: response.ok, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });
    domains = await Promise.all([toDomain("labs", labsResponse), toDomain("radiology", radiologyResponse)]);
  }

  const [labsRes, radRes, pkgsRes] = await Promise.all([
    getPublicLabServices().catch(() => null),
    getPublicRadiologyServices().catch(() => null),
    fetch(patientApiUrl("/labs/packages"), { signal: publicReadSignal(), headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null),
  ]);
  // the approved labs strip (GET /providers?type=lab, public); a failed read leaves the strip out
  const providersRes = kind === "labs" ? await fetch(patientApiUrl("/providers?type=lab"), { signal: publicReadSignal(), headers: { Accept: "application/json" }, next: { revalidate: 300 } }).catch(() => null) : null;
  const providerRows = providersRes && providersRes.ok ? extractLabProviders(await providersRes.json().catch(() => null)) : [];
  const approvedLabs = (filter.sort === "rating" ? byRating(providerRows) : providerRows).filter((lab) => matchesQuery(filter.q, lab.nameAr, lab.nameEn)).slice(0, 8);
  const labServices = labsRes && labsRes.ok ? extractLabServices(await labsRes.json().catch(() => null)) : [];
  const radiologyServices = radRes && radRes.ok ? extractRadiologyServices(await radRes.json().catch(() => null)) : [];
  const packages = pkgsRes && pkgsRes.ok ? extractLabServices(await pkgsRes.json().catch(() => null)) : [];
  // Nothing takes insurance: the choice is not offered (no empty list behind it) and a pay=insurance link falls back to self-pay.
  const anyInsurance = insuranceOffered([...labServices.filter((s) => s.isPackage !== true), ...packages]);
  const pay = wantedPay === "insurance" && anyInsurance ? "insurance" : "self_pay";
  const catalogFailed = !(labsRes && labsRes.ok) && !(radRes && radRes.ok);

  const href = (over: Partial<{ kind: string; place: string; pay: string; show: string; sort: string }>) => {
    const next = { kind, place, pay, show: filter.show ?? "", sort: filter.sort ?? "", ...over };
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (next.show && next.kind === "labs") params.set("show", next.show);
    if (next.sort) params.set("sort", next.sort);
    if (next.kind !== "labs") params.set("kind", next.kind);
    if (next.place !== "home") params.set("place", next.place);
    if (next.pay !== "self_pay") params.set("pay", next.pay);
    const qs = params.toString();
    return `/${locale}/diagnostics${qs ? `?${qs}` : ""}`;
  };

  const fits = (service: { homeVisitSupported?: boolean; facilityVisitSupported?: boolean }) => (place === "home" ? service.homeVisitSupported !== false : service.facilityVisitSupported !== false);
  const pays = (s: LabService) => labPaymentFits(pay, s);
  const ordered = <T extends { price?: number }>(rows: T[]) => (filter.sort === "price" ? byPrice(rows) : rows);
  const named = (s: { nameAr?: string; nameEn?: string }) => matchesQuery(filter.q, s.nameAr, s.nameEn);
  const tests = filter.show === "packages" ? [] : ordered(labServices.filter((s) => s.isPackage !== true && !s.unavailable && fits(s) && pays(s) && named(s))).slice(0, LIMIT_TESTS);
  const shownPackages = filter.show === "tests" ? [] : ordered(packages.filter((p) => !p.unavailable && pays(p) && named(p))).slice(0, LIMIT_PACKAGES);
  const scans = ordered(radiologyServices.filter((s) => fits(s) && named(s))).slice(0, LIMIT_RADIOLOGY);

  const testTags = (s: LabService): Tag[] => [
    ...(s.homeVisitSupported ? [{ label: t("tagHome"), tone: LAB.tone } as Tag] : []),
    ...(s.fastingRequired ? [{ label: t("tagFasting"), tone: DIAG_TONES.warn } as Tag] : []),
  ];
  const orderPlace = place === "facility" ? "facility" : "home";
  const orderPay = pay === "insurance" ? "insurance" : "cash";
  const itemHref = (id: string, itemKind: "lab" | "radiology") => `/${locale}/labs/${encodeURIComponent(id)}${contextQuery({ kind: itemKind, place: orderPlace, pay: orderPay })}`;
  const caret = <Icon name={rtl ? "caret-left" : "caret-right"} size={20} tone="currentColor" />;
  const mine = domains.filter((entry) => entry.bookings.length > 0);

  return (
    <ConsultPage locale={locale} title={t("hubTitle")} backHref={`/${locale}`}>
      <StaleWhileRevalidate />
      <div className={styles.sectionHead}>
        <span />
        <ButtonLink href={`/${locale}/diagnostics/bookings`} label={t("myRequests")} variant="outline" size="sm" />
      </div>
      {/* The search filters the lists of the chosen kind in place (the app does; radiology has no search page), the URL keeps it. */}
      <SearchForm
        action={`/${locale}/diagnostics`}
        defaultValue={filter.q}
        placeholder={kind === "labs" ? t("searchLabs") : t("searchRadiology")}
        label={t("searchLabel")}
        submitLabel={t("search")}
        below={
          <>
            {kind !== "labs" ? <input type="hidden" name="kind" value={kind} /> : null}
            {place !== "home" ? <input type="hidden" name="place" value={place} /> : null}
            {pay !== "self_pay" ? <input type="hidden" name="pay" value={pay} /> : null}
            {filter.show && kind === "labs" ? <input type="hidden" name="show" value={filter.show} /> : null}
            {filter.sort ? <input type="hidden" name="sort" value={filter.sort} /> : null}
          </>
        }
      />
      <details className={styles.filterSheet} open={Boolean(filter.show || filter.sort)}>
        <summary className={styles.filterSummary}>{t("filterTitle")}</summary>
        <div className={styles.stack}>
          {kind === "labs" ? (
            <LinkSegmented
              label={t("filterShow")}
              value={filter.show ?? ""}
              options={[
                { value: "", label: t("filterAll"), href: href({ show: "" }) },
                { value: "packages", label: t("filterPackages"), href: href({ show: "packages" }) },
                { value: "tests", label: t("filterTests"), href: href({ show: "tests" }) },
              ]}
            />
          ) : null}
          <LinkSegmented
            label={t("filterSort")}
            value={filter.sort ?? ""}
            options={[
              { value: "", label: t("sortDefault"), href: href({ sort: "" }) },
              ...(kind === "labs" ? [{ value: "rating", label: t("sortRating"), href: href({ sort: "rating" }) }] : []),
              { value: "price", label: t("sortPrice"), href: href({ sort: "price" }) },
            ]}
          />
        </div>
      </details>

      <nav className={styles.kinds} aria-label={t("kindLabel")}>
        <Link href={href({ kind: "labs" })} replace className={styles.kind} aria-current={kind === "labs" ? "page" : undefined}>
          <FIcon icon={LAB.icon} tone={LAB.tone} size={52} />
          <span className={styles.kindText}><span className={styles.kindTitle}>{t("kindLabs")}</span><span className={styles.kindSub}>{t("kindLabsSub")}</span></span>
        </Link>
        <Link href={href({ kind: "radiology" })} replace className={styles.kind} aria-current={kind === "radiology" ? "page" : undefined}>
          <FIcon icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} size={52} />
          <span className={styles.kindText}><span className={styles.kindTitle}>{t("kindRadiology")}</span><span className={styles.kindSub}>{t("kindRadiologySub")}</span></span>
        </Link>
      </nav>

      <OrderContextBar
        label={t("placeLabel")}
        placeLabel={t("placeLabel")}
        place={place}
        placeOptions={[
          { value: "home", label: kind === "labs" ? t("placeHomeLab") : t("placeHomeScan"), href: href({ place: "home" }) },
          { value: "facility", label: kind === "labs" ? t("placeLab") : t("placeCenter"), href: href({ place: "facility" }) },
        ]}
        payLabel={t("payLabel")}
        pay={kind === "labs" && anyInsurance ? pay : undefined}
        payOptions={kind === "labs" && anyInsurance ? [{ value: "self_pay", label: t("paySelf"), href: href({ pay: "self_pay" }) }, { value: "insurance", label: t("payInsurance"), href: href({ pay: "insurance" }) }] : undefined}
        address={address}
        insurance={insurance}
        addressHref={`/${locale}/profile/addresses`}
        insuranceHref={`/${locale}/profile`}
        copy={{ hint: oc("hint"), addAddress: oc("addAddress"), addInsurance: oc("addInsurance"), insuranceSub: oc("insuranceSub"), insuranceName: t("payInsurance") }}
      />

      <div className={styles.quickGrid}>
        <QuickLink href={`/${locale}/diagnostics/results`} icon="chart-line-up" tone={DIAG_TONES.good} label={t("quickResults")} />
        <QuickLink href={`/${locale}/diagnostics/search`} icon="arrows-left-right" tone={DIAG_TONES.facility} label={t("quickCompare")} />
      </div>
      {/* "Use your insurance / upload your card" opens the policy form, not the bookings list (needs-review issue 1062). */}
      <RowCard href={`/${locale}/insurance/add-policy`} icon={SERVICE_ICONS.insurance.icon} tone={SERVICE_ICONS.insurance.tone} title={t("insuranceTitle")} sub={t("insuranceSub")} caret={caret} />

      {/* Ord02: order entry (a doctor's order) and the secondary provider-first path. Photographing a paper order needs an upload step that is not in this PR (needs-review). */}
      <RowCard href={`/${locale}/medical-orders`} icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={o("orderTitle")} sub={o("orderSub")} caret={caret} />
      {kind === "labs" ? <RowCard href={`/${locale}/diagnostics/labs`} icon={LAB.icon} tone={LAB.tone} title={o("browseLab")} sub={o("browseLabSub")} caret={caret} /> : null}

      {kind === "labs" && approvedLabs.length > 0 ? (
        <section className={styles.stack} aria-labelledby="hub-approved-labs">
          <SectionHead id="hub-approved-labs" title={t("approvedLabs")} href={`/${locale}/diagnostics/labs`} linkLabel={t("labsAll")} />
          <ul className={styles.labGrid} aria-label={t("approvedLabs")}>
            {approvedLabs.map((lab) => (
              <LabCard
                key={lab.id}
                href={`/${locale}/diagnostics/labs/${encodeURIComponent(lab.id)}`}
                title={pickText(locale, lab.nameAr, lab.nameEn) ?? ""}
                sub={lab.rating !== undefined ? t("labRating", { n: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(lab.rating) }) : undefined}
                tags={lab.homeVisit ? [{ label: t("labHomeTag"), tone: LAB.tone }] : []}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {catalogFailed ? (
        <ConsultState kind="error" title={t("catalogErrorTitle")} body={t("catalogErrorBody")} retryLabel={t("retry")} />
      ) : kind === "labs" ? (
        <>
          {shownPackages.length > 0 ? (
            <section className={styles.stack} aria-labelledby="hub-packages">
              <SectionHead id="hub-packages" title={t("packagesTitle")} href={`/${locale}/diagnostics/packages`} linkLabel={t("packagesAll")} />
              <Rail label={t("packagesTitle")}>
                {shownPackages.map((pkg) => {
                  const name = pickTexts(locale, pkg.names) ?? "";
                  return (
                    <PackageCard
                      key={pkg.id}
                      href={itemHref(pkg.id, "lab")}
                      title={name}
                      sub={pickTexts(locale, pkg.descriptions)}
                      count={pkg.includedServices?.length ? t("packageCount", { count: pkg.includedServices.length }) : undefined}
                      price={pkg.price !== undefined ? money(locale, pkg.price) : undefined}
                      was={pkg.oldPrice !== undefined && pkg.price !== undefined && pkg.oldPrice > pkg.price ? money(locale, pkg.oldPrice) : undefined}
                      cta={t("details")}
                    />
                  );
                })}
              </Rail>
            </section>
          ) : null}

          <section className={styles.stack} aria-labelledby="hub-tests">
            <SectionHead id="hub-tests" title={t("testsTitle")} href={`/${locale}/diagnostics/labs`} linkLabel={t("testsAll")} />
            {tests.length === 0 ? (
              <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("noTestsTitle")} body={t("noTestsBody")} />
            ) : (
              <TestList label={t("testsTitle")}>
                {tests.map((s) => {
                  const name = pickTexts(locale, s.names) ?? "";
                  return (
                    <TestRow
                      key={s.id}
                      href={itemHref(s.id, "lab")}
                      title={name}
                      tags={testTags(s)}
                      note={s.turnaroundHours !== undefined ? t("resultWithin", { time: hoursText(locale, s.turnaroundHours) }) : undefined}
                      price={s.price !== undefined ? money(locale, s.price) : undefined}
                      addSlot={<AddToBasketIcon kind="lab" line={{ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn }} name={name} />}
                    />
                  );
                })}
              </TestList>
            )}
          </section>
        </>
      ) : (
        <section className={styles.stack} aria-labelledby="hub-scans">
          <ReferralNote>{t("referralNote")}</ReferralNote>
          <SectionHead id="hub-scans" title={t("scansTitle")} href={`/${locale}/diagnostics/radiology`} linkLabel={t("scansAll")} />
          {scans.length === 0 ? (
            <ConsultState kind="empty" icon="scan" tone={RADIOLOGY.tone} title={t("noScansTitle")} body={t("noScansBody")} />
          ) : (
            <ul className={styles.radGrid} aria-label={t("scansTitle")}>
              {scans.map((s) => (
                <RadiologyTile
                  key={s.id}
                  href={itemHref(s.id, "radiology")}
                  title={pickTexts(locale, s.names) ?? ""}
                  sub={s.price !== undefined ? t("fromPrice", { price: money(locale, s.price) }) : undefined}
                  imageUrl={s.imageUrl}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {mine.map(({ domain, bookings }) => (
        <section className={styles.stack} key={domain} aria-labelledby={`hub-${domain}`}>
          <SectionHead id={`hub-${domain}`} title={d(`${domain}.title`)} href={`/${locale}/diagnostics/bookings`} linkLabel={t("allRequests")} />
          {bookings.slice(0, LIMIT_BOOKINGS).map((booking) => {
            const label = domain === "labs" ? d("labs.label") : pickTexts(locale, booking.scanNames) ?? d("radiology.label");
            const status = diagStatus(booking.state);
            return (
              <RowCard
                key={booking.id}
                href={diagnosticBookingHref(locale, domain, booking.id)}
                icon={domain === "labs" ? LAB.icon : RADIOLOGY.icon}
                tone={domain === "labs" ? LAB.tone : RADIOLOGY.tone}
                title={label}
                sub={status.key === "unknown" ? d("statusUnavailable") : t(`status_${status.key}`)}
                caret={caret}
              />
            );
          })}
        </section>
      ))}
      <BasketBar locale={locale} kind={kind === "radiology" ? "radiology" : "lab"} place={orderPlace} pay={orderPay} />
    </ConsultPage>
  );
}
