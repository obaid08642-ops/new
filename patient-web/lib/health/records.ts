export type ReportItem = { id: string; title: string; type?: string; issuedAt?: string };
export type TimelineEvent = { id: string; type?: string; title?: string; date?: string; status?: string };

export const TIMELINE_TYPES = ["all", "appointment", "lab", "prescription", "vitals"] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

function rowsOf(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  return (keys.map((key) => root?.[key]).find(Array.isArray) as unknown[] | undefined) ?? [];
}

/** The patient's medical reports (GET /medical-reports/mine): the title in the reader's language, the type and the issue date. */
export function extractReports(payload: unknown, locale: string): ReportItem[] {
  return rowsOf(payload, ["data", "reports", "items"]).flatMap((value) => {
    const row = record(value);
    if (!row || !row.id) return [];
    const title = (locale === "ar" ? text(row.title_ar) : text(row.title_en)) ?? text(row.title_ar) ?? text(row.title_en) ?? text(row.title) ?? text(row.report_type);
    return [{ id: String(row.id), title: title ?? String(row.id), type: text(row.report_type), issuedAt: text(row.issued_at) ?? text(row.createdAt) }];
  });
}

/** The health timeline (GET /medical-reports/timeline): both shapes the two old timeline screens read. */
export function extractTimeline(payload: unknown): TimelineEvent[] {
  return rowsOf(payload, ["data", "events", "items"]).flatMap((value, index) => {
    const row = record(value);
    if (!row) return [];
    return [{
      id: text(row.id) ?? `event-${index}`,
      type: text(row.type) ?? text(row.kind) ?? text(row.category),
      title: text(row.title),
      date: text(row.date) ?? text(row.created_at),
      status: text(row.status),
    }];
  });
}
