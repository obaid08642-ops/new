import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings, type DiagnosticBooking } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { extractLabServices, type LabService } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { ReferralNote, LAB, PackageCard, QuickLink, RADIOLOGY, RadiologyTile, Rail, SearchForm, SectionHead, TestList, TestRow, hoursText, money, pickText, type Tag } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { RowCard } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/diagnostics/diag.module.css";
import type { Metadata } from "next";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ kind?: string; place?: string; pay?: string }> };

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
  const place = query.place === "facility" ? "facility" : "home";
  const pay = query.pay === "insurance" ? "insurance" : "all";
  const t = await getTranslations("DiagWeb");
  const d = await getTranslations("Diagnostics");
  const rtl = locale === "ar" || locale === "ur";

  // The patient's own requests (a signed-in patient only); the public catalogue below needs no session.
  let token: string | null = null;
  try {
    token = await requirePatientAccess(locale);
  } catch {
    token = null;
  }
  let domains: Domain[] = [];
  if (token) {
    const [labsResponse, radiologyResponse] = await Promise.all([getDiagnosticBookings(token, "labs"), getDiagnosticBookings(token, "radiology")]);
    const toDomain = async (domain: "labs" | "radiology", response: Response): Promise<Domain> => ({ domain, ok: response.ok, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });
    domains = await Promise.all([toDomain("labs", labsResponse), toDomain("radiology", radiologyResponse)]);
  }

  const [labsRes, radRes, pkgsRes] = await Promise.all([
    getPublicLabServices().catch(() => null),
    getPublicRadiologyServices().catch(() => null),
    fetch(patientApiUrl("/labs/packages"), { headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null),
  ]);
  const labServices = labsRes && labsRes.ok ? extractLabServices(await labsRes.json().catch(() => null)) : [];
  const radiologyServices = radRes && radRes.ok ? extractRadiologyServices(await radRes.json().catch(() => null)) : [];
  const packages = pkgsRes && pkgsRes.ok ? extractLabServices(await pkgsRes.json().catch(() => null)) : [];
  const catalogFailed = !(labsRes && labsRes.ok) && !(radRes && radRes.ok);

  const href = (over: Partial<{ kind: string; place: string; pay: string }>) => {
    const next = { kind, place, pay, ...over };
    const params = new URLSearchParams();
    if (next.kind !== "labs") params.set("kind", next.kind);
    if (next.place !== "home") params.set("place", next.place);
    if (next.pay !== "all") params.set("pay", next.pay);
    const qs = params.toString();
    return `/${locale}/diagnostics${qs ? `?${qs}` : ""}`;
  };

  const fits = (service: { homeVisitSupported?: boolean; facilityVisitSupported?: boolean }) => (place === "home" ? service.homeVisitSupported !== false : service.facilityVisitSupported !== false);
  const tests = labServices.filter((s) => s.isPackage !== true && !s.unavailable && fits(s) && (pay !== "insurance" || s.insuranceAvailable === true)).slice(0, LIMIT_TESTS);
  const shownPackages = packages.filter((p) => !p.unavailable && (pay !== "insurance" || p.insuranceAvailable === true)).slice(0, LIMIT_PACKAGES);
  const scans = radiologyServices.filter(fits).slice(0, LIMIT_RADIOLOGY);

  const testTags = (s: LabService): Tag[] => [
    ...(s.homeVisitSupported ? [{ label: t("tagHome"), tone: LAB.tone } as Tag] : []),
    ...(s.fastingRequired ? [{ label: t("tagFasting"), tone: DIAG_TONES.warn } as Tag] : []),
  ];
  const addHref = (s: LabService, name: string) => `/${locale}/diagnostics/cart?add=${encodeURIComponent(s.id)}&name=${encodeURIComponent(name)}${s.price !== undefined ? `&price=${s.price}` : ""}`;
  const caret = <Icon name={rtl ? "caret-left" : "caret-right"} size={20} tone="currentColor" />;
  const mine = domains.filter((entry) => entry.bookings.length > 0);

  return (
    <ConsultPage locale={locale} title={t("hubTitle")} backHref={`/${locale}`}>
      <StaleWhileRevalidate />
      <div className={styles.sectionHead}>
        <span />
        <ButtonLink href={`/${locale}/diagnostics/bookings`} label={t("myRequests")} variant="outline" size="sm" />
      </div>
      <SearchForm action={`/${locale}/diagnostics/search`} placeholder={kind === "labs" ? t("searchLabs") : t("searchRadiology")} label={t("searchLabel")} submitLabel={t("search")} />

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

      <div className={styles.filters}>
        <LinkSegmented
          label={t("placeLabel")}
          value={place}
          options={[
            { value: "home", label: kind === "labs" ? t("placeHomeLab") : t("placeHomeScan"), href: href({ place: "home" }) },
            { value: "facility", label: kind === "labs" ? t("placeLab") : t("placeCenter"), href: href({ place: "facility" }) },
          ]}
        />
        {kind === "labs" ? (
          <LinkSegmented
            label={t("payLabel")}
            value={pay}
            options={[{ value: "all", label: t("payAll"), href: href({ pay: "all" }) }, { value: "insurance", label: t("payInsurance"), href: href({ pay: "insurance" }) }]}
          />
        ) : null}
      </div>

      <div className={styles.quickGrid}>
        <QuickLink href={`/${locale}/diagnostics/results`} icon="chart-line-up" tone={DIAG_TONES.good} label={t("quickResults")} />
        <QuickLink href={`/${locale}/diagnostics/lab-comparison`} icon="arrows-left-right" tone={DIAG_TONES.facility} label={t("quickCompare")} />
      </div>
      <RowCard href={`/${locale}/diagnostics/bookings`} icon={SERVICE_ICONS.insurance.icon} tone={SERVICE_ICONS.insurance.tone} title={t("insuranceTitle")} sub={t("insuranceSub")} caret={caret} />

      {catalogFailed ? (
        <ConsultState kind="error" title={t("catalogErrorTitle")} body={t("catalogErrorBody")} retryLabel={t("retry")} />
      ) : kind === "labs" ? (
        <>
          {shownPackages.length > 0 ? (
            <section className={styles.stack} aria-labelledby="hub-packages">
              <SectionHead id="hub-packages" title={t("packagesTitle")} href={`/${locale}/diagnostics/packages`} linkLabel={t("packagesAll")} />
              <Rail label={t("packagesTitle")}>
                {shownPackages.map((pkg) => {
                  const name = pickText(locale, pkg.nameAr, pkg.nameEn) ?? "";
                  return (
                    <PackageCard
                      key={pkg.id}
                      href={`/${locale}/diagnostics/packages/${encodeURIComponent(pkg.id)}`}
                      title={name}
                      sub={pickText(locale, pkg.descriptionAr, pkg.descriptionEn)}
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
                  const name = pickText(locale, s.nameAr, s.nameEn) ?? "";
                  return (
                    <TestRow
                      key={s.id}
                      href={`/${locale}/diagnostics/test-detail?testId=${encodeURIComponent(s.id)}`}
                      title={name}
                      tags={testTags(s)}
                      note={s.turnaroundHours !== undefined ? t("resultWithin", { time: hoursText(locale, s.turnaroundHours) }) : undefined}
                      price={s.price !== undefined ? money(locale, s.price) : undefined}
                      addHref={addHref(s, name)}
                      addLabel={t("addToOrder", { name })}
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
                  href={`/${locale}/diagnostics/radiology/${encodeURIComponent(s.id)}`}
                  title={pickText(locale, s.nameAr, s.nameEn) ?? ""}
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
            const label = domain === "labs" ? d("labs.label") : pickText(locale, booking.scanNameAr, booking.scanNameEn) ?? d("radiology.label");
            const status = diagStatus(booking.state);
            return (
              <RowCard
                key={booking.id}
                href={`/${locale}/diagnostics/${domain}/${booking.id}`}
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
    </ConsultPage>
  );
}
