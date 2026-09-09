import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { EmergencyTrackingClient } from "@/components-next/emergency-tracking-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app emergency/tracking: server-only tracking data polled every 10s, tel:997 fallback. */
export default async function EmergencyTrackingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/emergency`}>{ar ? "الطوارئ" : "Emergency"}</Link>
      <h1>{ar ? "تتبع سيارة الإسعاف" : "Track ambulance"}</h1>
      <EmergencyTrackingClient locale={locale} />
    </main>
  );
}
