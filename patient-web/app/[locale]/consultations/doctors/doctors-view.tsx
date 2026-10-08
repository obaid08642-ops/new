import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { doctorDisplayName, extractDoctors } from "@/lib/api/doctors";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { isOutage } from "@/lib/api/outage";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import type { ConsultMode } from "@/components-next/ui-generated/components/contract";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import styles from "@/components-next/consult/consult.module.css";

export type DoctorsViewProps = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; specialty?: string; sort?: "rating" | "price" | "wait" }> };
type Props = DoctorsViewProps;

/** F82-3: the list is one view with two routes: the static page (no query) and its dynamic twin under /q (lib/security/query-twin.ts). */
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
  const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: ["rating", "price", "wait"].includes(sp.sort ?? "") ? sp.sort : undefined });
  // A failure (no answer, or a 5xx) is not an empty list: this page is cached, and a cached "no doctors" would replace the good copy.
  if (isOutage(response)) throw new PublicDataUnavailableError("doctors");
  if (response && response.ok) doctors = extractDoctors(await response.json().catch(() => null));

  const sortHref = (sort: string) => `/${locale}/consultations/doctors?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : sp.specialty ? { specialty: sp.specialty } : {}), sort }).toString()}`;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} width="wide">
      <StaleWhileRevalidate maxAgeSeconds={searchParams === undefined ? DOCTORS_REVALIDATE_SECONDS : undefined} />
      <form className={styles.search} method="get" role="search">
        <label className={styles.searchField}>
          <Icon name="search" size={20} tone="secondary" />
          <span className="sr-only">{t("searchLabel")}</span>
          <input id="doctor-search" name="q" defaultValue={sp.q ?? sp.specialty ?? ""} placeholder={t("searchPlaceholder")} className={styles.searchInput} />
        </label>
        <Button type="submit" label={t("search")} size="lg" />
      </form>
      <LinkSegmented
        label={t("sortLabel")}
        value={sp.sort ?? ""}
        options={[
          { value: "rating", label: t("sortRating"), href: sortHref("rating") },
          { value: "price", label: t("sortPrice"), href: sortHref("price") },
          { value: "wait", label: t("sortWait"), href: sortHref("wait") },
        ]}
      />
      {doctors.length === 0 ? (
        <ConsultState kind="empty" title={t("emptyTitle")} body={t("emptyBody")} />
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
                />
              </li>
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
