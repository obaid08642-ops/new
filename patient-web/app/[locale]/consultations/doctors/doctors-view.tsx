import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import Link from "next/link";
import { SuggestInput } from "@/components-next/search/suggest-input";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SPECIALTY_SLUGS, isSpecialtySlug, specialtyLabel } from "@/lib/specialties";
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
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { DoctorQuickFilters } from "@/components-next/consult/doctor-quick-filters";
import { InsurerFromPolicy } from "@/components-next/consult/insurer-from-policy";
import { DEGREES, effectiveType, GENDER_FILTERS, type GenderFilter, filterPageParams, nearestApplies, parseDoctorFilters, PAYMENT_FILTERS, serverOrdersList, VISIT_TYPES, type Degree, type DoctorFilters, type PaymentFilter, type VisitType } from "@/lib/consult/doctor-filters";
import { formatPrice } from "@/lib/format-price";
import { cardFacts } from "@/lib/consult/doctor-card-facts";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import styles from "@/components-next/consult/consult.module.css";

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
  const home = await getTranslations("HomeWeb");
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
  // the busiest specialties with their doctor counts, as chips (the board's specialty row); a failed read leaves them out
  const specialtyRes = await getCachedSpecialties();
  const count = new Intl.NumberFormat(locale);
  const chips = (specialtyRes?.ok ? extractSpecialties(await specialtyRes.json().catch(() => null)) : [])
    .flatMap((row) => (row.slug && isSpecialtySlug(row.slug) && row.count ? [{ slug: row.slug, count: row.count }] : []))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // a specialty slug (from the pharmacy cart "Consult a doctor") filters the list and shows by its name, never as raw text in the search field
  const specialtyName = specialtyLabel(names, sp.specialty);

  // every link keeps the text search and the chosen filters, so the URL is the whole state (shareable)
  const text = { q: sp.q, specialty: sp.specialty };
  const pageHref = (params: URLSearchParams) => `/${locale}/consultations/doctors${params.size ? `?${params.toString()}` : ""}`;
  const sortHref = (sort: string) => pageHref(filterPageParams(filters, { ...text, sort }));
  const withFilters = (next: Partial<DoctorFilters>, sort = sp.sort) => pageHref(filterPageParams({ ...filters, ...next }, { ...text, sort }));
  const typeHref = (type: VisitType) => withFilters({ type: filters.type === type ? undefined : type, nearest: filters.nearest && nearestApplies(type) });
  const genderHref = (gender: GenderFilter | undefined) => withFilters({ gender });
  const paymentHref = (payment: PaymentFilter) => withFilters({ payment: filters.payment === payment ? undefined : payment });
  const nearestBase = filterPageParams({ ...filters, nearest: false, place: null }, { ...text, sort: sp.sort });
  nearestBase.set("nearest", "1");
  const degreeHref = (degree: Degree) => withFilters({ degree: filters.degree === degree ? undefined : degree });
  const filtered = Boolean(filters.type || filters.gender || filters.degree || filters.payment || filters.availableNow || filters.nearest);
  const typeLabels: Record<VisitType, string> = { clinic: t("service_clinic"), video: t("service_video"), home_visit: t("service_home") };

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} width="wide" mapType="doctor" mapLabel={home("svcMap")}>
      <StaleWhileRevalidate maxAgeSeconds={searchParams === undefined ? DOCTORS_REVALIDATE_SECONDS : undefined} />
      <form className={styles.search} method="get" role="search">
        <SuggestInput locale={locale} id="doctor-search" name="q" defaultValue={sp.q ?? (specialtyName ? "" : sp.specialty ?? "")} placeholder={t("searchPlaceholder")} label={t("searchLabel")} fieldClassName={styles.searchField} inputClassName={styles.searchInput}>
          <Icon name="search" size={20} tone="secondary" />
        </SuggestInput>
        {[...filterPageParams(filters)].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <label className={`${styles.searchField} ${styles.searchSelect}`}>
          <span className="sr-only">{t("specialtyLabel")}</span>
          <select name="specialty" defaultValue={isSpecialtySlug(sp.specialty) ? sp.specialty.trim() : ""}>
            <option value="">{t("allSpecialties")}</option>
            {SPECIALTY_SLUGS.map((slug) => <option key={slug} value={slug}>{names(slug)}</option>)}
          </select>
        </label>
        <Button type="submit" label={t("search")} size="lg" />
      </form>
      <Link className={styles.activeFilterClear} href={`/${locale}/appointments`}>{c("actionMyAppointments")}</Link>
      {specialtyName ? (
        <div className={styles.activeFilter}>
          <StatusChip label={specialtyName} tone="blue" />
          <Link className={styles.activeFilterClear} href={`/${locale}/consultations/doctors`}>{t("clearSearch")}</Link>
        </div>
      ) : null}
      {chips.length ? (
        <LinkSegmented
          label={t("specialtyLabel")}
          value={sp.specialty ?? ""}
          options={[{ value: "", label: t("allSpecialties"), href: pageHref(filterPageParams(filters, { q: sp.q, sort: sp.sort })) }, ...chips.map((chip) => ({ value: chip.slug, label: `${names(chip.slug)} (${count.format(chip.count)})`, href: pageHref(filterPageParams(filters, { q: sp.q, specialty: chip.slug, sort: sp.sort })) }))]}
        />
      ) : null}
      <LinkSegmented
        label={t("visitType")}
        value={shownType ?? ""}
        options={VISIT_TYPES.map((type) => ({ value: type, label: typeLabels[type], href: typeHref(type) }))}
      />
      <LinkSegmented
        label={t("genderLabel")}
        value={filters.gender ?? "any"}
        options={[{ value: "any", label: t("genderAny"), href: genderHref(undefined) }, ...GENDER_FILTERS.map((gender) => ({ value: gender, label: t(gender === "male" ? "genderMale" : "genderFemale"), href: genderHref(gender) }))]}
      />
      <LinkSegmented
        label={t("gradeLabel")}
        value={filters.degree ?? ""}
        options={DEGREES.map((degree) => ({ value: degree, label: t(`degree_${degree}`), href: degreeHref(degree) }))}
      />
      <LinkSegmented
        label={t("paymentLabel")}
        value={filters.payment ?? ""}
        options={PAYMENT_FILTERS.map((payment) => ({ value: payment, label: t(`payment_${payment}`), href: paymentHref(payment) }))}
      />
      {filters.payment === "insurance" && !filters.insurer ? (
        <InsurerFromPolicy
          pageHref={pageHref(filterPageParams(filters, { ...text, sort: sp.sort }))}
          noPolicyText={t("paymentInsuranceNoPolicy")}
          addPolicyHref={`/${locale}/insurance/add-policy`}
          addPolicyText={t("paymentAddPolicy")}
        />
      ) : null}
      <DoctorQuickFilters
        availableHref={withFilters({ availableNow: !filters.availableNow })}
        availableOn={filters.availableNow}
        nearestOffHref={withFilters({ nearest: false, place: null })}
        nearestOnBase={pageHref(nearestBase)}
        nearestOn={filters.nearest}
        nearestBlocked={!nearestApplies(shownType)}
        nearestCity={filters.place?.kind === "city" ? filters.place.city : undefined}
      />
      {serverOrdersList(filters) ? null : (
        <LinkSegmented
          label={t("sortLabel")}
          value={sp.sort ?? ""}
          options={[
            { value: "rating", label: t("sortRating"), href: sortHref("rating") },
            { value: "price", label: t("sortPrice"), href: sortHref("price") },
            { value: "wait", label: t("sortWait"), href: sortHref("wait") },
            { value: "available_today", label: t("sortAvailableToday"), href: sortHref("available_today") },
          ]}
        />
      )}
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
