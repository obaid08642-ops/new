import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseBreathingHistory } from "@/lib/api/breathing";
import { getPatientBreathingHistory } from "@/lib/api/breathing-server";
import { parseMeditationHistory } from "@/lib/api/meditation";
import { getPatientMeditationHistory } from "@/lib/api/meditation-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { RecordRow } from "@/components-next/care/care-kit";
import { HealthTabs, RowsCard } from "@/components-next/health/health-kit";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[] }> };
const TABS = ["breathing", "meditation"] as const;

/**
 * Relax (merge map section 5): one screen with two tabs, `?tab=breathing|meditation`, replacing the two history pages. Breathing is
 * GET /mental-health/breathing, Meditation GET /mental-health/meditation; only the open tab is fetched. Starting a session is not
 * possible on the web (the old pages were history only too): see Needs review.
 */
export default async function RelaxPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const tab = pickTab(query.tab, TABS, "breathing");

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("relaxTitle")} backHref={`/${locale}/mental-health`}>
      <HealthTabs label={t("relaxTitle")} base={`/${locale}/mental-health/relax`} active={tab} options={[
        { value: "breathing", label: t("tabBreathing") },
        { value: "meditation", label: t("tabMeditation") },
      ]} />
      {body}
    </ConsultPage>
  );
  const failed = frame(<ConsultState kind="error" title={t("relaxUnavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  let response: Response;
  try {
    response = await (tab === "breathing" ? getPatientBreathingHistory(token) : getPatientMeditationHistory(token));
  } catch {
    return failed;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;
  const payload = await response.json().catch(() => null);
  const number = new Intl.NumberFormat(locale);

  if (tab === "breathing") {
    const sessions = parseBreathingHistory(payload);
    if (sessions.length === 0) return frame(<ConsultState kind="empty" icon="heartbeat" tone="blue" title={t("tabBreathing")} body={t("breathingEmpty")} />);
    return frame(
      <>
        <RowsCard label={t("tabBreathing")}>
          {sessions.map((session) => (
            <li key={session.id}>
              <RecordRow
                icon="heartbeat"
                tone="blue"
                title={session.technique || t("techniqueUnavailable")}
                sub={[
                  session.rounds !== undefined ? t("rounds", { value: number.format(session.rounds) }) : null,
                  session.durationSeconds !== undefined ? t("durationSeconds", { value: number.format(session.durationSeconds) }) : null,
                  formatDate(locale, session.loggedAt),
                ].filter((line): line is string => line !== null)}
              />
            </li>
          ))}
        </RowsCard>
        <Notice>{t("relaxNotice")}</Notice>
      </>,
    );
  }

  const sessions = parseMeditationHistory(payload);
  if (sessions.length === 0) return frame(<ConsultState kind="empty" icon="brain" tone="violet" title={t("tabMeditation")} body={t("meditationEmpty")} />);
  return frame(
    <>
      <RowsCard label={t("tabMeditation")}>
        {sessions.map((session) => (
          <li key={session.id}>
            <RecordRow
              icon="brain"
              tone="violet"
              title={session.type || t("meditationUnavailable")}
              sub={[
                session.durationMinutes !== undefined ? t("durationMinutes", { value: number.format(session.durationMinutes) }) : null,
                session.completed === undefined ? null : session.completed ? t("completed") : t("notCompleted"),
                formatDate(locale, session.loggedAt),
              ].filter((line): line is string => line !== null)}
            />
          </li>
        ))}
      </RowsCard>
      <Notice>{t("relaxNotice")}</Notice>
    </>,
  );
}
