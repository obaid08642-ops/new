import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsInsuranceApprovalClient } from "@/components-next/diagnostics-insurance-approval-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; id?: string; labName?: string; visitType?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app diagnostics/insurance-approval: live polling + hybrid cash opt-in + totals. */
export default async function DiagnosticsInsuranceApprovalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics/bookings`}>{ar ? "حجوزاتي" : "My bookings"}</Link>
      <h1>{ar ? "حالة الموافقة" : "Approval status"}</h1>
      <DiagnosticsInsuranceApprovalClient
        orderId={orderId}
        labName={(sp.labName || "").trim() || (ar ? "المختبر المختار" : "Selected lab")}
        visitType={(sp.visitType || "clinic").trim()}
        locale={locale}
      />
    </main>
  );
}
