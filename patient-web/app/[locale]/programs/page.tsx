import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

type Program = { id: string; title: string; status?: string; progress?: number; sessionsCompleted?: number; sessionsTotal?: number };

function extractPrograms(payload: unknown, locale: string): Program[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.programs, root?.items, root ? [root] : null].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r) return [];
    const id = String(r.id ?? r.program_id ?? "");
    if (!id) return [];
    const title = String((isAr ? r.title_ar : r.title_en) ?? r.title_ar ?? r.title_en ?? r.name ?? r.title ?? id);
    const progress = Number(r.progress_pct ?? r.progress ?? NaN);
    return [{
      id, title,
      status: typeof r.status === "string" ? r.status : typeof r.state === "string" ? r.state : undefined,
      progress: Number.isFinite(progress) ? progress : undefined,
      sessionsCompleted: Number(r.sessions_completed ?? r.completed_sessions ?? NaN) || undefined,
      sessionsTotal: Number(r.sessions_total ?? r.total_sessions ?? NaN) || undefined,
    }];
  });
}

export default async function ProgramsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Programs");
  const response = await callPatientApi("/medical/programs/active", {}, token);
  const programs = response.ok ? extractPrograms(await response.json().catch(() => null), locale) : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : programs.length === 0 ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {programs.map((program) => (
          <li key={program.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "14px 16px" }}>
            <strong>{program.title}</strong>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              {[program.status,
                program.sessionsCompleted !== undefined && program.sessionsTotal !== undefined ? `${program.sessionsCompleted}/${program.sessionsTotal}` : null,
                program.progress !== undefined ? `${Math.round(program.progress)}%` : null,
              ].filter(Boolean).join(" · ")}
            </div>
            {program.progress !== undefined ? (
              <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "var(--border, #eef1f5)" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, program.progress))}%`, height: "100%", borderRadius: 3, background: "var(--primary, #0d6e56)" }} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </main>;
}
