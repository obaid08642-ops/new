import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

type Search = { type?: string; lat?: string; lng?: string; radius_km?: string };

/**
 * Providers map (parity #24): server-fetched /providers/map with real
 * coordinates and distance; type/radius filters via URL params (shareable).
 */
export default async function ProvidersMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const query = new URLSearchParams();
  for (const key of ["type", "lat", "lng", "radius_km"] as const) {
    const value = sp[key];
    if (value && value.trim()) query.set(key, value.trim());
  }
  const res = await callPatientApi(`/providers/map${query.toString() ? `?${query.toString()}` : ""}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const rows: any = res.ok ? await res.json().catch(() => []) : [];
  const providers = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><MapPin size={18} aria-hidden="true" /> المزودون على الخريطة</h1>
      <Card>
        <form method="get" className="grid gap-2 md:grid-cols-4 text-sm">
          <label>النوع
            <select name="type" defaultValue={sp.type || ""} className="w-full mt-1 rounded-lg border border-black/15 p-2">
              <option value="">الكل</option>
              <option value="doctor">طبيب</option>
              <option value="lab">مختبر</option>
              <option value="radiology">أشعة</option>
              <option value="pharmacy">صيدلية</option>
              <option value="nursing">تمريض منزلي</option>
            </select>
          </label>
          <label>خط العرض
            <input name="lat" inputMode="decimal" defaultValue={sp.lat || ""} className="w-full mt-1 rounded-lg border border-black/15 p-2" />
          </label>
          <label>خط الطول
            <input name="lng" inputMode="decimal" defaultValue={sp.lng || ""} className="w-full mt-1 rounded-lg border border-black/15 p-2" />
          </label>
          <label>نطاق كم
            <input name="radius_km" inputMode="decimal" defaultValue={sp.radius_km || ""} className="w-full mt-1 rounded-lg border border-black/15 p-2" />
          </label>
          <button type="submit" className="rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white md:col-span-4">تطبيق الفلاتر</button>
        </form>
        <p className="mt-2 text-xs text-black/50">خريطة تفاعلية كاملة عبر تطبيق الجوال؛ هنا القائمة المرتبة بالمسافة.</p>
      </Card>

      {providers.length === 0 ? (
        <div className="mt-3"><Card><p className="text-sm">لا نتائج مطابقة — وسّع النطاق أو أزل الفلاتر.</p></Card></div>
      ) : (
        <div className="mt-3 grid gap-2">
          {providers.slice(0, 50).map((p: any) => (
            <Link key={String(p.id)} href={`/${locale}/${providerHref(p.type)}`} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm text-sm flex justify-between no-underline">
              <span className="min-w-0 truncate">{String(p.name || p.facility_name || p.id).slice(0, 80)}</span>
              <span className="text-black/60 whitespace-nowrap">
                {p.distance_km != null ? `${Number(p.distance_km).toFixed(1)} كم` : ""}
                {p.city ? ` · ${p.city}` : ""}
                {p.rating_avg ? ` · ★ ${p.rating_avg}` : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function providerHref(type: unknown): string {
  switch (String(type || "")) {
    case "doctor": return "consultations";
    case "lab": return "labs";
    case "radiology": return "radiology/book";
    case "pharmacy": return "medicine-catalog";
    default: return "home-care/services";
  }
}
