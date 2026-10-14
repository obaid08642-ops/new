import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { LocalDate } from "@/components-next/orders/local-date";
import { ReturnStatusChip, returnStatus } from "@/components-next/returns/return-kit";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

type ReturnRequest = { id: string; status: string; amount?: number; reason?: string; createdAt?: string };

function extractReturns(payload: unknown): ReturnRequest[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.returns, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r || !r.id) return [];
    return [{
      id: String(r.id),
      status: String(r.status ?? r.state ?? "processing"),
      amount: Number(r.refund_amount ?? r.amount ?? NaN) || undefined,
      reason: typeof r.reason === "string" ? r.reason : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}

/** `/returns`: the patient's return requests (GET /pharmacy/returns), restyled on the shared rows; every value is the server's. */
export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Returns");
  const w = await getTranslations("ReturnsWeb");
  const rs = await getTranslations("RouteState");
  const response = await callPatientApi("/pharmacy/returns", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/orders`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("error")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const returns = extractReturns(await response.json().catch(() => null));
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      <ButtonLink href={`/${locale}/returns/new-request`} label={w("newRequest")} fullWidth />
      {returns.length === 0 ? (
        <ConsultState kind="empty" icon="arrows-left-right" tone="amber" title={t("empty")} />
      ) : (
        <ul className={forms.list} aria-label={t("title")}>
          {returns.map((item) => {
            const status = returnStatus(item.status);
            return (
              <li key={item.id}>
                <RowCard
                  href={`/${locale}/returns/${encodeURIComponent(item.id)}`}
                  icon="arrows-left-right"
                  tone="amber"
                  title={item.reason || item.id}
                  sub={item.amount !== undefined ? formatMoney(locale, item.amount) : undefined}
                  extra={
                    <>
                      {item.createdAt ? <LocalDate iso={item.createdAt} locale={locale} /> : null}
                      <ReturnStatusChip status={status} label={w(`status.${status}`)} />
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
