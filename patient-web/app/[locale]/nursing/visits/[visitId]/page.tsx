import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Facts, Notice, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { NURSING, nursingStatus } from "@/components-next/nursing/nursing-parts";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { minutesText } from "@/components-next/diagnostics/diag-parts";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { TrackingRefresh } from "@/components-next/orders/tracking-refresh";
import { NursingPayButton } from "@/components-next/nursing/nursing-pay";
import styles from "@/components-next/nursing/nursing.module.css";

type Props = { params: Promise<{ locale: string; visitId: string }>; searchParams: Promise<{ pay?: string }> };

const STEPS = ["REQUESTED", "CONFIRMED", "NURSE_EN_ROUTE", "NURSE_ARRIVED", "CARE_IN_PROGRESS", "COMPLETED"] as const;
/** Backend nursing states (NursingBookingState) → the timeline step they belong to (needs-review issue 652). */
const STEP_OF: Record<string, (typeof STEPS)[number]> = {
  NEW_REQUEST: "REQUESTED", PENDING_INSURANCE: "REQUESTED", WAITING_COPAY: "REQUESTED",
  PROVIDER_ASSIGNED: "CONFIRMED", ACCEPTED: "CONFIRMED",
  IN_TRANSIT: "NURSE_EN_ROUTE", EN_ROUTE: "NURSE_EN_ROUTE",
  ARRIVED: "NURSE_ARRIVED",
  IN_PROGRESS: "CARE_IN_PROGRESS", CARE_STARTED: "CARE_IN_PROGRESS",
};
const text = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Where one nursing visit is (canvas/OrderTracking): the status and the minutes to arrival, the nurse, the steps and, once there, the clinical report. */
export default async function NursingVisitTrackingPage({ params, searchParams }: Props) {
  const { locale, visitId } = await params;
  const { pay } = await searchParams;
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
  const status = String(visit?.status ?? visit?.state ?? track?.status ?? track?.state ?? "PENDING");
  const idx = STEPS.findIndex((s) => s === (STEP_OF[status] ?? status));
  const eta = track?.eta_minutes ?? track?.eta ?? null;
  const etaMinutes = eta != null && Number.isFinite(Number(eta)) ? Number(eta) : null;
  const nurseName = visit?.nurse_name ?? visit?.nurse?.name ?? track?.nurse_name ?? null;
  const vitals = track?.vitals ?? visit?.vitals ?? null;
  const notes = track?.notes ?? visit?.notes ?? null;
  const pulse = vitals?.pulse;
  const bp = vitals?.bp;
  const look = nursingStatus(status);
  // The app refreshes the tracking every 15 seconds while the visit is open.
  const open = !["COMPLETED", "CANCELLED"].includes(status);
  const phone = typeof track?.nurse_phone === "string" && /^\+?[0-9 ()-]{5,20}$/.test(track.nurse_phone.trim()) ? track.nurse_phone.trim() : null;
  const lat = Number(track?.current_lat);
  const lng = Number(track?.current_lng);
  const located = track?.current_lat != null && track?.current_lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const contact: LinkAction[] = [
    ...(phone && open ? [{ href: `tel:${phone}`, label: t("callNurse"), variant: "outline" as const, external: true }] : []),
    ...(located && open ? [{ href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`, label: t("nurseOnMap"), variant: "outline" as const, external: true }, { href: `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`, label: t("nurseDirections"), variant: "outline" as const, external: true }] : []),
  ];
  // journeys#60: a card visit that is not paid yet can be paid from here (the booking form lands here when the card page did not open).
  const owesCard = visit?.payment_method === "card" && visit?.payment_status !== "paid" && !["CANCELLED", "COMPLETED"].includes(status);
  // N1: result files the nurse attached at the end of the visit ({storage_id, name, mime, at}); each opens through the signed-URL route.
  type VisitFile = { storage_id: string; name?: string; at?: string };
  const attachments: unknown[] = Array.isArray(visit?.attachments) ? visit.attachments : [];
  const files = attachments.filter((f): f is VisitFile => typeof (f as { storage_id?: unknown })?.storage_id === "string").slice(0, 10);
  const dateText = (v: unknown): string => {
    const d = typeof v === "string" ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d) : "";
  };
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
        {located && open ? (
          <iframe
            title={t("nurseMapTitle")}
            className={styles.visitMap}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        ) : null}
        {idx < 0 ? <Notice warn>{t("unknownStatus")}</Notice> : null}
        <ActionLinks actions={contact} />
      </SectionCard>
      {open ? <TrackingRefresh intervalSeconds={15} /> : null}
      {owesCard ? (
        <SectionCard id="visit-pay" title={t("payTitle")}>
          <NursingPayButton bookingId={visitId} failedBefore={pay === "failed"} />
        </SectionCard>
      ) : null}
      {reportRows.length > 0 ? (
        <SectionCard id="visit-report" title={t("reportTitle")}>
          <Facts rows={reportRows} label={t("reportTitle")} />
        </SectionCard>
      ) : null}
      {files.length > 0 ? (
        <SectionCard id="visit-files" title={t("resultFilesTitle")}>
          <ul className={styles.fileList}>
            {files.map((f) => {
              const name = text(f.name) || f.storage_id;
              const when = dateText(f.at);
              return (
                <li key={f.storage_id}>
                  <a className={styles.fileLink} href={`/api/nursing/files/${encodeURIComponent(f.storage_id)}`} target="_blank" rel="noopener noreferrer" aria-label={t("openFile", { name })}>
                    <span className={styles.fileName}>{name}</span>
                    {when ? <span className={styles.meta}>{when}</span> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
