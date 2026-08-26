import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ScanBarcode } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { isLocale } from "@/lib/i18n";
import { DrugScannerTools } from "@/components-next/drug-scanner-tools";

/** Drug scanner (parity #21): barcode lookup + interactions vs current meds. */
export default async function DrugScannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><ScanBarcode size={18} aria-hidden="true" /> فحص الأدوية</h1>
      <DrugScannerTools />
      <p className="mt-3 text-xs text-black/50">مسح الكاميرا متاح في تطبيق الجوال؛ هنا الإدخال اليدوي للباركود واسم الدواء.</p>
    </main>
  );
}
