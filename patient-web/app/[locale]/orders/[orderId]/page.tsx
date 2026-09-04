import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderDetail, parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorOrders } from "@/components-next/vector-illustrations";
import { ChevronLeft, Hash, PackageCheck, ShieldCheck } from "lucide-react";
import styles from "./order-detail.module.css";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const detail = extractOrderDetail(await response.json().catch(() => null));
  if (!detail) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const status = typeof detail.status === "string" ? detail.status : t("statusUnavailable");
  const reference = typeof detail.orderNumber === "string" ? detail.orderNumber : typeof detail.reference === "string" ? detail.reference : orderId;
  const governedState = typeof detail.governed_state === "string" ? detail.governed_state : "";
  const canOpenOffers = ["ORDER_BROADCASTING", "OFFERS_READY", "OFFER_SELECTED", "NEGOTIATION_REQUIRED", "FINAL_QUOTE_READY", "FINAL_QUOTE_ACCEPTED", "INSURANCE_PROCESSING", "INSURANCE_DECISION_READY", "CO_PAY_PENDING"].includes(governedState);
  const offersLabel = locale === "ar" ? "عرض عروض الصيدليات" : "View pharmacy offers";
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/orders`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}>
      <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{reference}</h1><span className={styles.status}>{status}</span></div>
      <div className={styles.heroVector}><VectorOrders size={75} /></div>
    </section>
    <section className={styles.detail} aria-label={t("title")}>
      <dl className={styles.grid}>
        <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>
      </dl>
      <p className={styles.notice}>{t("detailNotice")}</p>
      <nav className={styles.actions} aria-label={t("title")}>
        {canOpenOffers && <Link className={styles.back} href={`/${locale}/orders/${orderId}/offers`}>{offersLabel}</Link>}
        <Link className={styles.back} href={`/${locale}/orders/${orderId}/tracking`}>{t("open")}</Link>
      </nav>
    </section>
  </main>;
}
