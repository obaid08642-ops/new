import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderRows } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const orders = extractOrderRows(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{orders.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="order-grid" aria-label={t("title")}>{orders.map((order) => <Link className="order-card" key={order.id} href={`/${locale}/orders/${order.id}`}><span className="order-reference">{order.reference || t("untitled")}</span><strong>{order.status || t("statusUnavailable")}</strong><span className="order-open">{t("open")}</span></Link>)}</section>}</main>;
}
