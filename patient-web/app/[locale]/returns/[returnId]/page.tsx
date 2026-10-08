import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { LocalDate } from "@/components-next/orders/local-date";
import { ReturnStatusChip, returnStatus } from "@/components-next/returns/return-kit";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; returnId: string }> };

/** `/returns/[returnId]`: one return request (GET /pharmacy/returns/:id) as the server holds it. */
export default async function ReturnDetailPage({ params }: Props) {
  const { locale, returnId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9_-]{1,128}$/.test(returnId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Returns");
  const w = await getTranslations("ReturnsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/pharmacy/returns/${encodeURIComponent(returnId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/returns`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={w("detailTitle")} backHref={back}>
        <ConsultState kind="error" title={t("error")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const item = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  if (!item || typeof item !== "object") notFound();
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const created = str(item.createdAt) || str(item.created_at);
  const amount = num(item.amount);
  const details = str(item.details) || str(item.notes);
  const status = str(item.status) ? returnStatus(str(item.status)) : undefined;
  const rows: FactRow[] = [
    ...(status ? [{ label: w("fieldStatus"), value: <ReturnStatusChip status={status} label={w(`status.${status}`)} /> }] : []),
    ...(amount !== undefined ? [{ label: w("fieldAmount"), value: <bdi>{formatMoney(locale, amount)}</bdi> }] : []),
    ...(created ? [{ label: w("fieldDate"), value: <LocalDate iso={created} locale={locale} /> }] : []),
  ];

  return (
    <ConsultPage locale={locale} title={w("detailTitle")} backHref={back}>
      <Hero icon="arrows-left-right" tone="amber" title={str(item.reason) || String(item.id || returnId)} />
      {rows.length > 0 ? <SectionCard id="return-facts"><Facts rows={rows} label={w("detailTitle")} /></SectionCard> : null}
      {details ? <SectionCard id="return-details" title={w("fieldDetails")}><p className={forms.body}>{details}</p></SectionCard> : null}
    </ConsultPage>
  );
}
