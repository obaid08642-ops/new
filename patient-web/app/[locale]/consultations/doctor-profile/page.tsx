import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ doctorId?: string; id?: string; visit_type?: string; service_type?: string }>;
};

/** Parity with app doctor-profile: legacy route, canonical profile is consultations/doctors/[doctorId]. */
export default async function ConsultationDoctorProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const doctorId = (sp.doctorId || sp.id || "").trim();
  if (!doctorId) redirect(`/${locale}/consultations/doctors`);
  const serviceType = (sp.service_type || (sp.visit_type === "online" ? "video" : sp.visit_type) || "").trim();
  redirect(
    `/${locale}/consultations/doctors/${encodeURIComponent(doctorId)}${serviceType ? `?service_type=${encodeURIComponent(serviceType)}` : ""}`,
  );
}
