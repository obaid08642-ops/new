import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { signInHref } from "@/lib/services/guest";
import { GuestAction } from "@/components-next/guest/guest-service";
import { Notice } from "@/components-next/consult/consult-parts";
import { isLocale } from "@/lib/i18n";
import { ASSISTANT_MODES, parseMode, type AssistantMode } from "@/lib/ai/assistant";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { CareHero } from "@/components-next/care/care-kit";
import { SymptomsClient } from "@/components-next/assistant/symptoms-client";
import { PrescriptionClient } from "@/components-next/assistant/prescription-client";
import { ReportClient } from "@/components-next/assistant/report-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The one AI assistant (merge map section 4): three modes in the URL (`?mode=symptoms|prescription|report`) over
 * POST /ai/assistant (decision 15) and POST /ai/prescription-ocr. The report mode sends nothing (no automatic report reading).
 * The old triage, symptom checker, timeline, translator and report routes redirect here with their query.
 * Issue 1550: a guest sees the landing (what each mode does) and the sign-in comes at the action, back to the same mode; the
 * assistant's reads need the session (POST /ai/* are not public), so its forms are drawn only for a signed-in patient.
 */
export default async function AssistantPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const signedIn = Boolean(await getOptionalPatientAccessToken());
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
      {signedIn ? (
        <>
          {mode === "symptoms" ? <SymptomsClient /> : null}
          {mode === "prescription" ? <PrescriptionClient /> : null}
          {mode === "report" ? <ReportClient /> : null}
        </>
      ) : (
        <GuestAssistant locale={locale} mode={mode} />
      )}
    </ConsultPage>
  );
}

/** The action card of a guest: what is private, and the sign-in that comes back to this mode. */
async function GuestAssistant({ locale, mode }: { locale: string; mode: AssistantMode }) {
  const t = await getTranslations("AssistantWeb");
  const g = await getTranslations("GuestServices");
  return (
    <>
      <GuestAction id="ai-sign-in" title={g("ai.actionTitle")} body={g("ai.actionBody")} label={g("ai.action")} href={signInHref(locale, `/${locale}/ai?mode=${mode}`)} />
      <Notice>{t("disclaimer")}</Notice>
    </>
  );
}
