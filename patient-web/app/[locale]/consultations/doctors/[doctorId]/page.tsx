import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { defaultVisitType, doctorDisplayName, doctorPlace, extractDoctor, priceForVisit, spokenLanguages } from "@/lib/api/doctors";
import { getPublicDoctor } from "@/lib/api/doctors-server";
import { getPublicConfig } from "@/lib/api/public-config-server";
import { parseLateGuarantee } from "@/lib/consult/late-guarantee";
import { GuaranteeLine, LicenseLine } from "@/components-next/consult/differentiators";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { formatPrice, formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { BookingSelectionProvider, StickyBookBar } from "@/components-next/consult/doctor-booking-bar";
import { summaryItems } from "@/lib/consult/doctor-summary";
import { DoctorSchedule } from "@/components-next/consult/doctor-schedule";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { BioSection, ClinicGallery, ClinicMap, EducationSection, PriceRows, ReviewList, type ReviewItem } from "@/components-next/consult/doctor-sections";
import { reviewItems } from "@/lib/consult/doctor-reviews";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<{ service_type?: string }> };
const serviceTypes = ["video", "clinic", "home"] as const;
export async function generateMetadata({ params }: { params: Promise<{ doctorId: string; locale: string }> }): Promise<Metadata> {
  const { locale, doctorId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  // This is the booking screen of a doctor. The doctor's one public page is /doctor/{slug}: the
  // canonical points there and this screen is not indexed on its own (no duplicate doctor page).
  const response = await getPublicDoctor(doctorId).catch(() => null);
  const raw = response && response.ok ? await response.json().catch(() => null) : null;
  const doctor = extractDoctor(raw);
  if (!doctor) return { robots: { index: false, follow: false } };
  const record = ((raw as { data?: unknown } | null)?.data ?? raw) as { slug?: unknown } | null;
  const key = typeof record?.slug === "string" && record.slug ? record.slug : doctor.id;
  const profilePath = `/doctor/${encodeURIComponent(key)}`;
  const name = doctorDisplayName(doctor, locale) || t("title");
  return {
    title: `${name} | ${t("title")}`,
    description: t("subtitle"),
    alternates: {
      canonical: localizedUrl(locale, profilePath),
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, profilePath)])), "x-default": localizedUrl("ar", profilePath) },
    },
    openGraph: { type: "profile", url: localizedUrl(locale, profilePath), title: name },
    robots: { index: false, follow: true },
  };
}

