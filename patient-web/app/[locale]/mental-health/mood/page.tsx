import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseMoodHistory } from "@/lib/api/mood";
import { getPatientMoodHistory } from "@/lib/api/mood-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { RowsCard } from "@/components-next/health/health-kit";

type Props = { params: Promise<{ locale: string }> };

/**
 * Mood journal (canvas/CareHub list): the entries of the last 30 days (GET /mental-health/mood?days=30), each with its mood, energy,
 * stress, sleep hours and date. The web has no form to log a mood (the old page was read-only too): see Needs review.
 */
export default async function MoodJournalPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("moodTitle")} backHref={`/${locale}/mental-health`}>
      {body}
    </ConsultPage>
  );

  let response: Response;
  try {
    response = await getPatientMoodHistory(token);
  } catch {
    return frame(<ConsultState kind="error" title={t("moodUnavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return frame(<ConsultState kind="error" title={t("moodUnavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const entries = parseMoodHistory(await response.json().catch(() => null));
  if (entries.length === 0) return frame(<ConsultState kind="empty" icon="heart" tone="pink" title={t("moodTitle")} body={t("moodEmpty")} />);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return frame(
    <>
      <CareHero tone="pink" icon="heart" label={t("moodTitle")} title={t("moodTitle")} lines={[t("moodNotice")]} />
      <RowsCard label={t("moodTitle")}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <RecordRow
              icon="heart"
              tone="pink"
              title={entry.mood || t("moodUnavailable")}
              sub={[
                entry.energy !== undefined ? t("energy", { value: number.format(entry.energy) }) : null,
                entry.stress !== undefined ? t("stress", { value: number.format(entry.stress) }) : null,
                entry.sleepHours !== undefined ? t("sleepHours", { value: number.format(entry.sleepHours) }) : null,
                formatDate(locale, entry.loggedAt),
              ].filter((line): line is string => line !== null)}
            />
          </li>
        ))}
      </RowsCard>
    </>,
  );
}
