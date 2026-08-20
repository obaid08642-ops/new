import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderDetail, parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const detail = extractOrderDetail(await response.json().catch(() => null));
  if (!detail) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const status = typeof detail.status === "string" ? detail.status : t("statusUnavailable");
  const reference = typeof detail.orderNumber === "string" ? detail.orderNumber : typeof detail.reference === "string" ? detail.reference : orderId;
  return <main className="main dashboard"><Link className="back-link" href={`/${locale}/orders`}>{t("back")}</Link><div className="eyebrow">{t("eyebrow")}</div><h1>{reference}</h1><section className="status-card"><dl className="order-detail"><div><dt>{t("status")}</dt><dd>{status}</dd></div><div><dt>{t("secureId")}</dt><dd>{orderId}</dd></div></dl><p>{t("detailNotice")}</p></section></main>;
}
