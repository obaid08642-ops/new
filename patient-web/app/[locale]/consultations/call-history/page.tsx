import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { AppointmentCard } from "@/components-next/consult/appointment-card";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };
type Raw = Record<string, unknown>;

const record = (value: unknown): Raw | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null);
const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value : undefined);

/** Finished consultations (canvas/Appointments cards): the completed, cancelled and missed appointments of the patient. */
export default async function CallHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("CallHistory");
  const c = await getTranslations("ConsultWeb");
  const a = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const res = await getPatientAppointments(token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: unknown[] = Array.isArray(record(payload)?.data) ? (record(payload)?.data as unknown[]) : Array.isArray(payload) ? payload : [];
  const done = list
    .map(record)
    .filter((row): row is Raw => row !== null && ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(String(row.status ?? "")))
    .flatMap((row) => {
      const id = text(row.id);
      return id ? [{ id, status: String(row.status), doctor: text(row.doctor_name) ?? text(record(row.doctor)?.name), at: text(row.scheduled_at) ?? text(row.date) ?? text(row.slot_start), mode: modeOf(text(row.service_type)) }] : [];
    });
  const back = `/${locale}/appointments`;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {done.length === 0 ? (
        <ConsultState kind="empty" title={t("title")} body={t("emptyBody")} actionLabel={t("findDoctor")} actionHref={`/${locale}/consultations/doctors`} />
      ) : (
        <ul className={styles.list} aria-label={t("title")}>
          {done.map((row) => {
            const key = statusKey(row.status);
            return (
              <AppointmentCard
                key={row.id}
                locale={locale}
                href={`/${locale}/appointments/${encodeURIComponent(row.id)}`}
                title={row.doctor ?? t("unknownDoctor")}
                mode={row.mode}
                modeLabel={row.mode ? a(`services.${row.mode}`) : undefined}
                statusLabel={key ? c(`status.${key}`) : a("statusUnavailable")}
                statusTone={statusTone(row.status)}
                slotStart={row.at}
                timeLine={row.at ? <LocalTimeLine iso={row.at} locale={locale} /> : undefined}
              />
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
