import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Facts, Hero, Notice, SectionCard, type FactRow, type LinkAction } from "@/components-next/consult/consult-parts";
import { nursingStatus } from "@/components-next/nursing/nursing-parts";
import { money } from "@/components-next/diagnostics/diag-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; id?: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const INSURANCE = SERVICE_ICONS.insurance;

/**
 * Where the insurance approval of a home care booking stands (canvas/ServiceHub, insurance): the owned booking (or the
 * latest insurance one), its state, the decision and the co-pay, and the way to the live visit once it is confirmed.
 */
export default async function NursingInsuranceStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const sp = await searchParams;
  const bookingId = (sp.bookingId || sp.id || "").trim();

  let booking: Record<string, unknown> | null = null;
  if (bookingId) {
    const res = await callPatientApi(`/home-care/bookings/${encodeURIComponent(bookingId)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.ok) {
      const payload = asRecord(await res.json().catch(() => null));
      booking = asRecord(payload?.data) ?? payload;
    }
  }
  if (!booking?.id) {
    const res = await callPatientApi("/home-care/bookings/my?limit=5", {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.ok) {
      const raw = await res.json().catch(() => null);
      const payload = asRecord(raw);
      // the list is a bare array or wrapped in data / bookings / items
      const list = Array.isArray(raw) ? raw : [payload?.data, payload?.bookings, payload?.items].find(Array.isArray);
      const arr = (Array.isArray(list) ? list : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r?.id);
      booking = arr.find((b) => b.payment_method === "insurance") ?? arr[0] ?? null;
    }
  }
  if (!booking?.id) notFound();

  const state = typeof booking.state === "string" ? booking.state : typeof booking.status === "string" ? booking.status : "";
  const status = nursingStatus(state);
  const decisionRaw = typeof booking.decision === "string" ? booking.decision : null;
  const decision = decisionRaw ? nursingStatus(decisionRaw) : null;
  const copayRaw = booking.copay_amount ?? booking.patient_share;
  const copay = typeof copayRaw === "number" ? copayRaw : Number(copayRaw);
  const liveOk = ["CONFIRMED", "IN_PROGRESS", "APPROVED_FULL"].includes(state) && typeof booking.id === "string";
  const rows: FactRow[] = [
    ...(decision ? [{ label: t("decisionLabel"), value: t(`status.${decision.key}`), icon: "shield-check" as const, tone: INSURANCE.tone }] : []),
    ...(Number.isFinite(copay) && copay > 0 ? [{ label: t("copayLabel"), value: money(locale, copay), icon: "tag" as const, tone: INSURANCE.tone }] : []),
  ];
  const actions: LinkAction[] = [
    ...(liveOk ? [{ href: `/${locale}/nursing/visits/${encodeURIComponent(booking.id as string)}`, label: t("openTracking") }] : []),
    { href: `/${locale}/nursing/visits`, label: t("visitsLink"), variant: "outline" as const },
  ];
  return (
    <ConsultPage locale={locale} title={t("insuranceTitle")} backHref={`/${locale}/nursing/visits`}>
      <Hero icon={INSURANCE.icon} tone={INSURANCE.tone} title={t(`status.${status.key}`)} sub={t("insuranceTitle")} />
      {rows.length > 0 ? (
        <SectionCard id="insurance-facts">
          <Facts rows={rows} label={t("insuranceTitle")} />
        </SectionCard>
      ) : null}
      <Notice>{t("insuranceNote")}</Notice>
      <ActionLinks actions={actions} />
    </ConsultPage>
  );
}
