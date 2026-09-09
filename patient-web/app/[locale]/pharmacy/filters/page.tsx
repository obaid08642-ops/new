import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { PharmacyFiltersClient } from "@/components-next/pharmacy-filters-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    filter_category?: string; filter_forms?: string; filter_brands?: string; filter_rx?: string;
    filter_min_price?: string; filter_max_price?: string; filter_sort?: string;
  }>;
};

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && !!v.trim());
}

/** Parity with app pharmacy/filters: live /medicines/filters options, apply routes to medicines list. */
export default async function PharmacyFiltersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medicines/filters", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = await response.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const rec = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const sp = await searchParams;
  const csv = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
  return (
    <main className="main">
      <Link href={`/${locale}/medicines`}>{ar ? "الأدوية" : "Medicines"}</Link>
      <h1>{ar ? "تصفية النتائج" : "Filter results"}</h1>
      <PharmacyFiltersClient
        options={{ categories: strList(rec.categories), forms: strList(rec.forms), brands: strList(rec.brands) }}
        initial={{
          category: (sp.filter_category || "all").trim() || "all",
          forms: csv(sp.filter_forms),
          brands: csv(sp.filter_brands),
          rxOnly: sp.filter_rx === "1",
          minPrice: (sp.filter_min_price || "").trim(),
          maxPrice: (sp.filter_max_price || "").trim(),
          sort: (sp.filter_sort || "relevant").trim() || "relevant",
        }}
        locale={locale}
      />
    </main>
  );
}
