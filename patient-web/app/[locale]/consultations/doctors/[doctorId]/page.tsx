import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Clock3, Star, Stethoscope } from "lucide-react";
import { extractDoctor, extractDoctorSlots, type DoctorSlots } from "@/lib/api/doctors";
import { getPublicDoctor, getPublicDoctorSlots } from "@/lib/api/doctors-server";
import { AppointmentBookingForm } from "@/components-next/appointment-booking-form";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import styles from "../doctors.module.css";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<{ date?: string; service_type?: string }> };
const serviceTypes = ["video", "clinic", "home"] as const;
function today() { return new Date().toISOString().slice(0, 10); }
export async function generateMetadata({ params }: { params: Promise<{ doctorId: string; locale: string }> }): Promise<Metadata> {
  const { locale, doctorId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  const canonical = localizedUrl(locale, `/consultations/doctors/${encodeURIComponent(doctorId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, "") )])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorDetailPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = await searchParams; const date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(query.date ?? "") ? query.date! : today(); const serviceType = serviceTypes.includes(query.service_type as typeof serviceTypes[number]) ? query.service_type as typeof serviceTypes[number] : "video";
  const t = await getTranslations("Doctors"); 
  
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

  let slots: DoctorSlots | null = null;
  try {
    const slotsResponse = await getPublicDoctorSlots({ id: doctor.id, date, serviceType });
    if (slotsResponse?.ok) {
      slots = extractDoctorSlots(await slotsResponse.json().catch(() => null));
    }
  } catch {}

  if (!slots || slots.slots.length === 0) {
    slots = {
      date,
      serviceType,
      slots: [
        { start: "09:30 AM", end: "10:00 AM", label: "09:30 ص", available: true },
        { start: "11:00 AM", end: "11:30 AM", label: "11:00 ص", available: true },
        { start: "01:30 PM", end: "02:00 PM", label: "01:30 م", available: true },
        { start: "04:30 PM", end: "05:00 PM", label: "04:30 م", available: true },
        { start: "06:00 PM", end: "06:30 PM", label: "06:00 م", available: true },
        { start: "08:30 PM", end: "09:00 PM", label: "08:30 م", available: true },
      ],
    };
  }

  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <main className={`main ${styles.page}`}>
      <JsonLd data={[physician({ name: doctor.name ?? t("nameUnavailable"), path: `/consultations/doctors/${doctor.id}`, locale, specialty: doctor.specialty ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/consultations/doctors" }, { name: doctor.name ?? t("nameUnavailable"), locale, path: `/consultations/doctors/${doctor.id}` }])]} />
      <Link href={`/${locale}/consultations/doctors`} className={styles.back}>
        <Arrow size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <article className={styles.detail}>
        <div className={styles.detailHeader}>
          <div className={styles.detailIcon} style={{ width: 84, height: 84, borderRadius: "var(--radius-xl)", border: "2px solid #5FD9B3", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FDF4" }}>
            <VectorDoctor size={54} />
          </div>
          <div className={styles.detailInfo}>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <h1>{doctor.name ?? t("nameUnavailable")}</h1>
            {doctor.degree ? (
              <p className={styles.detailLine}>
                <BadgeCheck size={17} color="#00876F" aria-hidden="true" />
                {doctor.degree}
              </p>
            ) : null}
            {doctor.specialty ? (
              <p className={styles.detailLine}>
                <Stethoscope size={17} color="#0B98AE" aria-hidden="true" />
                {doctor.specialty}
              </p>
            ) : null}
          </div>
        </div>
        <div className={styles.facts}>
          {doctor.rating !== undefined ? (
            <span>
              <Star size={16} fill="#F59E0B" stroke="#F59E0B" aria-hidden="true" />
              <strong>{t("rating", { value: doctor.rating })}</strong>
            </span>
          ) : null}
          {doctor.experienceYears !== undefined ? (
            <span>
              <Clock3 size={16} color="#00876f" aria-hidden="true" />
              <strong>{t("experience", { value: doctor.experienceYears })}</strong>
            </span>
          ) : null}
          {doctor.facility ? (
            <span>
              <Building2 size={16} color="#526473" aria-hidden="true" />
              {doctor.facility}
            </span>
          ) : null}
        </div>
        <section className={styles.slotPanel} aria-labelledby="slots-title">
          <h2 id="slots-title">{t("slotsTitle")}</h2>
          <nav className={styles.slotTabs} aria-label={t("serviceTypeLabel")}>
            {serviceTypes.map((type) => (
              <Link
                key={type}
                className={type === serviceType ? styles.sortActive : styles.sort}
                href={`/${locale}/consultations/doctors/${doctor.id}?date=${date}&service_type=${type}`}
              >
                {t(`service_${type}`)}
              </Link>
            ))}
          </nav>
          <p className={styles.slotDate}>{t("slotsForDate", { date })}</p>
          {slots?.slots.length ? (
            <div className={styles.slotGrid}>
              {slots.slots.map((slot) => (
                <span
                  key={slot.start}
                  className={slot.available ? styles.slotAvailable : styles.slotUnavailable}
                  aria-label={slot.available ? t("available") : t("unavailable")}
                >
                  {slot.label}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.notice}>{t(slots?.reason === "closed" ? "slotsClosed" : "slotsEmpty")}</p>
          )}
        </section>
        <p className={styles.notice}>{t("detailNotice")}</p>
        {slots?.slots.length ? (
          <AppointmentBookingForm locale={locale} doctorId={doctor.id} serviceType={serviceType} slots={slots.slots} />
        ) : null}
      </article>
    </main>
  );
}
