import { getTranslations } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { getCancellationPolicy } from "@/lib/consult/cancellation-policy";
import { ActionLinks, BulletList, Facts, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { PolicyCard, policyLines } from "@/components-next/consult/policy-lines";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/consult/consult.module.css";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function text(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/**
 * (An async function that returns the sections, called by the page: an async component cannot be rendered by the static tests.)
 * The confirmed state of a clinic booking (merge map 2, section 1; was /consultations/clinic-confirm): the reception code, the
 * clinic's details with directions, call and chat, the preparation list and the cancel or reschedule card. It is drawn by
 * booking-status from the appointment record that page already read (GET /care/appointments/:id) plus the doctor's facility
 * (GET /care/doctors/:id). `locationView` is the place only.
 */
export async function clinicConfirmation({ locale, appointment, token, locationView = false }: { locale: string; appointment: Record<string, unknown>; token: string; locationView?: boolean }) {
  const c = await getTranslations("ConsultWeb");
  let doctor: Record<string, unknown> | null = null;
  const doctorId = text(appointment, ["doctor_id", "doctorId"]);
  if (doctorId) {
    const dr = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}`, {}, token);
    if (dr.ok) {
      const draw = asRecord(await dr.json().catch(() => null));
      doctor = asRecord(draw?.data) ?? draw;
    }
  }
  const policy = locationView ? null : await getCancellationPolicy(token);
  const facility = asRecord(appointment.facility) ?? asRecord(doctor?.facility) ?? null;
  const bookingCode = String(appointment.id).toUpperCase();
  const slotStart = text(appointment, ["slot_start", "slotStart"]);
  const hasWhen = Boolean(slotStart && Number.isFinite(Date.parse(slotStart)));
  const clinicName = (facility && text(facility, ["name", "name_ar"])) || (doctor && text(doctor, ["clinic_name", "clinicName"])) || c("clinicDefaultName");
  const address = (facility && text(facility, ["address", "address_ar"])) || (doctor && text(doctor, ["clinic_address", "clinicAddress"]));
  const phone = (facility && text(facility, ["phone"])) || (doctor && text(doctor, ["clinic_phone", "clinicPhone", "phone"]));
  const loc = asRecord(facility?.location) ?? asRecord(doctor?.location);
  const lat = typeof loc?.lat === "number" ? loc.lat : null;
  const lng = typeof loc?.lng === "number" ? loc.lng : null;
  const mapsUrl = lat !== null && lng !== null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;

  const id = encodeURIComponent(String(appointment.id));
  // the booking code is the appointment's own id, shown as the reception's scan text (a code, not a sentence)
  const codeText = `NABDAH:APPT:${bookingCode.slice(0, 8)}`; // i18n-ok: reception code, not translatable
  const detailRows: FactRow[] = [{ label: c("clinicNameLabel"), value: clinicName, icon: "hospital", tone: "blue" }];
  if (address) detailRows.push({ label: c("clinicAddressLabel"), value: address, icon: "map-pin", tone: SERVICE_ICONS.map.tone });
  const actions: LinkAction[] = [];
  if (mapsUrl) actions.push({ href: mapsUrl, label: c("actionDirections"), variant: "primary", external: true });
  if (phone) actions.push({ href: `tel:${phone}`, label: c("actionCall"), variant: "outline", external: true });
  if (doctorId) actions.push({ href: `/${locale}/appointments/${id}/chat`, label: c("actionChat"), variant: "outline" });

  return (
    <>
      {!locationView ? (
        <SectionCard id="clinic-code" title={c("bookingCodeTitle")}>
          <p className={styles.codeText}><bdi>{codeText}</bdi></p>
          {slotStart && hasWhen ? <LocalTimeLine iso={slotStart} locale={locale} className={styles.heroSub} /> : null}
        </SectionCard>
      ) : null}
      <SectionCard id="clinic-details" title={c("clinicDetailsTitle")}>
        <Facts rows={detailRows} />
        <ActionLinks actions={actions} />
      </SectionCard>
      {!locationView ? (
        <>
          <SectionCard id="clinic-prep" title={c("prepTitle")}>
            <BulletList items={[c("prep1"), c("prep2"), c("prep3"), c("prep4")]} />
          </SectionCard>
          <PolicyCard title={c("policyTitle")} lines={policyLines(c, policy)}>
            <ActionLinks actions={[{ href: `/${locale}/consultations/cancel-reschedule?appointmentId=${id}`, label: c("cancelTitle"), variant: "outline" }]} />
          </PolicyCard>
        </>
      ) : null}
    </>
  );
}
