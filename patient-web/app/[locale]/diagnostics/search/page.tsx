import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { DiagnosticsSearchClient } from "@/components-next/diagnostics-search-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export type LabService = { id: string; name: string; category?: string; price: number };

function extractServices(payload: unknown, locale: string): LabService[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = [root.data, root.items, root.services, root.results].find(Array.isArray);
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
    return [{ id, name, category, price: Number(o.price ?? o.base_price ?? 0) || 0 }];
  });
}

/** Parity with app diagnostics/search: live /labs/services list + substring filter + test detail links. */
export default async function DiagnosticsSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/labs/services", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) {
    return (
      <main className="main">
        <Link href={`/${locale}/diagnostics`}>{ar ? "التحاليل" : "Diagnostics"}</Link>
        <h1>{ar ? "البحث عن تحليل" : "Search tests"}</h1>
        <p role="alert">{ar ? "تعذر تحميل التحاليل" : "Could not load tests"}</p>
      </main>
    );
  }
  const sp = await searchParams;
  const services = extractServices(await response.json().catch(() => null), locale);
  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics`}>{ar ? "التحاليل" : "Diagnostics"}</Link>
      <h1>{ar ? "البحث عن تحليل" : "Search tests"}</h1>
      <DiagnosticsSearchClient services={services} initialQuery={(sp.q || "").trim()} locale={locale} />
    </main>
  );
}
