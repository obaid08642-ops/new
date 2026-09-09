import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientInsuranceRequest } from "@/lib/api/insurance-server";
import { InsurancePaymentSplitClient, type SplitAction } from "@/components-next/insurance-payment-split-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ request_id?: string; requestId?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function decide(rec: Record<string, unknown>): SplitAction {
  const review = String(rec.insurance_review_state ?? rec.review_state ?? "");
  const state = String(rec.state ?? "");
  const copay = Number(rec.copay_amount ?? 0) || 0;
  const selfPay = Number(rec.self_pay_amount ?? 0) || 0;
  const paid = rec.copay_paid === true || rec.self_pay_accepted === true;
  if (["PENDING", "UNDER_REVIEW"].includes(review) || ["PENDING", "UNDER_REVIEW"].includes(state)) return "provider_review";
  if (paid) return "paid";
  if (state === "APPROVED" && copay === 0 && selfPay === 0) return "covered";
  if (copay > 0) return "checkout_copay";
  if (selfPay > 0) return "checkout_self_pay";
  if (state === "REJECTED" || state === "DECLINED") return "accept_self_pay";
  return "unavailable";
}

/** Parity with app payment-split: governed amounts + self-pay accept + HTTPS-only checkout. */
export default async function InsurancePaymentSplitPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const requestId = (sp.request_id || sp.requestId || "").trim();
  if (!isLocale(locale) || !idPattern.test(requestId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientInsuranceRequest(token, requestId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const rec = asRecord(payload?.data) ?? payload;
  if (!rec) notFound();

  const action = decide(rec);
  const price = Number(rec.price ?? rec.total_amount ?? 0) || 0;
  const copay = Number(rec.copay_amount ?? 0) || 0;
  const selfPay = Number(rec.self_pay_amount ?? 0) || 0;
  const payable = action === "checkout_self_pay" ? selfPay : copay;
  const bookingId = typeof rec.booking_id === "string" ? rec.booking_id : null;
  const actionLabel: Record<SplitAction, string> = {
    provider_review: ar ? "بانتظار مراجعة المزود" : "Awaiting provider review",
    covered: ar ? "موافقة كاملة — مغطى" : "Fully approved — covered",
    checkout_copay: ar ? "دفع التحمل المعتمد" : "Pay approved co-pay",
    accept_self_pay: ar ? "تم رفض التغطية — يمكنك قبول الدفع الذاتي" : "Coverage declined — you may accept self-pay",
    checkout_self_pay: ar ? "الدفع الذاتي المقبول" : "Accepted self-pay",
    paid: ar ? "بانتظار اكتمال التحقق من الدفع" : "Awaiting payment verification",
    unavailable: ar ? "حالة التأمين غير متاحة" : "Insurance status unavailable",
  };

  return (
    <main className="main">
      <Link href={`/${locale}/insurance/claims`}>{ar ? "المطالبات" : "Claims"}</Link>
      <h1>{ar ? "قرار التأمين" : "Insurance decision"}</h1>
      <section aria-label={ar ? "الحالة" : "Status"}>
        <p role="status">{actionLabel[action]}</p>
      </section>
      <section aria-label={ar ? "المبالغ المعتمدة" : "Approved amounts"}>
        <p>{ar ? "إجمالي الخدمة" : "Service total"}: {price} {ar ? "ر.س" : "SAR"}</p>
        <p>{ar ? "التحمل المعتمد" : "Approved co-pay"}: {copay} {ar ? "ر.س" : "SAR"}</p>
        {selfPay > 0 ? <p>{ar ? "الدفع الذاتي المقبول" : "Accepted self-pay"}: {selfPay} {ar ? "ر.س" : "SAR"}</p> : null}
      </section>
      <InsurancePaymentSplitClient
        requestId={requestId}
        action={action}
        payable={payable}
        bookingStatusHref={bookingId && idPattern.test(bookingId) ? `/${locale}/consultations/booking-status?appointmentId=${encodeURIComponent(bookingId)}` : null}
        locale={locale}
      />
    </main>
  );
}
