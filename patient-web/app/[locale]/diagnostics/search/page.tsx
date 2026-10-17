import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLabCategory, type LabCategory } from "@/lib/lab-categories";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { DiagnosticsSearchClient, type SearchRow } from "@/components-next/diagnostics-search-client";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

function extractServices(payload: unknown, locale: string, categoryLabel: (code: LabCategory) => string): SearchRow[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(payload) ? payload : [root.data, root.items, root.services, root.results].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  const rtl = locale === "ar" || locale === "ur";
  const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : "");
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const id = typeof o._id === "string" ? o._id : typeof o.id === "string" ? o.id : null;
    if (!id) return [];
    // /labs/services sends name_ar and name_en: the English page used to show the Arabic name (issue 1550 walkthrough).
    const name = rtl ? str(o.name_ar) || str(o.name) || str(o.name_en) : str(o.name_en) || str(o.name) || str(o.name_ar);
    if (!name) return [];
    const code = typeof o.category === "string" ? o.category.trim().toLowerCase() : "";
    const category = isLabCategory(code) ? categoryLabel(code) : undefined;
    const rawPrice = o.price ?? o.base_price;
    return [{ id, name, category, price: typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : undefined }];
  });
}

/**
 * The diagnostics search (canvas/Search): the live `/labs/services` list with a field that filters it as you type. The list is
 * public (@Public on the backend), so a guest gets it too and the read carries no credential (issue 1550); booking asks for the sign-in.
 */
export default async function DiagnosticsSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const response = await callPatientApi("/labs/services");
  const backHref = `/${locale}/diagnostics`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("searchTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("searchErrorTitle")} body={t("searchErrorBody")} retryLabel={t("retry")} actionLabel={t("backToHub")} actionHref={backHref} />
      </ConsultPage>
    );
  }
  const sp = await searchParams;
  const labels = await getTranslations("LabsPackages");
  const services = extractServices(await response.json().catch(() => null), locale, (code) => labels(`categoryName.${code}`));
  return (
    <ConsultPage locale={locale} title={t("searchTitle")} backHref={backHref}>
      <DiagnosticsSearchClient services={services} initialQuery={(sp.q || "").trim()} locale={locale} />
    </ConsultPage>
  );
}