export default async function DoctorDetailPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = await searchParams; const requestedType = serviceTypes.includes(query.service_type as typeof serviceTypes[number]) ? query.service_type as typeof serviceTypes[number] : undefined;
  const t = await getTranslations("Doctors");
  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");

  let doctor = null;
  try {
    const response = await getPublicDoctor(doctorId);
    if (response && response.ok) {
      doctor = extractDoctor(await response.json().catch(() => null));
    }
  } catch {}

  if (!doctor) {
    notFound();
  }
  // Without a visit type in the link, the page opens on the first mode the doctor offers (clinic first), not always video.
  const serviceType = requestedType ?? defaultVisitType(doctor);

  const name = doctorDisplayName(doctor, locale) ?? t("nameUnavailable");
  const stats: ProfileStat[] = [];
  // rating, review count and fee are in the summary line under the photo; the tiles carry only what it does not
  if (doctor.experienceYears !== undefined) stats.push({ value: formatNumber(locale, doctor.experienceYears), label: c("statYears") });
  const where = [doctorPlace(doctor, locale), doctor.district, doctor.city].filter(Boolean).join(" · ");
  const spoken = spokenLanguages(locale, doctor.languages);
  const tags = [doctor.isOnline ? t("onlineNow") : undefined, doctor.gender ? t(doctor.gender === "male" ? "genderMale" : "genderFemale") : undefined, doctor.verified ? t("verifiedDoctor") : undefined, doctorPlace(doctor, locale), doctor.acceptsInsurance ? c("acceptsInsurance") : undefined].filter((tag): tag is string => Boolean(tag));
  const educationRows = (doctor.education ?? []).map((e) => `${[e.degree, e.institution, e.year !== undefined ? formatNumber(locale, e.year) : undefined].filter(Boolean).join(" · ")}${e.verified ? ` · ${t("certVerified")}` : ""}`);
  const subLabels = { communication: t("subRatingCommunication"), punctuality: t("subRatingPunctuality"), cleanliness: t("subRatingCleanliness"), value: t("subRatingValue") };
  const reviews: ReviewItem[] = reviewItems(doctor.reviewsData ?? [], locale, { anonymous: t("reviewerAnonymous"), subLabels }).slice(0, 3);
  const services = (doctor.services ?? []).map((x) => ({ label: (locale === "ar" ? x.nameAr ?? x.nameEn : x.nameEn ?? x.nameAr) ?? x.name ?? "", price: x.price !== undefined ? formatPrice(locale, x.price).text : undefined })).filter((x) => x.label);
  const followUpRows = doctor.followUp?.price !== undefined ? [{ label: t("followUpTitle"), price: formatPrice(locale, doctor.followUp.price).text }] : [];
  const followUpWindow = doctor.followUp?.days !== undefined ? t("followUpWindow", { n: formatNumber(locale, doctor.followUp.days) }) : undefined;
  const guarantee = parseLateGuarantee(await getPublicConfig().catch(() => null));
  const bookHref = `/${locale}/consultations/book/${encodeURIComponent(doctor.id)}`;
  const flags = { clinic: doctor.clinic, video: doctor.online, home: doctor.home } as const;
  const offeredTypes = serviceTypes.filter((type) => flags[type]);
  const feeTexts: Partial<Record<(typeof serviceTypes)[number], string>> = {};
  for (const type of offeredTypes) { const fee = priceForVisit(doctor, type); if (fee !== undefined) feeTexts[type] = formatPrice(locale, fee).text; }
  const headerFee = priceForVisit(doctor, serviceType) ?? doctor.price;
  const summary = summaryItems({ locale, specialty: specialtyLabel(names, doctor.specialty) || undefined, rating: doctor.rating, reviews: doctor.reviews, feeText: headerFee !== undefined ? formatPrice(locale, headerFee).text : undefined, waitMinutes: doctor.waitMinutes, waitText: (time) => t("summaryWait", { time }) });

  return (
    <BookingSelectionProvider>
    <ConsultPage locale={locale} title={name} backHref={`/${locale}/consultations/doctors`} footer={<StickyBookBar locale={locale} bookHref={bookHref} feeTexts={feeTexts} labels={{ region: t("stickyBarLabel"), book: t("stickyBook"), choose: t("stickyChooseTime") }} />}>
      <JsonLd data={[physician({ name, path: `/consultations/doctors/${doctor.id}`, locale, specialty: doctor.specialty ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/consultations/doctors" }, { name, locale, path: `/consultations/doctors/${doctor.id}` }])]} />
      <ProfileHeader photoSrc={doctor.photo} photoAlt={doctor.photo ? t("doctorPhotoAlt", { name }) : undefined} largePhoto summary={summary} summaryLabel={t("summaryLabel")} line={doctor.degree || undefined} tags={tags} stats={stats} />
      <LicenseLine text={doctor.license ? t("licenseLine", { number: doctor.license.number }) : null} verifiedLabel={doctor.license?.verified ? t("licenseVerified") : undefined} />
      <GuaranteeLine text={guarantee ? t("guaranteeLine", { minutes: guarantee.minutes, points: guarantee.points }) : null} />
      <SectionCard id="slots-title" title={t("slotsTitle")}>
        <DoctorSchedule
          doctorId={doctor.id}
          locale={locale}
          types={offeredTypes.map((type) => {
            const fee = priceForVisit(doctor, type);
            return { value: type, label: fee !== undefined ? `${t(`service_${type}`)} · ${formatPrice(locale, fee).text}` : t(`service_${type}`) };
          })}
          initialType={serviceType}
          labels={{ daysLabel: t("scheduleDaysLabel"), timesLabel: t("scheduleTimesLabel"), typesLabel: t("serviceTypeLabel"), today: t("scheduleToday"), tomorrow: t("scheduleTomorrow"), loading: t("scheduleLoading"), empty: t("scheduleEmpty"), noDays: t("scheduleNoDays"), error: t("scheduleError"), retry: t("scheduleRetry") }}
        />
        {/* Book is the sticky bar's job; the booking page keeps the slot hold, the address of a home visit and the payment. */}
      </SectionCard>
      <ClinicGallery id="clinic-photos-title" title={t("clinicPhotosTitle")} photos={doctor.clinicPhotos} openLabel={(n) => t("clinicPhotoOpen", { n })} altLabel={(n) => t("clinicPhotoAlt", { n })} />
      <BioSection id="bio-title" title={t("bioTitle")} bio={doctor.bio} />
      {where || spoken ? (
        <SectionCard id="info-title" title={t("infoTitle")}>
          {where ? (
            <p className={styles.body}>
              {doctor.facilityId ? <Link href={`/${locale}/consultations/clinics/${encodeURIComponent(doctor.facilityId)}`}>{where}</Link> : where}
            </p>
          ) : null}
          {doctor.facilityId ? <ButtonLink href={`/${locale}/consultations/clinics/${encodeURIComponent(doctor.facilityId)}`} label={t("facilityLink")} variant="outline" /> : null}
          {doctor.acceptedInsurance?.length ? <p className={styles.body}>{t("insuranceTitle")}: {doctor.acceptedInsurance.join(", ")}</p> : null}
          {spoken ? <p className={styles.body}>{t("languagesLabel")}: {spoken}</p> : null}
        </SectionCard>
      ) : null}
      <EducationSection id="education-title" title={t("educationTitle")} emptyText={t("educationEmpty")} rows={educationRows} />
      {doctor.certificates?.length ? (
        <SectionCard id="certificates-title" title={t("certificatesTitle")}>
          <ul className={styles.plain}>
            {doctor.certificates.map((c, i) => <li key={`${c.name}-${i}`}>{[c.name, c.issuer, c.year !== undefined ? formatNumber(locale, c.year) : undefined].filter(Boolean).join(" · ")}{c.verified ? ` · ${t("certVerified")}` : ""}</li>)}
          </ul>
        </SectionCard>
      ) : null}
      {services.length || followUpRows.length ? (
        <SectionCard id="services-title" title={t("servicesTitle")}>
          <PriceRows rows={services} />
          {followUpRows.length ? <><h3 className={styles.rowTitle}>{t("followUpTitle")}</h3><PriceRows rows={followUpRows} />{followUpWindow ? <p className={`${styles.body} ${styles.muted}`}>{followUpWindow}</p> : null}</> : null}
        </SectionCard>
      ) : null}
      <SectionCard id="reviews-title" title={t("reviewsTitle")}>
        {reviews.length ? (
          <>
            <ReviewList items={reviews} scoreLabel={(score) => c("ratingOutOf", { value: formatNumber(locale, score) })} />
            <ButtonLink href={`/${locale}/consultations/doctors/${encodeURIComponent(doctor.id)}/reviews`} label={t("reviewsSeeAll")} variant="outline" />
          </>
        ) : <p className={`${styles.body} ${styles.muted}`}>{t("reviewsEmpty")}</p>}
      </SectionCard>
      {serviceType === "clinic" && doctor.clinic ? (
        <ClinicMap id="clinic-location-title" title={t("clinicLocationTitle")} address={doctor.clinicAddress} point={doctor.location} mapTitle={t("clinicMapTitle")} openLabel={t("openInMaps")} />
      ) : null}
      <SectionCard id="faq-title" title={t("faqTitle")}>
        {([["faqCancelQ", "faqCancelA"], ["faqPayQ", "faqPayA"]] as const).map(([q, a]) => (
          <details key={q} className={styles.faq}>
            <summary>{t(q)}</summary>
            <p className={styles.body}>{t(a)}</p>
          </details>
        ))}
      </SectionCard>
      <Notice>{t("detailNotice")}</Notice>
    </ConsultPage>
    </BookingSelectionProvider>
  );
}
