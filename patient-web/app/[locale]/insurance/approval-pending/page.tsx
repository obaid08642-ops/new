import { VectorInsurance } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { InsuranceApprovalPendingClient } from "@/components-next/insurance-approval-pending-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ requestId?: string; bookingId?: string; amount?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app approval-pending: 6s polling until terminal approved/rejected states. */
export default async function InsuranceApprovalPendingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  const sp = await searchParams;
  const requestId = (sp.requestId || "").trim();
  const bookingId = (sp.bookingId || "").trim();
  if (requestId && !idPattern.test(requestId)) notFound();
  if (bookingId && !idPattern.test(bookingId)) notFound();
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/insurance/claims`}>{ar ? "المطالبات" : "Claims"}</Link>
      <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "موافقة التأمين" : "Insurance approval"}</h1>
      <InsuranceApprovalPendingClient
        requestId={requestId || undefined}
        bookingId={bookingId || undefined}
        totalAmount={Number(sp.amount) || 0}
        locale={locale}
      />
    <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", display: "none" } as React.CSSProperties} aria-hidden="true" />
    </main>
  );
}
