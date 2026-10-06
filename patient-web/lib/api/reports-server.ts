import { patientApiUrl } from "./upstream";

export type MedicalReportSummary = {
  id: string;
  title?: string | null;
  report_type?: string | null;
  created_at?: string | null;
  provider_name?: string | null;
  status?: string | null;
};

export async function getMyMedicalReports(token: string): Promise<Response> {
  try {
    return await fetch(patientApiUrl("/medical-reports/mine?limit=100"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

/** Builds a safe, portable text bundle from the selected reports (no raw PHI,
 *  just titles + dates + a pointer to open the report inside the portal). */
export function buildReportShareBundle(
  reports: MedicalReportSummary[],
  locale: string,
  origin: string,
): string {
  const lines = reports.map((r) => {
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString(locale) : "";
    return `- ${r.title || r.report_type || r.id}${date ? ` (${date})` : ""} — ${origin}/${locale}/reports/${encodeURIComponent(r.id)}`;
  });
  return `Nabd Plus — Medical reports shared:${"\n"}${lines.join("\n")}`;
}
