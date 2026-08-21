import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartPrescriptionPreviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/cart/prescription", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileCheck2 size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const payload = await response.json().catch(() => null) as { prescription_id?: unknown; medications?: unknown } | null;
  const medications = Array.isArray(payload?.medications) ? payload.medications.flatMap((item) => typeof item === "object" && item && typeof (item as { name?: unknown }).name === "string" ? [{ name: (item as { name: string }).name }] : []) : [];
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><FileCheck2 size={27} aria-hidden="true" /></span></section>
    {medications.length ? <section className={styles.groups}><article className={styles.group}><div className={styles.groupHead}><h2>{t("itemCount")}</h2><span>{medications.length}</span></div>{medications.map((item, index) => <div className={styles.item} key={`${item.name}-${index}`}><strong>{item.name}</strong><span>{t("notAvailable")}</span></div>)}</article></section> : <section className={styles.state}><FileCheck2 size={25} aria-hidden="true" /><h2>{t("empty")}</h2></section>}
    <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
  </main>;
}
