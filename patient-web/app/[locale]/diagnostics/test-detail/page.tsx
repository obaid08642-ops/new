import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ testId?: string; id?: string; type?: string }> };

/**
 * Parity with the app's test-detail: the test (or scan, type=radiology) opens the order item page, which is public and reads the single service
 * (about, fasting and preparation, result time, price, add to the basket or book now). It used to download the whole list and need a sign-in.
 */
export default async function DiagnosticsTestDetailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const testId = (sp.testId || sp.id || "").trim();
  if (!isLocale(locale) || !testId) notFound();
  redirect(`/${locale}/labs/${encodeURIComponent(testId)}?kind=${sp.type === "radiology" ? "radiology" : "lab"}`);
}
