import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function pickName(o: Record<string, unknown>, locale: string): string {
  const rtl = locale === "ar" || locale === "ur";
  const ar = typeof o.name_ar === "string" && o.name_ar ? o.name_ar : null;
  const en = typeof o.name === "string" && o.name ? o.name : null;
  return (rtl ? ar || en : en || ar) ?? (typeof o.type === "string" ? o.type : "");
}
function apptStart(a: Record<string, unknown>): number {
  for (const k of ["slot_start", "slotStart", "scheduled_at", "start"]) {
    const v = a[k];
    if (typeof v === "string" && Number.isFinite(Date.parse(v))) return Date.parse(v);
  }
  return NaN;
}

/** Parity with app ai/monthly-report: month stats + latest vitals + trends + month appointments, real data only. */
export default async function AiMonthlyReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const now = new Date();
  const [apptsRes, vitalsRes, medsRes, trendsRes] = await Promise.all([
    callPatientApi("/care/appointments", {}, token),
    callPatientApi("/health/vitals/summary", {}, token),
    callPatientApi("/health/chronic-meds", {}, token),
    callPatientApi("/health/trends", {}, token),
  ]);
  if ([apptsRes, vitalsRes, medsRes, trendsRes].every((r) => r.status === 401)) redirect(`/${locale}/login`);
  const allFailed = [apptsRes, vitalsRes, medsRes, trendsRes].every((r) => !r.ok);
  if (allFailed) {
    return (
      <main className="main">
        <Link href={`/${locale}/ai`}>{ar ? "المساعد الذكي" : "AI assistant"}</Link>
        <h1>{ar ? "تقريرك الشهري" : "Your monthly report"}</h1>
        <p role="alert">{ar ? "تعذر تحميل التقرير الشهري" : "Could not load the monthly report"}</p>
        <Link href={`/${locale}/ai/monthly-report`}>{ar ? "إعادة المحاولة" : "Retry"}</Link>
      </main>
    );
  }
  const listOf = async (res: Response): Promise<Record<string, unknown>[]> => {
    if (!res.ok) return [];
    const p = asRecord(await res.json().catch(() => null));
    const l = [p?.data, p?.items, p?.results, p?.vitals, p?.trends].find(Array.isArray);
    return (Array.isArray(l) ? l : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r);
  };
  const appts = (await listOf(apptsRes)).filter((a) => {
    const t = apptStart(a);
    if (!Number.isFinite(t)) return false;
    const d = new Date(t);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const completed = appts.filter((a) => ["COMPLETED", "completed"].includes(String(a.state ?? a.status ?? "")));
  const upcoming = appts.filter((a) => {
    const t = apptStart(a);
    return Number.isFinite(t) && t > Date.now() && !["CANCELLED", "cancelled"].includes(String(a.state ?? a.status ?? ""));
  });
  const vitals = await listOf(vitalsRes);
  const meds = await listOf(medsRes);
  const trends = (await listOf(trendsRes)).filter((t) => Array.isArray(t.data) && t.data.length > 0);
  const hasAny = appts.length > 0 || vitals.length > 0 || meds.length > 0 || trends.length > 0;
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now);

  return (
    <main className="main">
      <Link href={`/${locale}/ai`}>{ar ? "المساعد الذكي" : "AI assistant"}</Link>
      <h1>{ar ? "تقريرك الشهري" : "Your monthly report"} — {monthLabel}</h1>
      {!hasAny ? (
        <section aria-label={ar ? "لا بيانات" : "No data"}>
          <p role="status">{ar ? "لا توجد بيانات كافية بعد" : "Not enough data yet"}</p>
          <Link href={`/${locale}/health/vitals/log`}>{ar ? "تسجيل قياس الآن" : "Log a reading now"}</Link>
        </section>
      ) : null}
      <section aria-label={ar ? "هذا الشهر بنظرة" : "This month at a glance"}>
        <h2>{ar ? "هذا الشهر بنظرة" : "This month at a glance"}</h2>
        <ul>
          <li>{ar ? "موعد:" : "Appointments:"} {appts.length}</li>
          <li>{ar ? "مكتمل:" : "Completed:"} {completed.length}</li>
          <li>{ar ? "قادم:" : "Upcoming:"} {upcoming.length}</li>
          <li>{ar ? "دواء مزمن:" : "Chronic meds:"} {meds.length}</li>
        </ul>
      </section>
      {vitals.length > 0 ? (
        <section aria-label={ar ? "آخر قياساتك الحيوية" : "Your latest vitals"}>
          <h2>{ar ? "آخر قياساتك الحيوية" : "Your latest vitals"}</h2>
          <ul>
            {vitals.slice(0, 8).map((v, i) => (
              <li key={i}>{pickName(v, locale)}: {String(v.value ?? v.latest ?? "—")}{typeof v.unit === "string" ? ` ${v.unit}` : ""}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {trends.length > 0 ? (
        <section aria-label={ar ? "اتجاهاتك الصحية" : "Your health trends"}>
          <h2>{ar ? "اتجاهاتك الصحية" : "Your health trends"}</h2>
          {trends.map((t, i) => {
            const pts = (t.data as unknown[]).map((p) => asRecord(p)).filter((p): p is Record<string, unknown> => !!p);
            const num = (p: Record<string, unknown>) => Number(p.value ?? p.y ?? NaN);
            const first = num(pts[0] ?? {});
            const last = num(pts[pts.length - 1] ?? {});
            const dir = !Number.isFinite(first) || !Number.isFinite(last) ? "→" : last > first ? "↑" : last < first ? "↓" : "→";
            const dirLabel = dir === "↑" ? (ar ? "ارتفاع" : "Rising") : dir === "↓" ? (ar ? "انخفاض" : "Falling") : (ar ? "مستقر" : "Stable");
            const unit = typeof t.unit === "string" ? t.unit : "";
            return (
              <details key={i}>
                <summary>{pickName(t, locale)} {dir} {dirLabel}</summary>
                <p>{ar ? `${pts.length} قراءة — أول ${Number.isFinite(first) ? first : "—"} وآخر ${Number.isFinite(last) ? last : "—"} ${unit}` : `${pts.length} readings — first ${Number.isFinite(first) ? first : "—"}, last ${Number.isFinite(last) ? last : "—"} ${unit}`}</p>
                <Link href={`/${locale}/health/trends`}>{ar ? "عرض الرسم البياني الكامل" : "View full chart"}</Link>
              </details>
            );
          })}
        </section>
      ) : null}
      {appts.length > 0 ? (
        <section aria-label={ar ? "المواعيد هذا الشهر" : "This month's appointments"}>
          <h2>{ar ? "المواعيد هذا الشهر" : "This month's appointments"}</h2>
          <ul>
            {appts.map((a, i) => {
              const done = ["COMPLETED", "completed"].includes(String(a.state ?? a.status ?? ""));
              const t = apptStart(a);
              return (
                <li key={typeof a.id === "string" ? a.id : i}>
                  [{done ? (ar ? "مكتمل" : "Done") : (ar ? "قادم" : "Upcoming")}]{" "}
                  {typeof a.doctor_name === "string" && a.doctor_name
                    ? a.doctor_name
                    : typeof a.specialty === "string" && a.specialty
                      ? a.specialty
                      : (ar ? "موعد طبي" : "Appointment")}
                  {Number.isFinite(t) ? ` — ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(t))}` : ""}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/health/trends`}>{ar ? "عرض المؤشرات التاريخية" : "View historical trends"}</Link>
        <Link href={`/${locale}/consultations`}>{ar ? "احجز متابعة مع الطبيب" : "Book a follow-up"}</Link>
      </nav>
    </main>
  );
}
