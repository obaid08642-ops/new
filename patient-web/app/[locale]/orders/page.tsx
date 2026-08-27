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

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> };
type Tab = "all" | "pending" | "completed" | "cancelled";
const labels: Record<string, Record<Tab, string>> = {
  ar: { all: "الكل", pending: "معلقة", completed: "مكتملة", cancelled: "ملغية" },
  en: { all: "All", pending: "Pending", completed: "Completed", cancelled: "Cancelled" },
  ur: { all: "سب", pending: "زیر التوا", completed: "مکمل", cancelled: "منسوخ" },
  hi: { all: "सभी", pending: "लंबित", completed: "पूर्ण", cancelled: "रद्द" },
  bn: { all: "সব", pending: "অপেক্ষমাণ", completed: "সম্পন্ন", cancelled: "বাতিল" },
  fil: { all: "Lahat", pending: "Nakabinbin", completed: "Nakumpleto", cancelled: "Kinansela" },
};
function bucket(status?: string): Exclude<Tab, "all"> { const value = status?.toLowerCase(); if (["completed", "delivered", "result_ready", "approved", "resolved"].includes(value ?? "")) return "completed"; if (["cancelled", "rejected", "no_show", "refunded"].includes(value ?? "")) return "cancelled"; return "pending"; }

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab: requestedTab } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/patient/pharmacy/orders", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const orders = extractOrderRows(await response.json().catch(() => null));
  const activeTab: Tab = ["pending", "completed", "cancelled"].includes(requestedTab ?? "") ? requestedTab as Exclude<Tab, "all"> : "all";
  const visibleOrders = activeTab === "all" ? orders : orders.filter((order) => bucket(order.status) === activeTab);
  const tabLabels = labels[locale] ?? labels.en;
  return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t("detailNotice") : t("empty")}</p></div><span className={styles.introIcon}><ClipboardList size={28} aria-hidden="true" /></span></section><nav className={styles.tabs} aria-label={t("title")}>{(["all", "pending", "completed", "cancelled"] as const).map((tab) => <Link key={tab} className={activeTab === tab ? styles.tabActive : styles.tab} href={`/${locale}/orders?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined}>{tabLabels[tab]}</Link>)}</nav>{visibleOrders.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{activeTab === "all" ? t("empty") : tabLabels[activeTab]}</p></section> : <section className={styles.grid} aria-label={tabLabels[activeTab]}>{visibleOrders.map((order) => <Link className={styles.card} key={order.id} href={`/${locale}/orders/${order.id}`}><span className={styles.cardIcon}><ClipboardList size={21} aria-hidden="true" /></span><span className={styles.cardBody}><span className={styles.reference}>{order.reference || t("untitled")}</span><span className={styles.status}>{order.status || t("statusUnavailable")}</span><span className={styles.open}>{t("open")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" /></Link>)}</section>}</main>;
}
