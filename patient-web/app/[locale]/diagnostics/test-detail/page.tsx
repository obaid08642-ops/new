import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorLabs } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ testId?: string; id?: string }> };

/** Parity with app diagnostics/test-detail: verified service data from /labs/services, no fabricated info. */
export default async function DiagnosticsTestDetailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const testId = (sp.testId || sp.id || "").trim();
  if (!isLocale(locale) || !testId) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/labs/services", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = await response.json().catch(() => null);
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = [root.data, root.items, root.services, root.results].find(Array.isArray);
  const match = Array.isArray(list) ? list.find((item) => {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    return o._id === testId || o.id === testId;
  }) as Record<string, unknown> | undefined : undefined;
  if (!match) notFound();
  const rtl = locale === "ar" || locale === "ur";
  const name = rtl
    ? (typeof match.name_ar === "string" && match.name_ar) || (typeof match.name === "string" ? match.name : "")
    : (typeof match.name === "string" && match.name) || (typeof match.name_ar === "string" ? match.name_ar : "");
  const price = Number(match.price ?? match.base_price ?? 0) || 0;
  const category = typeof (rtl ? match.category_ar : match.category) === "string"
    ? (rtl ? match.category_ar : match.category) as string : undefined;
  return (
    <main className="main" style={{ background: "#FDFDFC", gap: 16, padding: "16px 0" } as any}>
      <Link href={`/${locale}/diagnostics/search`} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>{ar ? "البحث" : "Search"}</Link>
      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</h1>
          {category ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{category}</p> : null}
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "السعر:" : "Price:"} {price} {ar ? "ر.س" : "SAR"}</p>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
      </section>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" } as any}>
        <Link href={`/${locale}/diagnostics/cart`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{ar ? "أضف للسلة واحجز" : "Add to cart & book"}</Link>
        <Link href={`/${locale}/diagnostics/labs`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as any}>{ar ? "تصفح المختبرات" : "Browse labs"}</Link>
      </nav>
    </main>
  );
}
