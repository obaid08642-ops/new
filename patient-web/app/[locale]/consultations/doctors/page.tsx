import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { doctorDisplayName, extractDoctors } from "@/lib/api/doctors";
import { getPublicDoctors } from "@/lib/api/doctors-server";
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
import { effectiveType, filterPageParams, nearestApplies, parseDoctorFilters, serverOrdersList, VISIT_TYPES, type DoctorFilters, type VisitType } from "@/lib/consult/doctor-filters";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; specialty?: string; sort?: "rating" | "price" | "wait"; type?: string; available?: string; nearest?: string; lat?: string; lng?: string; city?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
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
export default async function DoctorsPage({ params, searchParams }: Props) {
  const { locale } = await params; const sp = (await searchParams) ?? {}; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Doctors");
  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");
  let doctors: ReturnType<typeof extractDoctors> = [];
  const filters = parseDoctorFilters(sp);
  const shownType = effectiveType(filters);
  let failed = false;
  try {
    const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: ["rating", "price", "wait"].includes(sp.sort ?? "") ? sp.sort : undefined, filters });
    if (response && response.ok) {
      doctors = extractDoctors(await response.json().catch(() => null));
    } else failed = true;
  } catch { failed = true; }

  // a specialty slug (from the pharmacy cart "Consult a doctor") filters the list and shows by its name, never as raw text in the search field
  const specialtyName = sp.q ? null : specialtyLabel(names, sp.specialty);

  // every link keeps the text search and the chosen filters, so the URL is the whole state (shareable)
  const text = { q: sp.q, specialty: sp.specialty };
  const pageHref = (params: URLSearchParams) => `/${locale}/consultations/doctors${params.size ? `?${params.toString()}` : ""}`;
  const sortHref = (sort: string) => pageHref(filterPageParams(filters, { ...text, sort }));
  const withFilters = (next: Partial<DoctorFilters>, sort = sp.sort) => pageHref(filterPageParams({ ...filters, ...next }, { ...text, sort }));
  const typeHref = (type: VisitType) => withFilters({ type: filters.type === type ? undefined : type, nearest: filters.nearest && nearestApplies(type) });
  const nearestBase = filterPageParams({ ...filters, nearest: false, place: null }, { ...text, sort: sp.sort });
  nearestBase.set("nearest", "1");
  const filtered = Boolean(filters.type || filters.availableNow || filters.nearest);
  const typeLabels: Record<VisitType, string> = { clinic: t("service_clinic"), video: t("service_video"), home_visit: t("service_home") };

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} width="wide">
      <StaleWhileRevalidate />
      <form className={styles.search} method="get" role="search">
        <label className={styles.searchField}>
          <Icon name="search" size={20} tone="secondary" />
          <span className="sr-only">{t("searchLabel")}</span>
          <input id="doctor-search" name="q" defaultValue={sp.q ?? (specialtyName ? "" : sp.specialty ?? "")} placeholder={t("searchPlaceholder")} className={styles.searchInput} />
        </label>
        {[...filterPageParams(filters)].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <Button type="submit" label={t("search")} size="lg" />
      </form>
      {specialtyName ? (
        <div className={styles.activeFilter}>
          <StatusChip label={specialtyName} tone="blue" />
          <Link className={styles.activeFilterClear} href={`/${locale}/consultations/doctors`}>{t("clearSearch")}</Link>
        </div>
      ) : null}
      <LinkSegmented
        label={t("visitType")}
        value={shownType ?? ""}
        options={VISIT_TYPES.map((type) => ({ value: type, label: typeLabels[type], href: typeHref(type) }))}
      />
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
            if (doctor.clinic) modes.push({ mode: "clinic", label: t("service_clinic") });
            if (doctor.home) modes.push({ mode: "home", label: t("service_home") });
            if (doctor.online) modes.push({ mode: "online", label: t("service_video") });
            return (
              <li key={doctor.id}>
                <DoctorListCard
                  locale={locale}
                  href={`/${locale}/consultations/doctors/${doctor.id}`}
                  name={doctorDisplayName(doctor, locale) ?? t("nameUnavailable")}
                  grade={doctor.degree}
                  specialty={specialtyLabel(names, doctor.specialty) ?? undefined}
                  place={doctor.facility}
                  modes={modes}
                  rating={doctor.rating !== undefined && doctor.reviews ? { value: doctor.rating, count: doctor.reviews } : undefined}
                  nextSlotIso={doctor.nextSlot}
                  price={doctor.price}
                  bookLabel={c("book")}
                  verifiedLabel={doctor.verified ? t("verifiedDoctor") : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
