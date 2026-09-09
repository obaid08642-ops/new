import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { EmergencySosActiveClient } from "@/components-next/emergency-sos-active-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app emergency/sos-active: live SOS status polled every 10s + governed cancel. */
export default async function EmergencySosActivePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/emergency`}>{ar ? "الطوارئ" : "Emergency"}</Link>
      <h1>{ar ? "طوارئ نشطة SOS" : "Active emergency SOS"}</h1>
      <EmergencySosActiveClient locale={locale} />
    </main>
  );
}
