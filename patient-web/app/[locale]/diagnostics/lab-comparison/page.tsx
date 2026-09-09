import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ testIds?: string }> };

export default async function LabComparisonPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const testIds = (sp.testIds || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  let labs: Array<{ id: string; name: string }> = [];
  if (testIds.length) {
    const upstream = await callPatientApi(
      `/labs/compatible-providers?testIds=${testIds.map(encodeURIComponent).join(",")}`,
      {},
      token,
    );
    const data = upstream.ok ? await upstream.json().catch(() => null) : null;
    const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
    labs = (Array.isArray(list) ? list : []).map((l: unknown) => {
      const r = l as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? "");
      if (!id) return null;
      return { id, name: String(r.name_ar ?? r.name_en ?? r.name ?? id) };
    }).filter((l): l is { id: string; name: string } => l !== null);
  }

  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics/labs`}>{ar ? "التحاليل" : "Tests"}</Link>
      <h1>{ar ? "مقارنة المختبرات" : "Compare labs"}</h1>
      {!testIds.length ? (
        <p>{ar ? "اختر تحاليل من السلة أولاً." : "Pick tests from the cart first."}</p>
      ) : labs.length === 0 ? (
        <p>{ar ? "لا توجد مختبرات متوافقة." : "No compatible labs."}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {labs.map((l) => (
            <li key={l.id}>
              <Link href={`/${locale}/diagnostics/labs/${encodeURIComponent(l.id)}`}>{l.name}</Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/${locale}/diagnostics/cart`}>{ar ? "السلة" : "Cart"}</Link>
    </main>
  );
}
