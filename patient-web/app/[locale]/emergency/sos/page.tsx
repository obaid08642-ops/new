import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { EmergencySosClient } from "@/components-next/emergency-sos-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app emergency/sos: SOS trigger with GPS + quick numbers + tracking entry. */
export default async function EmergencySosPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/emergency`}>{ar ? "الطوارئ" : "Emergency"}</Link>
      <h1>{ar ? "طلب إسعاف فوري" : "Request immediate ambulance"}</h1>
      <EmergencySosClient locale={locale} />
    </main>
  );
}
