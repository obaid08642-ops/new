import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseMoodHistory } from "@/lib/api/mood";

/** The server sends a mood code from a fixed list (MoodValue); the page translates it, never shows it raw. */
const MOOD_CODES = ["great", "good", "okay", "bad", "terrible"] as const;
const isMoodCode = (value?: string): value is (typeof MOOD_CODES)[number] => MOOD_CODES.some((code) => code === value);
const MOOD_TAGS = ["calm", "tired", "stressed", "connected", "rested", "overwhelmed"] as const;
const isMoodTag = (value: string): value is (typeof MOOD_TAGS)[number] => (MOOD_TAGS as readonly string[]).includes(value);
import { getPatientMoodHistory } from "@/lib/api/mood-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { RowsCard } from "@/components-next/health/health-kit";
import { QuickLogForm } from "@/components-next/health/quick-log-form";

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
  // issue 864: the mood is logged on the website too (POST /mental-health/mood, as the app)
  if (entries.length === 0) return frame(<><QuickLogForm kind="mood" /><ConsultState kind="empty" icon="heart" tone="pink" title={t("moodTitle")} body={t("moodEmpty")} /></>);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return frame(
    <>
      <CareHero tone="pink" icon="heart" label={t("moodTitle")} title={t("moodTitle")} lines={[t("moodNotice")]} />
      <QuickLogForm kind="mood" />
      <RowsCard label={t("moodTitle")}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <RecordRow
              icon="heart"
              tone="pink"
              title={isMoodCode(entry.mood) ? t(`moodValue.${entry.mood}`) : t("moodUnavailable")}
              sub={[
                entry.energy !== undefined ? t("energy", { value: number.format(entry.energy) }) : null,
                entry.stress !== undefined ? t("stress", { value: number.format(entry.stress) }) : null,
                entry.sleepHours !== undefined ? t("sleepHours", { value: number.format(entry.sleepHours) }) : null,
                formatDate(locale, entry.loggedAt),
                entry.notes ?? null,
                entry.tags.length ? entry.tags.map((tag) => (isMoodTag(tag) ? t(`moodTag.${tag}`) : tag)).join(" · ") : null,
              ].filter((line): line is string => line !== null)}
            />
          </li>
        ))}
      </RowsCard>
    </>,
  );
}
