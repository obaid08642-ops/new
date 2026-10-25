import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLabCategory, type LabCategory } from "@/lib/lab-categories";
import { isLocale } from "@/lib/i18n";
import { namesOf, pickName } from "@/lib/i18n/localized";
import { callPatientApi } from "@/lib/api/upstream";
import { DiagnosticsSearchClient, type SearchRow } from "@/components-next/diagnostics-search-client";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

function extractServices(payload: unknown, locale: string, categoryLabel: (code: LabCategory) => string): SearchRow[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(payload) ? payload : [root.data, root.items, root.services, root.results].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : "");
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const id = typeof o._id === "string" ? o._id : typeof o.id === "string" ? o.id : null;
    if (!id) return [];
    // /labs/services sends the name in Arabic and English (names are ar/en only, owner decision 2026-10-25): Arabic on the Arabic page, English on every other.
    const names = namesOf(o);
    // a row that sends only a generic `name` is that name in every language it lacks
    if (str(o.name)) { names.en = names.en ?? str(o.name); names.ar = names.ar ?? str(o.name); }
    const name = pickName(locale, names);
    if (!name) return [];
    const code = typeof o.category === "string" ? o.category.trim().toLowerCase() : "";
    const category = isLabCategory(code) ? categoryLabel(code) : undefined;
    const rawPrice = o.price ?? o.base_price;
    // both names are searchable, so a patient may type the English name on a Hindi page
    return [{ id, name, search: Object.values(names).join(" "), category, price: typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : undefined }];
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
