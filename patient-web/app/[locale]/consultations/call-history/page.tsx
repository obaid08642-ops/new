import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { parseCallHistory, type CallStatus } from "@/lib/consult/call-history";
import { AppointmentCard } from "@/components-next/consult/appointment-card";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { SERVICE_ICONS, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

const TONE: Record<CallStatus, ServiceTone> = {
  ended: SERVICE_ICONS.lab.tone,
  active: SERVICE_ICONS.lab.tone,
  pending: SERVICE_ICONS.map.tone,
  rejected: "ink",
  missed: "ink",
};

/** "2 min 5 s", written by Intl in the page's locale. */
function duration(locale: string, seconds: number): string {
  const unit = (value: number, name: "minute" | "second") => new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "short", maximumFractionDigits: 0 }).format(value);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes === 0 ? unit(rest, "second") : rest === 0 ? unit(minutes, "minute") : `${unit(minutes, "minute")} ${unit(rest, "second")}`;
}

/** The patient's calls (canvas/Appointments cards): the call records the server keeps (GET /calls/history), newest first. */
export default async function CallHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("CallHistory");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/calls/history?page=1&limit=50", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const back = `/${locale}/appointments`;
  if (!res.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const calls = parseCallHistory(await res.json().catch(() => null));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {calls.length === 0 ? (
        <ConsultState kind="empty" title={t("title")} body={t("emptyBody")} actionLabel={t("findDoctor")} actionHref={`/${locale}/consultations/doctors`} />
      ) : (
        <ul className={styles.list} aria-label={t("title")}>
          {calls.map((call) => (
            <AppointmentCard
              key={call.id}
              locale={locale}
              href={call.appointmentId ? `/${locale}/appointments/${encodeURIComponent(call.appointmentId)}` : back}
              title={call.kind === "video" ? t("videoCall") : t("voiceCall")}
              mode={call.kind === "video" ? "video" : null}
              statusLabel={t(`status.${call.status}`)}
              statusTone={TONE[call.status]}
              slotStart={call.at}
              timeLine={
                <>
                  {call.at ? <LocalTimeLine iso={call.at} locale={locale} /> : null}
                  {call.at && call.durationSeconds ? " · " : null}
                  {call.durationSeconds ? <span>{duration(locale, call.durationSeconds)}</span> : null}
                </>
              }
            />
          ))}
        </ul>
      )}
    </ConsultPage>
  );
}
