import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, ClipboardList, PackageSearch } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderRows } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./orders.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/orders/mine", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const orders = extractOrderRows(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t("detailNotice") : t("empty")}</p></div><span className={styles.introIcon}><ClipboardList size={28} aria-hidden="true" /></span></section>{orders.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{orders.map((order) => <Link className={styles.card} key={order.id} href={`/${locale}/orders/${order.id}`}><span className={styles.cardIcon}><ClipboardList size={21} aria-hidden="true" /></span><span className={styles.cardBody}><span className={styles.reference}>{order.reference || t("untitled")}</span><span className={styles.status}>{order.status || t("statusUnavailable")}</span><span className={styles.open}>{t("open")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" /></Link>)}</section>}</main>;
}
