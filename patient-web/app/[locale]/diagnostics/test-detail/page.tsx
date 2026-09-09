import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

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
    <main className="main">
      <Link href={`/${locale}/diagnostics/search`}>{ar ? "البحث" : "Search"}</Link>
      <h1>{name}</h1>
      {category ? <p>{category}</p> : null}
      <p>{ar ? "السعر:" : "Price:"} {price} {ar ? "ر.س" : "SAR"}</p>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/diagnostics/cart`}>{ar ? "أضف للسلة واحجز" : "Add to cart & book"}</Link>
        <Link href={`/${locale}/diagnostics/labs`}>{ar ? "تصفح المختبرات" : "Browse labs"}</Link>
      </nav>
    </main>
  );
}
