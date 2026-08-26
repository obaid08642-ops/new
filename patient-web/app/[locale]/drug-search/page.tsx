import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { GitCompareArrows, Search } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { DrugCompare } from "@/components-next/drug-compare";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Advanced search + drug compare (parity #33): the catalog list with
 * server-side q/category/page params (advanced search) and a real compare
 * table from POST /medicines/compare.
 */
export default async function DrugSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const query = new URLSearchParams();
  if (sp.q?.trim()) query.set("q", sp.q.trim().slice(0, 120));
  if (sp.category?.trim()) query.set("category", sp.category.trim().slice(0, 60));
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  query.set("page", String(page));
  query.set("limit", "24");

  const [listRes, allRes] = await Promise.all([
    callPatientApi(`/medicines?${query.toString()}`, {}, token),
    fetch(patientApiUrl("/medicines?limit=40"), { cache: "no-store" }).then((r) => r.json().catch(() => null)),
  ]);
  if (listRes.status === 401) redirect(`/${locale}/login`);
  const payload: any = listRes.ok ? await listRes.json().catch(() => null) : null;
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
  const suggestions = Array.isArray(allRes)
    ? allRes.flatMap((m: any) => typeof m?.id === "string" ? [{ id: m.id, label: String(m.trade_name || m.name_ar || m.name_en || m.id).slice(0, 80) }] : [])
    : [];

  const qs = (next: Record<string, string>) => {
    const params2 = new URLSearchParams(query);
    for (const [k, v] of Object.entries(next)) v ? params2.set(k, v) : params2.delete(k);
    return `/${locale}/drug-search?${params2.toString()}`;
  };

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Search size={18} aria-hidden="true" /> بحث الأدوية المتقدم</h1>
      <Card>
        <form method="get" className="grid gap-2 md:grid-cols-3 text-sm">
          <input name="q" defaultValue={sp.q || ""} aria-label="اسم الدواء" className="rounded-lg border border-black/15 p-2 md:col-span-2" />
          <select name="category" defaultValue={sp.category || ""} aria-label="التصنيف" className="rounded-lg border border-black/15 p-2">
            <option value="">كل التصنيفات</option>
            {(Array.isArray(allRes?.categories) ? allRes.categories : []).map((c: any) => (
              <option key={String(c)} value={String(c)}>{String(c)}</option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">بحث</button>
        </form>
      </Card>

      <h2 className="mt-4 text-lg font-bold"><GitCompareArrows size={16} aria-hidden="true" /> مقارنة الأدوية</h2>
      <DrugCompare suggestions={suggestions} />

      <h2 className="mt-4 text-lg font-bold">النتائج</h2>
      {items.length === 0 ? (
        <Card><p className="text-sm">لا نتائج — جرّب كلمة أخرى.</p></Card>
      ) : (
        <div className="grid gap-2 mt-2">
          {items.map((m: any) => (
            <Card key={String(m.id)}>
              <div className="flex justify-between text-sm">
                <strong>{String(m.trade_name || m.name_ar || m.name_en || m.id).slice(0, 100)}</strong>
                <span>{m.price != null ? `${Number(m.price)} ر.س` : ""}</span>
              </div>
              {m.active_ingredient ? <p className="text-xs text-black/50 mt-1">{String(m.active_ingredient).slice(0, 100)}</p> : null}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 && <Link className="underline" href={qs({ page: String(page - 1) })}>السابق</Link>}
        {items.length >= 24 && <Link className="underline" href={qs({ page: String(page + 1) })}>التالي</Link>}
      </div>
    </main>
  );
}
