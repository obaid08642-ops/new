import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { SlidersHorizontal, ShieldCheck } from "lucide-react";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ display: "grid", gap: 12, padding: "24px 0 64px" }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)", boxShadow: "0 12px 32px rgba(30,51,46,.07)" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800 }}><ShieldCheck size={14} aria-hidden="true" />{ar ? "صيدلية نبض — تصفية ذكية" : "Nabd Pharmacy — Smart Filters"}</p>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: 22, fontWeight: 900, lineHeight: 1.25, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "تصفية النتائج" : "Filter results"}</h1>
          <Link href={`/${locale}/medicines`} style={{ color: "#00876F", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{ar ? "← العودة للأدوية" : "← Back to medicines"}</Link>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE" }}><VectorPharmacy size={48} /></span>
      </section>
      <section style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#1E332E", fontWeight: 800, fontSize: 13 }}><SlidersHorizontal size={16} />{ar ? "خيارات التصفية الحية" : "Live filter options"}</div>
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
      </section>
    </main>
  );
}
