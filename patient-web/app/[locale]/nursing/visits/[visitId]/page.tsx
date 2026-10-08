import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Facts, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { NURSING, nursingStatus } from "@/components-next/nursing/nursing-parts";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { minutesText } from "@/components-next/diagnostics/diag-parts";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "@/components-next/nursing/nursing.module.css";

type Props = { params: Promise<{ locale: string; visitId: string }> };

const STEPS = ["REQUESTED", "CONFIRMED", "NURSE_EN_ROUTE", "NURSE_ARRIVED", "CARE_IN_PROGRESS", "COMPLETED"] as const;
const text = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Where one nursing visit is (canvas/OrderTracking): the status and the minutes to arrival, the nurse, the steps and, once there, the clinical report. */
export default async function NursingVisitTrackingPage({ params }: Props) {
  const { locale, visitId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9_-]{1,128}$/.test(visitId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);

  const [visitRes, trackRes] = await Promise.all([
    callPatientApi(`/nursing/visits/${encodeURIComponent(visitId)}`, {}, token),
    callPatientApi(`/nursing/visits/${encodeURIComponent(visitId)}/tracking`, {}, token),
  ]);
  if (visitRes.status === 401) redirect(`/${locale}/login`);
  if (visitRes.status === 403 || visitRes.status === 404) notFound();
  const visitPayload = visitRes.ok ? await visitRes.json().catch(() => null) : null;
  const trackPayload = trackRes.ok ? await trackRes.json().catch(() => null) : null;
  const visit = visitPayload?.data ?? visitPayload ?? null;
  const track = trackPayload?.data ?? trackPayload ?? null;
  const status = String(visit?.status ?? track?.status ?? "PENDING");
  const idx = STEPS.findIndex((s) => s === status);
  const eta = track?.eta_minutes ?? track?.eta ?? null;
  const etaMinutes = eta != null && Number.isFinite(Number(eta)) ? Number(eta) : null;
  const nurseName = visit?.nurse_name ?? visit?.nurse?.name ?? track?.nurse_name ?? null;
  const vitals = track?.vitals ?? visit?.vitals ?? null;
  const notes = track?.notes ?? visit?.notes ?? null;
  const pulse = vitals?.pulse;
  const bp = vitals?.bp;
  const look = nursingStatus(status);
  const reportRows: FactRow[] = [
    ...(pulse ? [{ label: t("pulse"), value: text(pulse), icon: "heartbeat" as const, tone: NURSING.tone }] : []),
    ...(bp ? [{ label: t("bloodPressure"), value: text(bp), icon: "drop" as const, tone: NURSING.tone }] : []),
    ...(notes ? [{ label: t("nurseNotes"), value: text(notes), icon: "clipboard-text" as const, tone: NURSING.tone }] : []),
  ];

  return (
    <ConsultPage locale={locale} title={t("trackingTitle")} backHref={`/${locale}/nursing/visits`}>
      <SectionCard id="visit-status">
        <div className={styles.etaHead}>
          <div>
            <span className={styles.etaLabel}>{etaMinutes !== null ? t("eta") : t("statusLabel")}</span>
            <div className={styles.etaValue}>{etaMinutes !== null ? minutesText(locale, etaMinutes) : t(`status.${look.key}`)}</div>
          </div>
          {nurseName ? <StatusChip label={`${t("nurse")}: ${text(nurseName)}`} tone={NURSING.tone} /> : null}
        </div>
        <Timeline
          label={t("trackingTitle")}
          steps={STEPS.map((s, i) => ({ id: s, label: t(`step_${s}`), state: idx < 0 || i > idx ? "upcoming" : i === idx && idx < STEPS.length - 1 ? "current" : "done" }))}
        />
        {idx < 0 ? <Notice warn>{t("unknownStatus")}</Notice> : null}
      </SectionCard>
      {reportRows.length > 0 ? (
        <SectionCard id="visit-report" title={t("reportTitle")}>
          <Facts rows={reportRows} label={t("reportTitle")} />
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
