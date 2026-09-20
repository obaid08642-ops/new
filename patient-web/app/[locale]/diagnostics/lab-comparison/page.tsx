import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorLabs } from "@/components-next/vector-illustrations";

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
    <main className="main" style={{ background: "#FDFDFC" }}>
      <Link href={`/${locale}/diagnostics/labs`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", gap: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 600 } as any}>
        {ar ? "التحاليل" : "Tests"}
      </Link>

      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 16, padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "مقارنة المختبرات" : "Compare labs"}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "#5A6B6B" } as any}>{ar ? "اختر المختبر الأنسب لنتائجك المعملية." : "Pick the best lab for your tests."}</p>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flex: "0 0 auto", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
      </section>

      {!testIds.length ? (
        <section style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "grid", gap: 16, placeItems: "center", padding: 24, textAlign: "center", marginTop: 16 } as any}>
          <VectorLabs size={48} aria-hidden="true" />
          <p style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "اختر تحاليل من السلة أولاً." : "Pick tests from the cart first."}</p>
        </section>
      ) : labs.length === 0 ? (
        <section style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "grid", gap: 16, placeItems: "center", padding: 24, textAlign: "center", marginTop: 16 } as any}>
          <VectorLabs size={48} aria-hidden="true" />
          <p style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "لا توجد مختبرات متوافقة." : "No compatible labs."}</p>
        </section>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8, marginTop: 16 }}>
          {labs.map((l) => (
            <li key={l.id} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 12 } as any}>
              <Link href={`/${locale}/diagnostics/labs/${encodeURIComponent(l.id)}`} style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textDecoration: "none" } as any}>{l.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/${locale}/diagnostics/cart`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760, padding: "10px 18px", display: "inline-flex", marginTop: 16, textDecoration: "none", gap: 8 } as any}>{ar ? "السلة" : "Cart"}</Link>
    </main>
  );
}
