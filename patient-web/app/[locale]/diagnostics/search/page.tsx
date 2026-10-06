import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { DiagnosticsSearchClient, type SearchRow } from "@/components-next/diagnostics-search-client";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

function extractServices(payload: unknown, locale: string): SearchRow[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(payload) ? payload : [root.data, root.items, root.services, root.results].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const id = typeof o._id === "string" ? o._id : typeof o.id === "string" ? o.id : null;
    if (!id) return [];
    const rtl = locale === "ar" || locale === "ur";
    const name = rtl
      ? (typeof o.name_ar === "string" && o.name_ar) || (typeof o.name === "string" ? o.name : "")
      : (typeof o.name === "string" && o.name) || (typeof o.name_ar === "string" ? o.name_ar : "");
    if (!name) return [];
    const category = rtl
      ? (typeof o.category_ar === "string" ? o.category_ar : undefined)
      : (typeof o.category === "string" ? o.category : undefined);
    const rawPrice = o.price ?? o.base_price;
    return [{ id, name, category, price: typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : undefined }];
  });
}

/** The diagnostics search (canvas/Search): the live `/labs/services` list with a field that filters it as you type. */
export default async function DiagnosticsSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/labs/services", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const backHref = `/${locale}/diagnostics`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("searchTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("searchErrorTitle")} body={t("searchErrorBody")} retryLabel={t("retry")} actionLabel={t("backToHub")} actionHref={backHref} />
      </ConsultPage>
    );
  }
  const sp = await searchParams;
  const services = extractServices(await response.json().catch(() => null), locale);
  return (
    <ConsultPage locale={locale} title={t("searchTitle")} backHref={backHref}>
      <DiagnosticsSearchClient services={services} initialQuery={(sp.q || "").trim()} locale={locale} />
    </ConsultPage>
  );
}
