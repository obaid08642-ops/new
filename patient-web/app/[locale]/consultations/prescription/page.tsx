import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PrescriptionClient } from "@/components-next/prescription-client";
import { ConsultPage } from "@/components-next/consult/consult-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** The prescription a doctor issued for an appointment (canvas/HealthHub rows): its medicines, reminders, and the order from a pharmacy. */
export default async function PrescriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={c("prescriptionTitle")} backHref={`/${locale}/appointments`}>
      <PrescriptionClient locale={locale} appointmentId={appointmentId || undefined} />
    </ConsultPage>
  );
}
