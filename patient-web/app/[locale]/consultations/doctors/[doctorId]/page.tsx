import { optimizedImageSrc } from "@/lib/media/optimized-image";
import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { defaultVisitType, doctorDisplayName, extractDoctor, priceForVisit } from "@/lib/api/doctors";
import { getPublicDoctor } from "@/lib/api/doctors-server";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { formatPrice, formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { ClinicMap, PriceRows, ReviewList, type ReviewItem } from "@/components-next/consult/doctor-sections";
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
  if (doctor.rating !== undefined) stats.push({ value: formatNumber(locale, doctor.rating), label: c("statRating") });
  if (doctor.reviews !== undefined) stats.push({ value: formatNumber(locale, doctor.reviews), label: c("statReviews") });
  if (doctor.experienceYears !== undefined) stats.push({ value: formatNumber(locale, doctor.experienceYears), label: c("statYears") });
  if (doctor.price !== undefined) stats.push({ value: formatPrice(locale, doctor.price).text, label: c("statPrice") });
  const where = [doctor.facility, doctor.district, doctor.city].filter(Boolean).join(" · ");
  const languageNames = new Intl.DisplayNames(locale, { type: "language" });
  const spoken = (doctor.languages ?? []).map((code) => { try { return languageNames.of(code) ?? code; } catch { return code; } }).join(", ");
  const tags = [doctor.isOnline ? t("onlineNow") : undefined, doctor.gender ? t(doctor.gender === "male" ? "genderMale" : "genderFemale") : undefined, doctor.verified ? t("verifiedDoctor") : undefined, doctor.licenseNo ? t("licenseNumber", { number: doctor.licenseNo }) : undefined, doctor.facility, doctor.acceptsInsurance ? c("acceptsInsurance") : undefined].filter((tag): tag is string => Boolean(tag));
  const subLabels = { communication: t("subRatingCommunication"), punctuality: t("subRatingPunctuality"), cleanliness: t("subRatingCleanliness"), value: t("subRatingValue") };
  const reviews: ReviewItem[] = reviewItems(doctor.reviewsData ?? [], locale, { anonymous: t("reviewerAnonymous"), subLabels }).slice(0, 3);
  const services = (doctor.services ?? []).map((x) => ({ label: (locale === "ar" ? x.nameAr ?? x.nameEn : x.nameEn ?? x.nameAr) ?? x.name ?? "", price: x.price !== undefined ? formatPrice(locale, x.price).text : undefined })).filter((x) => x.label);
  const followUpRows = doctor.followUp?.price !== undefined ? [{ label: t("followUpTitle"), price: formatPrice(locale, doctor.followUp.price).text }] : [];
  const followUpWindow = doctor.followUp?.days !== undefined ? t("followUpWindow", { n: formatNumber(locale, doctor.followUp.days) }) : undefined;
  const base = `/${locale}/consultations/doctors/${doctor.id}`;

  return (
    <ConsultPage locale={locale} title={name} backHref={`/${locale}/consultations/doctors`}>
      <JsonLd data={[physician({ name, path: `/consultations/doctors/${doctor.id}`, locale, specialty: doctor.specialty ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/consultations/doctors" }, { name, locale, path: `/consultations/doctors/${doctor.id}` }])]} />
      <ProfileHeader photoSrc={doctor.photo} photoAlt={doctor.photo ? t("doctorPhotoAlt", { name }) : undefined} line={[doctor.degree, specialtyLabel(names, doctor.specialty)].filter(Boolean).join(" · ") || undefined} tags={tags} stats={stats} />
      {doctor.clinicPhotos?.length ? (
        <SectionCard id="clinic-photos-title" title={t("clinicPhotosTitle")}>
          <ul className={styles.gallery}>
            {doctor.clinicPhotos.map((src, index) => (
              <li key={src}><img src={optimizedImageSrc(src, 192)} alt={t("clinicPhotoAlt", { n: index + 1 })} className={styles.galleryImg} loading="lazy" decoding="async" /></li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      {doctor.bio ? (
        <SectionCard id="bio-title" title={t("bioTitle")}>
          <p className={styles.body}>{doctor.bio}</p>
        </SectionCard>
      ) : null}
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
      <SectionCard id="education-title" title={t("educationTitle")}>
        {doctor.education?.length ? (
          <ul className={styles.plain}>
            {doctor.education.map((e, i) => <li key={`${e.degree}-${e.institution}-${i}`}>{[e.degree, e.institution, e.year !== undefined ? formatNumber(locale, e.year) : undefined].filter(Boolean).join(" · ")}{e.verified ? ` · ${t("certVerified")}` : ""}</li>)}
          </ul>
        ) : <p className={`${styles.body} ${styles.muted}`}>{t("educationEmpty")}</p>}
      </SectionCard>
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
      <SectionCard id="slots-title" title={t("slotsTitle")}>
        <LinkSegmented
          label={t("serviceTypeLabel")}
          value={serviceType}
          options={serviceTypes.map((type) => {
            const fee = priceForVisit(doctor, type);
            return { value: type, label: fee !== undefined ? `${t(`service_${type}`)} · ${formatPrice(locale, fee).text}` : t(`service_${type}`), href: `${base}?service_type=${type}` };
          })}
        />
        {/* One booking path: the booking page has the day strip, the slots, the slot hold, the address of a home visit and the payment. */}
        <ButtonLink href={`/${locale}/consultations/book/${encodeURIComponent(doctor.id)}?service_type=${serviceType}`} label={t("chooseDayTime")} fullWidth />
      </SectionCard>
      <Notice>{t("detailNotice")}</Notice>
    </ConsultPage>
  );
}
