import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Hash, MapPinned, PackageCheck, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderTracking, parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorOrders } from "@/components-next/vector-illustrations";
import styles from "../order-detail.module.css";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export default async function OrderTrackingPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/orders/${orderId}/tracking`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const tracking = extractOrderTracking(await response.json().catch(() => null));
  if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const status = tracking.status || t("statusUnavailable");
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/orders/${orderId}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}>
      <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><span className={styles.status}>{status}</span></div>
      <div className={styles.heroVector}><VectorOrders size={75} /></div>
    </section>
    <section className={styles.detail} aria-label={t("title")}>
      <dl className={styles.grid}>
        <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>
        {tracking.pharmacyName ? <div className={styles.item}><dt>{t("pharmacy")}</dt><dd>{tracking.pharmacyName}</dd></div> : null}
        {tracking.deliveryMode ? <div className={styles.item}><dt>{t("deliveryMode")}</dt><dd>{tracking.deliveryMode === "PICKUP" ? t("pickup") : t("delivery")}</dd></div> : null}
        {tracking.etaMinutes !== undefined ? <div className={styles.item}><dt>{t("eta", { value: tracking.etaMinutes })}</dt><dd>{tracking.updatedAt || t("notAvailable")}</dd></div> : null}
        {tracking.total !== undefined ? <div className={styles.item}><dt>{t("total")}</dt><dd>{tracking.total} {tracking.currency || ""}</dd></div> : null}
      </dl>
      <p className={styles.notice}>{t("detailNotice")}</p>
    </section>
  </main>;
}
