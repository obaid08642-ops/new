import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ background: "#FDFDFC", gap: 16, padding: "16px 0" } as any}>
      <Link href={`/${locale}/consultations/appointments`} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>{ar ? "مواعيدي" : "My appointments"}</Link>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "وصفة طبية" : "Prescription"}</h1>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
      </section>
      <PrescriptionClient locale={locale} appointmentId={appointmentId || undefined} />
    </main>
  );
}
