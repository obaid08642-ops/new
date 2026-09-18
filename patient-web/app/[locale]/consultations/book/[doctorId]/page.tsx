import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDoctor, parseDoctorId } from "@/lib/api/doctors";
import { getPublicDoctor } from "@/lib/api/doctors-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { JsonLd } from "@/components-next/json-ld";
import { physician } from "@/lib/seo/structured-data";
import { BookingFlow } from "@/components-next/booking-flow";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string; doctorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doctorId } = await params;
  if (!isLocale(locale) || !parseDoctorId(doctorId).success) return {};
  const t = await getTranslations({ locale, namespace: "BookConsultation" });
  const canonical = localizedUrl(locale, `/consultations/book/${encodeURIComponent(doctorId)}`);
  return {
    title: t("title"),
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/consultations/book/${encodeURIComponent(doctorId)}`)])), "x-default": localizedUrl("ar", `/consultations/book/${encodeURIComponent(doctorId)}`) } },
    robots: { index: false, follow: false },
  };
}

export default async function BookConsultationPage({ params }: Props) {
  const { locale, doctorId } = await params;
  if (!isLocale(locale) || !parseDoctorId(doctorId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("BookConsultation");
  const token = await requirePatientAccess(locale);
  const response = await getPublicDoctor(doctorId);
  if (response?.status === 401) redirect(`/${locale}/login`);
  const doctor = response?.ok ? extractDoctor(await response.json().catch(() => null)) : null;
  const name = doctor?.name || t("doctorUnavailable");
  const canonical = localizedUrl(locale, `/consultations/book/${encodeURIComponent(doctorId)}`);
  return (
    <main className="main" style={{ background: "#FDFDFC" }}>
      <Link href={`/${locale}/consultations/doctors/${encodeURIComponent(doctorId)}`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}><ChevronLeft size={16} aria-hidden="true" />{t("back")}</Link>
      <JsonLd data={physician({ name, locale, path: `/consultations/doctors/${encodeURIComponent(doctorId)}`, specialty: doctor?.specialty })} />
      <section className="premium-hero" style={{ background: "rgba(253,253,252,0.92)", border: "1px solid #E8EDEE", borderRadius: 20, backdropFilter: "blur(16px)" } as any}><div className="premium-hero-copy">
        <div className="eyebrow" style={{ color: "#1E332E" } as any}><VectorDoctor size={48} aria-hidden="true" />{t("title")}</div>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</h1>
        <p style={{ overflowWrap: "anywhere" } as any}>{t("subtitle")}</p>
      </div></section>
      <BookingFlow doctorId={doctorId} locale={locale} doctor={doctor} />
    </main>
  );
}
