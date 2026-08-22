import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Clock3, Star, Stethoscope } from "lucide-react";
import { extractDoctor } from "@/lib/api/doctors";
import { getPublicDoctor } from "@/lib/api/doctors-server";
import { isLocale } from "@/lib/i18n";
import styles from "../doctors.module.css";

type Props = { params: Promise<{ locale: string; doctorId: string }> };
export default async function DoctorDetailPage({ params }: Props) {
  const { locale, doctorId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Doctors"); const response = await getPublicDoctor(doctorId); if (!response || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/consultations/doctors`} className={styles.action}>{t("retry")}</Link></section></main>;
  const doctor = extractDoctor(await response.json().catch(() => null)); if (!doctor) notFound(); const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon}><Stethoscope size={34} aria-hidden="true" /></div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{doctor.name ?? t("nameUnavailable")}</h1>{doctor.degree ? <p className={styles.detailLine}><BadgeCheck size={17} aria-hidden="true" />{doctor.degree}</p> : null}{doctor.specialty ? <p className={styles.detailLine}><Stethoscope size={17} aria-hidden="true" />{doctor.specialty}</p> : null}<div className={styles.facts}>{doctor.rating !== undefined ? <span><Star size={16} aria-hidden="true" /><strong>{t("rating", { value: doctor.rating })}</strong></span> : null}{doctor.experienceYears !== undefined ? <span><Clock3 size={16} aria-hidden="true" /><strong>{t("experience", { value: doctor.experienceYears })}</strong></span> : null}{doctor.facility ? <span><Building2 size={16} aria-hidden="true" />{doctor.facility}</span> : null}</div><p className={styles.notice}>{t("detailNotice")}</p></article></main>;
}
