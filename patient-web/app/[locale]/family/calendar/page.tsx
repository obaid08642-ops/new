import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyCalendar, getPatientFamilyMembers } from "@/lib/api/family-server";
import { extractFamilyMembers } from "@/lib/api/family";
import { parseCalendarEvents } from "@/lib/family/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { RowsCard } from "@/components-next/health/health-kit";
import { FormSheet } from "@/components-next/health/form-sheet";
import { AddEventForm, DeleteEventButton } from "@/components-next/family/calendar-actions";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import health from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ add?: string | string[] }> };

/** The icon of each event type, as the app draws it. */
const TYPE_LOOK: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  appointment: { icon: "stethoscope", tone: SERVICE_ICONS.consult.tone },
  medication: { icon: "pill", tone: "mint" },
  lab: { icon: "test-tube", tone: "violet" },
  reminder: { icon: "bell", tone: "amber" },
  order: { icon: "package", tone: "peach" },
};

/**
 * The shared family calendar (merge map C; the old shared-calendar routes redirect here): the events of GET /family/calendar,
 * each with its type icon, title, the member it is for and when, a delete button on the events the person may delete, and
 * "Add an event" (the app's "+" form). A patient with no family group has an empty calendar that says so.
 */
export default async function FamilyCalendarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);
  const here = `/${locale}/family/calendar`;

  const frame = (body: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("calendarTitle")} backHref={`/${locale}/family`}>{body}</ConsultPage>
  );
  let response: Response;
  let membersResponse: Response | null = null;
  try {
    [response, membersResponse] = await Promise.all([getPatientFamilyCalendar(token), getPatientFamilyMembers(token).catch(() => null)]);
  } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect(`/${locale}/login`);
  const empty = (
    <ConsultState kind="empty" icon="calendar-dots" title={t("calendarEmptyTitle")} body={t("calendarEmptyBody")} actionLabel={t("backToFamily")} actionHref={`/${locale}/family`} />
  );
  // 404 is "not in a family group": an empty calendar, not a failure.
  if (response.status === 404) return frame(empty);
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const events = parseCalendarEvents(await response.json().catch(() => null));
  const members = membersResponse?.ok ? extractFamilyMembers(await membersResponse.json().catch(() => null)).map((m) => ({ id: m.id, name: m.displayName || t("member") })) : [];
  const adding = (Array.isArray(query.add) ? query.add[0] : query.add) === "1" && members.length > 0;
  return frame(
    <>
      {members.length ? <ButtonLink href={`${here}?add=1`} label={t("calendarAdd")} size="md" variant="outline" /> : null}
      {adding ? (
        <FormSheet title={t("calendarNewTitle")} triggerLabel={t("calendarAdd")} closeLabel={t("close")} defaultOpen closeHref={here} hideTrigger>
          <AddEventForm members={members} doneHref={here} />
        </FormSheet>
      ) : null}
      {events.length === 0 ? empty : (
        <RowsCard label={t("calendarTitle")}>
          {events.map((event) => {
            const look = TYPE_LOOK[event.type ?? ""] ?? TYPE_LOOK.reminder;
            return (
              <li key={event.id}>
                <div className={health.row}>
                  <FIcon icon={look.icon} tone={look.tone} size={40} />
                  <span className={health.rowBody}>
                    <span className={health.rowTitle}>{event.title ?? t("calendarEvent")}</span>
                    {event.member ? <span className={health.rowSub}>{event.member}</span> : null}
                    {event.at ? <LocalTimeLine iso={event.at} locale={locale} className={health.rowSub} /> : null}
                  </span>
                  {event.canDelete ? <DeleteEventButton eventId={event.id} /> : null}
                </div>
              </li>
            );
          })}
        </RowsCard>
      )}
    </>,
  );
}
