import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, CalendarDays } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string }> };

type TimelineEvent = { id?: string; type?: string; title?: string; date?: string; status?: string };

const TYPES = ["all", "appointment", "lab", "prescription", "vitals"] as const;

function extractEvents(payload: unknown): TimelineEvent[] {
  if (Array.isArray(payload)) return payload as TimelineEvent[];
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const values = [root?.data, root?.events, root?.items].find(Array.isArray);
  return Array.isArray(values) ? (values as TimelineEvent[]) : [];
}

export default async function ReportsTimelinePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { type } = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = await getTranslations("Reports");
  const active = (TYPES as readonly string[]).includes(type || "") ? (type as string) : "all";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medical-reports/timeline", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
        <section role="alert"><h1>{t("title")}</h1><p>{t("error")}</p><RetryButton /></section>
      </main>
    );
  }
  const all = extractEvents(await response.json().catch(() => null));
  const events = active === "all" ? all : all.filter((e) => e.type === active);

  return (
    <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
      <Link href={`/${locale}/reports`}>{ar ? "التقارير" : "Reports"}</Link>
      <h1><Activity size={18} aria-hidden="true" /> {ar ? "الخط الزمني الصحي" : "Health timeline"}</h1>
      <nav aria-label={ar ? "تصفية حسب النوع" : "Filter by type"} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {TYPES.map((k) => (
          <Link key={k} href={`/${locale}/reports/timeline${k === "all" ? "" : `?type=${k}`}`} aria-current={active === k ? "page" : undefined} style={{ fontWeight: active === k ? 700 : 400 }}>
            {ar ? ({ all: "الكل", appointment: "مواعيد", lab: "تحاليل", prescription: "وصفات", vitals: "قياسات" } as Record<string, string>)[k] : k}
          </Link>
        ))}
      </nav>
      {events.length === 0 ? (
        <p role="status">{ar ? "لا توجد أحداث صحية بعد." : "No health events yet."}</p>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {events.map((e, i) => (
            <li key={e.id || i} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 14px" }}>
              <strong>{e.title || e.type || "—"}</strong>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                {[e.type, e.status, e.date ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(e.date)) : null].filter(Boolean).join(" · ")}
                {e.date ? <span> <CalendarDays size={13} aria-hidden="true" /></span> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
