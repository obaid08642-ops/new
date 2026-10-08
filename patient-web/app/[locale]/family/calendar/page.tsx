import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyCalendar } from "@/lib/api/family-server";
import { parseCalendarEvents } from "@/lib/family/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { RowsCard } from "@/components-next/health/health-kit";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import health from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }> };

/**
 * The shared family calendar (merge map C; the old shared-calendar routes redirect here): the events of GET /family/calendar,
 * each with its title, the member it is for and when. A patient with no family group has an empty calendar that says so.
 */
export default async function FamilyCalendarPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);

  const frame = (body: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("calendarTitle")} backHref={`/${locale}/family`}>{body}</ConsultPage>
  );
  let response: Response;
  try { response = await getPatientFamilyCalendar(token); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect(`/${locale}/login`);
  const empty = (
    <ConsultState kind="empty" icon="calendar-dots" title={t("calendarEmptyTitle")} body={t("calendarEmptyBody")} actionLabel={t("backToFamily")} actionHref={`/${locale}/family`} />
  );
  // 404 is "not in a family group": an empty calendar, not a failure.
  if (response.status === 404) return frame(empty);
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const events = parseCalendarEvents(await response.json().catch(() => null));
  if (events.length === 0) return frame(empty);
  return frame(
    <RowsCard label={t("calendarTitle")}>
      {events.map((event) => (
        <li key={event.id}>
          <div className={health.row}>
            <FIcon icon="calendar-dots" tone="coral" size={40} />
            <span className={health.rowBody}>
              <span className={health.rowTitle}>{event.title ?? t("calendarEvent")}</span>
              {event.member ? <span className={health.rowSub}>{event.member}</span> : null}
              {event.at ? <LocalTimeLine iso={event.at} locale={locale} className={health.rowSub} /> : null}
            </span>
          </div>
        </li>
      ))}
    </RowsCard>,
  );
}
