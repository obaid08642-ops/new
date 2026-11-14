import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SuggestInput } from "@/components-next/search/suggest-input";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isSpecialtySlug, specialtyLabel } from "@/lib/specialties";
import { doctorDisplayName, doctorPlace, extractDoctors, parseDoctorSort, type DoctorSort } from "@/lib/api/doctors";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { getPublicConfig } from "@/lib/api/public-config-server";
import { parseLateGuarantee } from "@/lib/consult/late-guarantee";
import { GuaranteeLine } from "@/components-next/consult/differentiators";
import { getCachedSpecialties } from "@/lib/api/specialties-cached";
import { extractSpecialties } from "@/lib/api/specialties";
import { isOutage } from "@/lib/api/outage";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import type { ConsultMode } from "@/components-next/ui-generated/components/contract";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { DoctorFiltersSheet } from "@/components-next/consult/doctor-filters-sheet";
import { VisitTypeCards } from "@/components-next/consult/visit-type-cards";
import { effectiveType, filterPageParams, nearestApplies, parseDoctorFilters, type DoctorFilters, type VisitType } from "@/lib/consult/doctor-filters";
import { formatPrice } from "@/lib/format-price";
import { cardFacts } from "@/lib/consult/doctor-card-facts";
import { SpecialtyRow } from "@/components-next/consult/specialty-tiles";
import { orderSpecialties } from "@/components-next/ui-generated/icons/specialty-look";
import styles from "@/components-next/consult/consult.module.css";

// The empty and error states are rare: their chunk (it carries the Feedback components and the icon record) loads only when one is drawn, so the list page stays under its script budget.
const ConsultState = dynamic(() => import("@/components-next/consult/consult-state").then((m) => m.ConsultState));
// drawn only for "Insurance" with no insurer in the address: its chunk loads only then
const InsurerFromPolicy = dynamic(() => import("@/components-next/consult/insurer-from-policy").then((m) => m.InsurerFromPolicy));

export type DoctorsViewProps = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; specialty?: string; sort?: DoctorSort; type?: string; gender?: string; degree?: string; payment?: string; insurance?: string; insurance_class?: string; available?: string; nearest?: string; lat?: string; lng?: string; city?: string }> };
type Props = DoctorsViewProps;

/**
 * F82-3: the list is one view with two routes: the static/ISR page (no query: the same list for everyone) and its dynamic twin
 * under /q for a search, a specialty, a sort or a filter (lib/security/query-twin.ts). `searchParams` is undefined on the static route.
 */
export const DOCTORS_REVALIDATE_SECONDS = 60;

export async function doctorsMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  const canonical = localizedUrl(locale, "/consultations/doctors");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/consultations/doctors")])), "x-default": localizedUrl("ar", "/consultations/doctors") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle"), images: ["/images/og-default.jpg"] },
    robots: { index: true, follow: true },
  };
}

