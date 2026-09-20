import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { DiagnosticsSearchClient } from "@/components-next/diagnostics-search-client";
import { VectorLabs } from "@/components-next/vector-illustrations";

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
      <main className="main" style={{ background: "#FDFDFC" }}>
        <section style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "grid", gap: 16, placeItems: "center", padding: 24, textAlign: "center" } as any}>
          <VectorLabs size={48} aria-hidden="true" />
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "البحث عن تحليل" : "Search tests"}</h1>
          <p role="alert" style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "تعذر تحميل التحاليل" : "Could not load tests"}</p>
          <Link href={`/${locale}/diagnostics`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760, padding: "10px 18px", textDecoration: "none" } as any}>{ar ? "التحاليل" : "Diagnostics"}</Link>
        </section>
      </main>
    );
  }
  const sp = await searchParams;
  const services = extractServices(await response.json().catch(() => null), locale);
  return (
    <main className="main" style={{ background: "#FDFDFC" }}>
      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "البحث عن تحليل" : "Search tests"}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "#5A6B6B" } as any}>{ar ? "ابحث بالاسم أو الفئة." : "Search by name or category."}</p>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flex: "0 0 auto", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
      </section>
      <Link href={`/${locale}/diagnostics`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", gap: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 600, marginTop: 16 } as any}>
        {ar ? "التحاليل" : "Diagnostics"}
      </Link>
      <div style={{ marginTop: 16, borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8 } as any}>
        <DiagnosticsSearchClient services={services} initialQuery={(sp.q || "").trim()} locale={locale} />
      </div>
    </main>
  );
}
