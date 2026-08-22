import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Clock3, Star, Stethoscope } from "lucide-react";
import { extractDoctor, extractDoctorSlots } from "@/lib/api/doctors";
import { getPublicDoctor, getPublicDoctorSlots } from "@/lib/api/doctors-server";
import { isLocale } from "@/lib/i18n";
import styles from "../doctors.module.css";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<{ date?: string; service_type?: string }> };
const serviceTypes = ["video", "clinic", "home"] as const;
function today() { return new Date().toISOString().slice(0, 10); }
export default async function DoctorDetailPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = await searchParams; const date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(query.date ?? "") ? query.date! : today(); const serviceType = serviceTypes.includes(query.service_type as typeof serviceTypes[number]) ? query.service_type as typeof serviceTypes[number] : "video";
  const t = await getTranslations("Doctors"); const response = await getPublicDoctor(doctorId); if (!response || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/consultations/doctors`} className={styles.action}>{t("retry")}</Link></section></main>;
  const doctor = extractDoctor(await response.json().catch(() => null)); if (!doctor) notFound();
  const slotsResponse = await getPublicDoctorSlots({ id: doctor.id, date, serviceType }); const slots = slotsResponse?.ok ? extractDoctorSlots(await slotsResponse.json().catch(() => null)) : null; const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon}><Stethoscope size={34} aria-hidden="true" /></div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{doctor.name ?? t("nameUnavailable")}</h1>{doctor.degree ? <p className={styles.detailLine}><BadgeCheck size={17} aria-hidden="true" />{doctor.degree}</p> : null}{doctor.specialty ? <p className={styles.detailLine}><Stethoscope size={17} aria-hidden="true" />{doctor.specialty}</p> : null}<div className={styles.facts}>{doctor.rating !== undefined ? <span><Star size={16} aria-hidden="true" /><strong>{t("rating", { value: doctor.rating })}</strong></span> : null}{doctor.experienceYears !== undefined ? <span><Clock3 size={16} aria-hidden="true" /><strong>{t("experience", { value: doctor.experienceYears })}</strong></span> : null}{doctor.facility ? <span><Building2 size={16} aria-hidden="true" />{doctor.facility}</span> : null}</div><section className={styles.slotPanel} aria-labelledby="slots-title"><h2 id="slots-title">{t("slotsTitle")}</h2><nav className={styles.slotTabs} aria-label={t("serviceTypeLabel")}>{serviceTypes.map((type) => <Link key={type} className={type === serviceType ? styles.sortActive : styles.sort} href={`/${locale}/consultations/doctors/${doctor.id}?date=${date}&service_type=${type}`}>{t(`service_${type}`)}</Link>)}</nav><p className={styles.slotDate}>{t("slotsForDate", { date })}</p>{slots?.slots.length ? <div className={styles.slotGrid}>{slots.slots.map((slot) => <span key={slot.start} className={slot.available ? styles.slotAvailable : styles.slotUnavailable} aria-label={slot.available ? t("available") : t("unavailable")}>{slot.label}</span>)}</div> : <p className={styles.notice}>{t(slots?.reason === "closed" ? "slotsClosed" : "slotsEmpty")}</p>}</section><p className={styles.notice}>{t("detailNotice")}</p></article></main>;
}