/** Find a doctor (canvas/Consult): the search field, the sort choice and one card per doctor. */
export async function DoctorsView({ params, searchParams }: Props) {
  const { locale } = await params; const sp = (await searchParams) ?? {}; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Doctors");
  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");
  let doctors: ReturnType<typeof extractDoctors> = [];
  const filters = parseDoctorFilters(sp);
  // Decision 30: "Insurance" lists the doctors contracted for the patient's saved company and class. The page reads them from
  // the URL only (no session on a cached public page); InsurerFromPolicy fills them in from the saved policy in the browser.
  const shownType = effectiveType(filters);
  let failed = false;
  const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: parseDoctorSort(sp.sort), filters }).catch(() => null);
  // A failure (no answer, or a 5xx) on the cached page throws, so Next keeps the last good copy instead of caching an error
  // (stale-if-error, issue 302). On the twin (never cached) the error state with a retry shows, as before.
  if (isOutage(response) && searchParams === undefined) throw new PublicDataUnavailableError("doctors");
  if (response && response.ok) {
    doctors = extractDoctors(await response.json().catch(() => null));
  } else failed = true;

  // The guarantee line comes from the server's public setting (minutes and points); no setting, no line.
  const guarantee = parseLateGuarantee(await getPublicConfig().catch(() => null));
  const guaranteeText = guarantee ? t("guaranteeLine", { minutes: guarantee.minutes, points: guarantee.points }) : null;
  // the specialty row: every specialty of the endpoint, the ones with doctors first (most doctors first), the rest after them; a failed read leaves the row out
  const specialtyRes = await getCachedSpecialties();
  const specialtyRows = specialtyRes?.ok ? extractSpecialties(await specialtyRes.json().catch(() => null)) : [];
  const tiles = orderSpecialties(specialtyRows, (row) => specialtyLabel(names, row.slug) ?? (locale === "ar" || locale === "ur" ? row.nameAr ?? row.nameEn : row.nameEn ?? row.nameAr) ?? "");

  // a specialty slug (from the pharmacy cart "Consult a doctor") filters the list and shows by its name, never as raw text in the search field
  const specialtyName = specialtyLabel(names, sp.specialty);

  // every link keeps the text search and the chosen filters, so the URL is the whole state (shareable)
  const text = { q: sp.q, specialty: sp.specialty };
  const pageHref = (params: URLSearchParams) => `/${locale}/consultations/doctors${params.size ? `?${params.toString()}` : ""}`;
  const withFilters = (next: Partial<DoctorFilters>, sort = sp.sort) => pageHref(filterPageParams({ ...filters, ...next }, { ...text, sort }));
  const typeHref = (type: VisitType) => withFilters({ type: filters.type === type ? undefined : type, nearest: filters.nearest && nearestApplies(type) });
  const paramsWithout = (next: Partial<DoctorFilters>, sort = sp.sort) => filterPageParams({ ...filters, ...next }, { ...text, sort });
  // "Clear all": every filter and the sort off; the search, the specialty and the visit type stay
  const clearHref = pageHref(filterPageParams({ type: filters.type, availableNow: false, nearest: false, place: null }, text));
  const sortChip = sp.sort === "rating" ? t("sortRating") : sp.sort === "price" ? t("sortPrice") : sp.sort === "wait" ? t("sortWait") : sp.sort === "available_today" ? t("sortAvailableToday") : undefined;
  const activeChips: Array<{ key: string; label: string; href: string }> = [
    ...(filters.gender ? [{ key: "gender", label: t(filters.gender === "male" ? "genderMale" : "genderFemale"), href: pageHref(paramsWithout({ gender: undefined })) }] : []),
    ...(filters.degree ? [{ key: "degree", label: t(`degree_${filters.degree}`), href: pageHref(paramsWithout({ degree: undefined })) }] : []),
    ...(filters.availableNow ? [{ key: "available", label: t("availableNow"), href: pageHref(paramsWithout({ availableNow: false })) }] : []),
    ...(filters.nearest ? [{ key: "nearest", label: t("nearest"), href: pageHref(paramsWithout({ nearest: false, place: null })) }] : []),
    ...(sortChip && sp.sort ? [{ key: "sort", label: sortChip, href: pageHref(paramsWithout({}, undefined)) }] : []),
  ];
  // the chosen payment is the summary chip beside the Filters button (doctor-filters-sheet), not a second chip in the row below
  const filterCount = activeChips.length + (filters.payment ? 1 : 0);
  const filtered = Boolean(filters.type || filterCount > 0);
  const typeLabels: Record<VisitType, string> = { clinic: t("service_clinic"), video: t("service_video"), home_visit: t("service_home") };

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} width="wide" appointmentsHref={`/${locale}/appointments`}>
      <StaleWhileRevalidate maxAgeSeconds={searchParams === undefined ? DOCTORS_REVALIDATE_SECONDS : undefined} />
      <div className={styles.searchSticky}>
      <form className={styles.doctorSearch} method="get" role="search">
        {/* one row: the search field (its magnifier submits), the Filters button at the inline end (owner review 2026-10-27, G2) */}
        <div className={styles.searchRow}>
          <SuggestInput locale={locale} id="doctor-search" name="q" defaultValue={sp.q ?? (specialtyName ? "" : sp.specialty ?? "")} placeholder={t("searchPlaceholder")} label={t("searchLabel")} fieldClassName={styles.searchField} inputClassName={styles.searchInput} submitLabel={t("search")} submitClassName={styles.searchSubmit}>
            <Icon name="search" size={20} tone="secondary" />
          </SuggestInput>
          <DoctorFiltersSheet locale={locale} filters={filters} q={sp.q} specialty={sp.specialty} sort={sp.sort} clearHref={clearHref} count={filterCount} />
        </div>
        {[...filterPageParams(filters)].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        {isSpecialtySlug(sp.specialty) ? <input type="hidden" name="specialty" value={sp.specialty.trim()} /> : null}
      </form>
      </div>
      {activeChips.length > 0 ? (
        <div className={styles.chipsRow} role="group" aria-label={t("activeFilters")}>
          {activeChips.map((chip) => (
            <Link key={chip.key} href={chip.href} replace className={styles.activeChip} aria-label={t("removeFilter", { filter: chip.label })}>
              <bdi>{chip.label}</bdi>
              <span aria-hidden="true" className={styles.activeChipX}>×</span>
            </Link>
          ))}
          <Link href={clearHref} replace className={styles.activeFilterClear}>{t("filtersClearAll")}</Link>
        </div>
      ) : null}
      {specialtyName ? (
        <div className={styles.activeFilter}>
          <StatusChip label={specialtyName} tone="blue" />
          <Link className={styles.activeFilterClear} href={`/${locale}/consultations/doctors`}>{t("clearSearch")}</Link>
        </div>
      ) : null}
      {tiles.length ? (
        <SpecialtyRow
          label={t("specialtyLabel")}
          allLabel={t("specialtyAll")}
          allHref={pageHref(filterPageParams(filters, { q: sp.q, sort: sp.sort }))}
          allSelected={!sp.specialty}
          moreLabel={t("allSpecialties")}
          moreHref={`/${locale}/consultations/specialties`}
          selectedSlug={sp.specialty?.trim()}
          tiles={tiles}
          hrefOf={(slug) => pageHref(filterPageParams(filters, { q: sp.q, specialty: slug, sort: sp.sort }))}
        />
      ) : null}
      <VisitTypeCards
        label={t("visitType")}
        value={shownType ?? ""}
        cards={[
          { value: "clinic", title: typeLabels.clinic, subtitle: t("visitSubClinic"), href: typeHref("clinic"), icon: "hospital", tone: "blue" },
          { value: "video", title: typeLabels.video, subtitle: t("visitSubVideo"), href: typeHref("video"), icon: "video-camera", tone: "violet" },
          { value: "home_visit", title: typeLabels.home_visit, subtitle: t("visitSubHome"), href: typeHref("home_visit"), icon: "house", tone: "peach" },
        ]}
      />
      {filters.payment === "insurance" && !filters.insurer ? (
        <InsurerFromPolicy
          pageHref={pageHref(filterPageParams(filters, { ...text, sort: sp.sort }))}
          noPolicyText={t("paymentInsuranceNoPolicy")}
          addPolicyHref={`/${locale}/insurance/add-policy`}
          addPolicyText={t("paymentAddPolicy")}
        />
      ) : null}
      {failed ? (
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      ) : doctors.length === 0 ? (
        <ConsultState
          kind="empty"
          title={t("emptyTitle")}
          body={t("emptyBody")}
          // a way out of the empty list: clear the search when one is active, otherwise back to the consultations hub
          actionLabel={sp.q || sp.specialty || sp.sort || filtered ? t("clearSearch") : t("backToConsultations")}
          actionHref={sp.q || sp.specialty || sp.sort || filtered ? `/${locale}/consultations/doctors` : `/${locale}/consultations`}
        />
      ) : (
        <ul className={`${styles.list} ${styles.grid}`} aria-label={t("title")}>
          {doctors.map((doctor) => {
            const modes: Array<{ mode: ConsultMode; label: string }> = [];
            const withFee = (label: string, fee: number | undefined) => (fee !== undefined ? `${label} · ${formatPrice(locale, fee).text}` : label);
            if (doctor.clinic) modes.push({ mode: "clinic", label: withFee(t("service_clinic"), doctor.prices?.clinic) });
            if (doctor.home) modes.push({ mode: "home", label: withFee(t("service_home"), doctor.prices?.home) });
            if (doctor.online) modes.push({ mode: "online", label: withFee(t("service_video"), doctor.prices?.video) });
            return (
              <li key={doctor.id}>
                <DoctorListCard
                  locale={locale}
                  href={`/${locale}/consultations/doctors/${doctor.id}`}
                  name={doctorDisplayName(doctor, locale) ?? t("nameUnavailable")}
                  grade={doctor.degree}
                  specialty={specialtyLabel(names, doctor.specialty) ?? undefined}
                  place={doctorPlace(doctor, locale)}
                  modes={modes}
                  rating={doctor.rating !== undefined && doctor.reviews ? { value: doctor.rating, count: doctor.reviews } : undefined}
                  nextSlotIso={doctor.nextSlot}
                  price={doctor.price}
                  bookLabel={c("book")}
                  verifiedLabel={doctor.verified ? t("verifiedDoctor") : undefined}
                  photoSrc={doctor.photo}
                  availableLabel={doctor.isOnline ? t("onlineNow") : undefined}
                  facts={cardFacts(doctor, locale, { years: (n) => t("yearsExperience", { n }), male: t("genderMale"), female: t("genderFemale"), insurance: t("insuranceAccepted"), wait: (n) => t("avgWait", { n }) })}
                  factsLabel={t("factsLabel")}
                />
                <GuaranteeLine text={guaranteeText} />
              </li>
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
