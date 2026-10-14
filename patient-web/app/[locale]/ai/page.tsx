import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ASSISTANT_MODES, parseMode } from "@/lib/ai/assistant";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { CareHero } from "@/components-next/care/care-kit";
import { SymptomsClient } from "@/components-next/assistant/symptoms-client";
import { PrescriptionClient } from "@/components-next/assistant/prescription-client";
import { ReportClient } from "@/components-next/assistant/report-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The one AI assistant (merge map section 4): three modes in the URL (`?mode=symptoms|prescription|report`) over the endpoints
 * the old screens called: POST /ai/triage, POST /ai/prescription-ocr. The report mode sends nothing (no automatic report reading).
 * The old triage, symptom checker, timeline, translator and report routes redirect here with their query.
 */
export default async function AssistantPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("AssistantWeb");
  const mode = parseMode((await searchParams).mode);

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
      {mode === "report" ? <ReportClient /> : null}
    </ConsultPage>
  );
}
