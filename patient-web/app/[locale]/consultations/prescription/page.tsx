import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PrescriptionClient } from "@/components-next/prescription-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** Parity with app prescription-from-doctor: doctor-issued Rx matched by appointment. */
export default async function PrescriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/consultations/appointments`}>{ar ? "مواعيدي" : "My appointments"}</Link>
      <h1>{ar ? "وصفة طبية" : "Prescription"}</h1>
      <PrescriptionClient locale={locale} appointmentId={appointmentId || undefined} />
    </main>
  );
}
