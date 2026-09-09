import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyScanClient } from "@/components-next/family-scan-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app family/scan: QR invite scan; web accepts pasted code/link then opens join. */
export default async function FamilyScanPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/family/invite`}>{ar ? "دعوة" : "Invite"}</Link>
      <h1>{ar ? "مسح دعوة العائلة" : "Scan family invite"}</h1>
      <FamilyScanClient locale={locale} />
    </main>
  );
}
