import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorAI } from "@/components-next/vector-illustrations";
import { SymptomTimelineClient, type TimelineEntry } from "@/components-next/symptom-timeline-client";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

function toTimelineEntries(payload: unknown): TimelineEntry[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const candidates: unknown[] = [];
  for (const key of ["data", "items", "results", "vitals", "readings", "entries"]) {
    const v = root[key];
    if (Array.isArray(v)) candidates.push(...v);
  }
  // if payload itself is array
  if (Array.isArray(payload)) candidates.push(...(payload as unknown[]));
  const out: TimelineEntry[] = [];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : typeof r._id === "string" ? r._id : crypto.randomUUID?.() ?? String(Math.random());
    const date =
      (typeof r.created_at === "string" && r.created_at) ||
      (typeof r.recorded_at === "string" && r.recorded_at) ||
      (typeof r.date === "string" && r.date) ||
      (typeof r.timestamp === "string" && r.timestamp) ||
      new Date().toISOString();
    const title =
      (typeof r.symptoms === "string" && r.symptoms.slice(0, 80)) ||
      (typeof r.title === "string" && r.title.slice(0, 80)) ||
      (typeof r.type === "string" && r.type.slice(0, 40)) ||
      (typeof r.value === "string" && r.value.slice(0, 40)) ||
      (typeof r.value === "number" ? String(r.value) : "Timeline entry");
    const detail =
      (typeof r.summary === "string" && r.summary.slice(0, 160)) ||
      (typeof r.notes === "string" && r.notes.slice(0, 160)) ||
      (typeof r.detail === "string" && r.detail.slice(0, 160)) ||
      undefined;
    out.push({ id, date, title, detail, kind: typeof r.kind === "string" ? r.kind : undefined });
  }
  return out.slice(0, 30);
}

export default async function AiSymptomTimelinePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("AiTriage");

  let initialEntries: TimelineEntry[] = [];
  // Backend binding: callPatientApi — no mock. Try vitals + trends as timeline sources; fallback to reports.
  try {
    const [vitalsRes, trendsRes] = await Promise.all([
      callPatientApi("/health/vitals?limit=100", {}, token),
      callPatientApi("/health/trends", {}, token),
    ]);
    const vitalsPayload = vitalsRes.ok ? await vitalsRes.json().catch(() => null) : null;
    const trendsPayload = trendsRes.ok ? await trendsRes.json().catch(() => null) : null;
    const vitalsEntries = toTimelineEntries(vitalsPayload);
    const trendsEntries = toTimelineEntries(trendsPayload);
    initialEntries = [...vitalsEntries, ...trendsEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
    if (initialEntries.length === 0) {
      const reportsRes = await callPatientApi("/health/reports", {}, token);
      if (reportsRes.ok) {
        const reportsPayload = await reportsRes.json().catch(() => null);
        initialEntries = toTimelineEntries(reportsPayload);
      }
    }
  } catch {
    initialEntries = [];
  }

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}>
            <Clock size={14} aria-hidden="true" />
            {locale === "ar" ? "الجدول الزمني للأعراض" : "Symptom Timeline"}
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {locale === "ar" ? "تتبع تطور أعراضك" : "Track how your symptoms evolve"}
          </h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", overflowWrap: "anywhere" }}>
            {t("subtitle")}
          </p>
        </div>
        <span className={styles.heroIcon} style={{ borderColor: "#E8EDEE", borderRadius: 20 }}>
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>

      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)" }}>
        <SymptomTimelineClient initialEntries={initialEntries} locale={locale} />
      </div>
    </main>
  );
}
