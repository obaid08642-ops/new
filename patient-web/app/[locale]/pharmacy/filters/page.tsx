import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { PharmacyFiltersClient } from "@/components-next/pharmacy-filters-client";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; sort?: string; filter_category?: string; filter_sort?: string }>;
};

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && !!v.trim());
}

/** Parity with app pharmacy/filters: live /medicines/filters options, apply routes to the medicines list. */
export default async function PharmacyFiltersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PharmacyBrowse");
  const routeState = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medicines/filters", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    // the filter options did not load: say so, with a retry (a failed request is not a missing page)
    return (
      <CoreShell locale={locale} title={t("filtersTitle")} backHref={`/${locale}/medicines`}>
        <div className={styles.state}><RetryErrorState title={t("errorTitle")} body={t("errorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const payload = await response.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const rec = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const sp = await searchParams;
  const category = (sp.category || sp.filter_category || "all").trim() || "all";
  const sort = (sp.sort || sp.filter_sort) === "trending" ? "trending" : "smart_ranking";
  return (
    <CoreShell locale={locale} title={t("filtersTitle")} backHref={`/${locale}/medicines`}>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("filtersTitle")}</h1>
        </div>
        <PharmacyFiltersClient options={{ categories: strList(rec.categories) }} initial={{ category, sort }} locale={locale} />
      </div>
    </CoreShell>
  );
}
