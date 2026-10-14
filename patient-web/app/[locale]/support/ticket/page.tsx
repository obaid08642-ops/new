import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { LocalDate } from "@/components-next/orders/local-date";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

type Ticket = { id: string; title: string; status: string; createdAt?: string };

function readTickets(payload: unknown): Ticket[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { data?: unknown }) : null;
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(payload) ? payload : [];
  return list.flatMap((item: unknown, index: number) => {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!r) return [];
    return [{
      id: String(r.id ?? index),
      title: String(r.title ?? r.name ?? r.type ?? r.id ?? ""),
      status: typeof r.status === "string" ? r.status : "",
      createdAt: typeof r.created_at === "string" ? r.created_at : undefined,
    }];
  });
}

/** `/support/ticket`: the patient's support requests (GET /support/requests/mine), the flow screen the help screen links to. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SupportTicket");
  const rs = await getTranslations("RouteState");
  const a = await getTranslations("AccountWeb");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/support/requests/mine", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/settings/help?tab=requests`;
  if (!res.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={a("loadErrorTitle")} body={a("loadErrorBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const list = readTickets(await res.json().catch(() => null));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {list.length === 0 ? (
        <ConsultState kind="empty" icon="headset" tone="mint" title={t("empty")} />
      ) : (
        <ul className={forms.list} aria-label={t("title")}>
          {list.map((item) => (
            <li key={item.id}>
              <RowCard
                icon="headset"
                tone="mint"
                title={item.title}
                extra={
                  <>
                    {item.createdAt ? <LocalDate iso={item.createdAt} locale={locale} /> : null}
                    {item.status ? <StatusChip label={item.status} tone="ink" /> : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </ConsultPage>
  );
}
