import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { extractHomeCareService } from "@/lib/api/home-care-services";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "../services.module.css";

type Props = { params: Promise<{ locale: string; serviceId: string }> };
export default async function HomeCareServicePage({ params }: Props) {
  const { locale, serviceId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("HomeCareServices"); const token = await requirePatientAccess(locale); const response = await getPatientHomeCareService(serviceId, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><VectorNursing size={54} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/home-care/services`} className={styles.action}>{t("back")}</Link></section></main>;
  const service = extractHomeCareService(await response.json().catch(() => null)); if (!service) notFound();
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight; const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr; const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
  return <main className={`main ${styles.page}`}><Link href={`/${locale}/home-care/services`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon}><VectorNursing size={42} aria-hidden="true" /></div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{name}</h1>{description ? <p className={styles.description}>{description}</p> : null}<div className={styles.facts}>{service.price !== undefined ? <span><strong>{t("priceLabel")}</strong>{t("price", { value: service.price })}</span> : null}{service.durationValue !== undefined || service.duration ? <span><Clock3 size={16} aria-hidden="true" /><strong>{t("durationLabel")}</strong>{[service.durationValue, service.duration].filter(Boolean).join(" ")}</span> : null}{service.insuranceAvailable ? <span><ShieldCheck size={16} aria-hidden="true" />{t("insurance")}</span> : null}</div><p className={styles.notice}>{t("bookingNotice")}</p></article></main>;
}
