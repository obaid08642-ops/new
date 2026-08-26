import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileBarChart, ChevronLeft, ChevronRight } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

const VITAL_LABELS: Record<string, string> = {
  bp: "ضغط الدم (الانقباض)", glucose: "سكر الدم", heart_rate: "نبض القلب",
  weight: "الوزن", temperature: "الحرارة", spo2: "تشبع الأكسجين",
};
const MOOD_LABELS: Record<string, string> = {
  great: "رائع", good: "جيد", okay: "لا بأس", bad: "سيئ", terrible: "مزعج",
};

/**
 * Monthly health report (parity #20 completion): server-aggregated real
 * records for ?month=YYYY-MM — vitals/sleep/mood/water. No client math.
 */
export default async function MonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(String(sp.month || "")) ? String(sp.month) : new Date().toISOString().slice(0, 7);
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi(`/health/monthly-report?month=${encodeURIComponent(month)}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const report: any = res.ok ? await res.json().catch(() => null) : null;

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.toISOString().slice(0, 7);
  })();
  const nextMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return d.toISOString().slice(0, 7);
  })();

  const vitals = report?.vitals && typeof report.vitals === "object" ? report.vitals : {};

  return (
    <main className="page" dir="rtl">
      <Link href={`/${locale}/health`} className="text-sm underline">رجوع للصحة</Link>
      <h1 className="text-xl font-bold mt-2 mb-2"><FileBarChart size={18} aria-hidden="true" /> التقرير الشهري</h1>
      <div className="flex items-center gap-3 text-sm mb-3">
        <Link href={`?month=${prevMonth}`} aria-label="الشهر السابق"><ChevronRight size={16} /></Link>
        <strong>{month}</strong>
        <Link href={`?month=${nextMonth}`} aria-label="الشهر التالي"><ChevronLeft size={16} /></Link>
      </div>

      <Card>
        <h2 className="font-bold mb-2">القياسات الحيوية</h2>
        {Object.keys(vitals).length === 0 ? (
          <p className="text-sm text-black/60">لا قياسات مسجلة هذا الشهر.</p>
        ) : (
          <dl className="text-sm">
            {Object.entries(vitals).map(([type, stats]: [string, any]) => (
              <div key={type} className="flex justify-between py-1 border-b border-black/5">
                <dt>{VITAL_LABELS[type] || type}</dt>
                <dd>
                  {stats.count} قراءة · متوسط {stats.avg}
                  {stats.min != null && stats.max != null ? ` (${stats.min}–${stats.max})` : ""}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <Card>
          <h2 className="font-bold mb-1">النوم</h2>
          {report?.sleep ? (
            <p className="text-sm">{report.sleep.count} ليلة · متوسط التقييم {report.sleep.avg_score} · {report.sleep.avg_hours} ساعة/ليلة</p>
          ) : <p className="text-sm text-black/60">لا بيانات نوم.</p>}
        </Card>
        <Card>
          <h2 className="font-bold mb-1">المزاج</h2>
          {report?.mood && Object.keys(report.mood).length ? (
            <ul className="text-sm">
              {Object.entries(report.mood).map(([mood, count]) => (
                <li key={mood}>{MOOD_LABELS[mood] || mood}: {count as number}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">لا تسجيلات مزاج.</p>}
        </Card>
        <Card>
          <h2 className="font-bold mb-1">الماء</h2>
          <p className="text-sm">{Number(report?.water_ml ?? 0)} مل خلال الشهر</p>
        </Card>
      </div>
    </main>
  );
}
