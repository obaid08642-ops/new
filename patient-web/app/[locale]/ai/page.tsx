import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ASSISTANT_MODES, parseMode } from "@/lib/ai/assistant";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { CareHero } from "@/components-next/care/care-kit";
import { PartUnavailable } from "@/components-next/health/health-kit";
import { SymptomsClient } from "@/components-next/assistant/symptoms-client";
import { PrescriptionClient } from "@/components-next/assistant/prescription-client";
import { ReportClient, type AssistantReport } from "@/components-next/assistant/report-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function loadReports(token: string): Promise<AssistantReport[] | "unauthorized" | null> {
  try {
    const response = await callPatientApi("/medical-reports/mine?limit=100", {}, token);
    if (response.status === 401) return "unauthorized";
    if (!response.ok) return null;
    const payload: unknown = await response.json().catch(() => null);
    const root = payload && typeof payload === "object" ? (payload as { data?: unknown }) : null;
    const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : [];
    return list.filter((item): item is AssistantReport => !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string");
  } catch {
    return null;
  }
}

/**
 * The one AI assistant (merge map section 4): three modes in the URL (`?mode=symptoms|prescription|report`) over the endpoints
 * the old screens called: POST /ai/triage, POST /ai/prescription-ocr, GET /medical-reports/mine + POST /ai/analyze-report.
 * The old triage, symptom checker, timeline, translator and report routes redirect here with their query.
 */
export default async function AssistantPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("AssistantWeb");
  const mode = parseMode((await searchParams).mode);

  let reports: AssistantReport[] | null = [];
  if (mode === "report") {
    const loaded = await loadReports(token);
    if (loaded === "unauthorized") redirect(`/${locale}/login`);
    reports = loaded;
  }

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}`}>
      <CareHero tone="violet" icon="sparkle" label={t("title")} title={t(`heroTitle.${mode}`)} lines={[t(`heroLine.${mode}`)]} />
      <LinkSegmented
        label={t("modesLabel")}
        value={mode}
        options={ASSISTANT_MODES.map((value) => ({ value, label: t(`mode.${value}`), href: `/${locale}/ai?mode=${value}` }))}
      />
      {mode === "symptoms" ? <SymptomsClient /> : null}
      {mode === "prescription" ? <PrescriptionClient /> : null}
      {mode === "report" ? (reports === null ? <PartUnavailable>{t("reportsUnavailable")}</PartUnavailable> : <ReportClient reports={reports} />) : null}
    </ConsultPage>
  );
}
