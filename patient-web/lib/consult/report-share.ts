import { z } from "zod";

/** The id shapes the routes accept (the report id and the doctor profile id), kept out of the upstream path otherwise. */
export const shareIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export type ReportShare = { doctorId: string; doctorName?: string };

/** Who a report is shared with: the report's share history, limited to the doctors it is still shared with (the app does the same). */
export function parseReportShares(payload: unknown): ReportShare[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const report = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  const ids = Array.isArray(report?.shared_with_doctor_ids) ? report.shared_with_doctor_ids.filter((x): x is string => typeof x === "string") : [];
  const history = Array.isArray(report?.share_history) ? report.share_history : [];
  const seen = new Set<string>();
  const out: ReportShare[] = [];
  for (const item of history) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const doctorId = typeof row?.doctor_id === "string" ? row.doctor_id : "";
    if (!doctorId || !ids.includes(doctorId) || seen.has(doctorId)) continue;
    seen.add(doctorId);
    out.push({ doctorId, doctorName: typeof row?.doctor_name === "string" && row.doctor_name.trim() ? row.doctor_name.trim() : undefined });
  }
  for (const id of ids) if (!seen.has(id)) out.push({ doctorId: id });
  return out;
}
