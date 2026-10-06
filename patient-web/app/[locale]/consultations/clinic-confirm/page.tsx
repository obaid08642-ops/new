import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, BulletList, Facts, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ appointmentId?: string; id?: string; view?: string }>;
};

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

/** Parity with app clinic-confirm (+ clinic-location via ?view=location): booking code, clinic, prep, policy. */
export default async function ConsultationClinicConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const locationView = sp.view === "location";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const raw = asRecord(await response.json().catch(() => null));
  const appt = asRecord(raw?.data) ?? raw;
  if (!appt?.id) notFound();

  let doctor: Record<string, unknown> | null = null;
  const doctorId = text(appt, ["doctor_id", "doctorId"]);
  if (doctorId) {
    const dr = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}`, {}, token);
    if (dr.ok) {
      const draw = asRecord(await dr.json().catch(() => null));
      doctor = asRecord(draw?.data) ?? draw;
    }
  }
  const facility = asRecord(appt.facility) ?? asRecord(doctor?.facility) ?? null;
  const bookingCode = String(appt.id).toUpperCase();
  const slotStart = text(appt, ["slot_start", "slotStart"]);
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
  const doctorUserId = doctorId && doctor ? text(doctor, ["doctor_user_id", "user_id", "account_id"]) || doctorId : doctorId;

  const id = encodeURIComponent(appointmentId);
  // the booking code is the appointment's own id, shown as the reception's scan text (a code, not a sentence)
  const codeText = `NABDAH:APPT:${bookingCode.slice(0, 8)}`; // i18n-ok: reception code, not translatable
  const detailRows: FactRow[] = [{ label: c("clinicNameLabel"), value: clinicName, icon: "hospital", tone: "blue" }];
  if (address) detailRows.push({ label: c("clinicAddressLabel"), value: address, icon: "map-pin", tone: "coral" });
  const actions: LinkAction[] = [];
  if (mapsUrl) actions.push({ href: mapsUrl, label: c("actionDirections"), variant: "primary", external: true });
  if (phone) actions.push({ href: `tel:${phone}`, label: c("actionCall"), variant: "outline", external: true });
  if (doctorUserId) actions.push({ href: `/${locale}/consultations/chat?doctorId=${encodeURIComponent(doctorUserId)}`, label: c("actionChat"), variant: "outline" });

  return (
    <ConsultPage locale={locale} title={locationView ? c("clinicLocationTitle") : c("clinicConfirmTitle")} backHref={`/${locale}/appointments/${id}`}>
      {!locationView ? (
        <SectionCard id="clinic-code" title={c("bookingCodeTitle")}>
          <p className={styles.profileTitle}><bdi>{codeText}</bdi></p>
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
          <SectionCard id="clinic-policy" title={c("policyTitle")}>
            <BulletList items={[c("clinicPolicy24"), c("clinicPolicy4"), c("clinicPolicyNone")]} />
            <ActionLinks actions={[{ href: `/${locale}/consultations/cancel-reschedule?appointmentId=${id}`, label: c("cancelTitle"), variant: "outline" }]} />
          </SectionCard>
        </>
      ) : null}
    </ConsultPage>
  );
}
