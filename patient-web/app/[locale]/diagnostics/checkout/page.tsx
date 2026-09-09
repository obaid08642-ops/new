import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsCheckoutForm } from "@/components-next/diagnostics-checkout-form";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ items?: string; labId?: string; location?: string }> };

export default async function DiagnosticsCheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";
  const items = (sp.items || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const labId = (sp.labId || "").trim();
  const location = sp.location === "facility" ? "facility" : "home";
  if (!items.length || !labId) {
    return (
      <main className="main">
        <Link href={`/${locale}/diagnostics/cart`}>{ar ? "السلة" : "Cart"}</Link>
        <h1>{ar ? "إتمام الحجز" : "Checkout"}</h1>
        <p role="alert">{ar ? "السلة فارغة أو المختبر غير محدد — ابدأ من السلة." : "Cart is empty or no lab selected — start from the cart."}</p>
        <Link href={`/${locale}/diagnostics/labs`}>{ar ? "تصفح التحاليل" : "Browse tests"}</Link>
      </main>
    );
  }

  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics/cart`}>{ar ? "السلة" : "Cart"}</Link>
      <h1>{ar ? "إتمام حجز التحاليل" : "Complete test booking"}</h1>
      <p>{ar ? `${items.length} تحاليل — ${location === "home" ? "سحب منزلي" : "في المختبر"}` : `${items.length} tests — ${location}`}</p>
      <DiagnosticsCheckoutForm locale={locale} items={items} labId={labId} initialLocation={location} />
    </main>
  );
}
