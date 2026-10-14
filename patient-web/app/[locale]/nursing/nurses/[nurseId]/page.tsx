import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicNurse, extractNurse } from "@/lib/api/nursing-server";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { NursingBookingForm } from "@/components-next/nursing-booking-form";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { NURSING } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import consult from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; nurseId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nurseId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NurseDetail" });
  const canonical = localizedUrl(locale, `/nursing/nurses/${encodeURIComponent(nurseId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/nursing/nurses/${encodeURIComponent(nurseId)}`)])),
        "x-default": localizedUrl("ar", `/nursing/nurses/${encodeURIComponent(nurseId)}`),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

async function NursingBookingSection({
  locale,
  nurse,
}: {
  locale: string;
  nurse: { id: string; services?: Array<{ id: string; name: string; name_ar?: string; name_en?: string; price?: number }> };
}) {
  const t = await getTranslations("NursingWeb");
  const services = (nurse.services || [])
    .filter((s) => s.id && s.name)
    .map((s) => ({
      id: s.id,
      name: pickText(locale, s.name_ar || s.name, s.name_en || s.name) ?? s.name,
      price: s.price,
    }));
  if (!services.length) return null;
  let addresses: Array<{ id: string; label: string }> = [];
  try {
    const token = await requirePatientAccess(locale);
    const res = await getPatientAddresses(token);
    if (res.ok) {
      const raw = await res.json().catch(() => null);
      const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
      addresses = (Array.isArray(list) ? list : []).map((a: unknown) => {
        const r = a as Record<string, unknown>;
        const id = String(r.id ?? r._id ?? "");
        if (!id) return null;
        return {
          id,
          label: String(r.label ?? r.line1 ?? r.city ?? id),
        };
      }).filter((a): a is { id: string; label: string } => a !== null);
    }
  } catch {
    addresses = [];
  }
  return (
    <SectionCard id="nurse-request" title={t("requestNurse")}>
      <NursingBookingForm locale={locale} services={services} addresses={addresses} />
    </SectionCard>
  );
}

/** One nurse (canvas/DoctorFull): who it is, the figures the server sent, what the nurse offers, and the booking form. Public: reads nothing of the visitor but the booking form's addresses, as before. */
export default async function NurseDetailPage({ params }: Props) {
  const { locale, nurseId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("NursingWeb");
  const response = await getPublicNurse(nurseId);
  if (!response || response.status === 404) notFound();
  const back = `/${locale}/nursing/catalog`;

  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("nurseTitle")} backHref={back}>
        <ConsultState kind="error" title={t("nurseUnavailableTitle")} body={t("nurseUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }

  const nurse = extractNurse(await response.json().catch(() => null));
  if (!nurse) notFound();

  const name = pickText(locale, nurse.name_ar || nurse.name, nurse.name_en || nurse.name) ?? nurse.name;
  const specialty = pickText(locale, nurse.specialty_ar || nurse.specialty, nurse.specialty_en || nurse.specialty);
  const stats: ProfileStat[] = [
    ...(nurse.experience_years ? [{ value: new Intl.NumberFormat(locale, { style: "unit", unit: "year", unitDisplay: "long", maximumFractionDigits: 0 }).format(nurse.experience_years), label: t("experienceLabel") }] : []),
    ...(typeof nurse.rating === "number" && nurse.rating > 0 ? [{ value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(nurse.rating), label: t("ratingLabel") }] : []),
  ];
  const serviceRows: FactRow[] = (nurse.services ?? []).map((svc) => ({
    label: pickText(locale, svc.name_ar || svc.name, svc.name_en || svc.name) ?? svc.name,
    value: [svc.price !== undefined ? money(locale, svc.price) : "", svc.duration ?? ""].filter(Boolean).join(" · "),
    icon: NURSING.icon,
    tone: NURSING.tone,
  }));

  return (
    <ConsultPage locale={locale} title={name} backHref={back}>
      <ProfileHeader icon="user-circle" tone={NURSING.tone} line={[specialty, nurse.city].filter(Boolean).join(" · ") || undefined} stats={stats} />
      {nurse.bio ? (
        <SectionCard id="nurse-about" title={t("aboutTitle")}>
          <p className={consult.body}>{nurse.bio}</p>
        </SectionCard>
      ) : null}
      {serviceRows.length > 0 ? (
        <SectionCard id="nurse-services" title={t("nurseServicesTitle")}>
          <Facts rows={serviceRows} label={t("nurseServicesTitle")} />
        </SectionCard>
      ) : null}
      <NursingBookingSection locale={locale} nurse={nurse} />
    </ConsultPage>
  );
}
