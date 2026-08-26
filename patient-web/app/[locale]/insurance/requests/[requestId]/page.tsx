import { cookies } from "next/headers";
import Link from "next/link";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { InsuranceCopayActions } from "@/components-next/insurance-copay-actions";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

type Props = { requestId?: string };

/**
 * D-web parity: coverage-request status + co-pay settlement, server-owned
 * numbers only (GET /insurance/requests/:id). Mirrors the mobile
 * payment-split contract: provider_review → refresh, APPROVED_FULL(copay=0)
 * → settle, COPAY_PENDING → hosted checkout for the approved share.
 */
export default async function InsuranceRequestStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; requestId: string }>;
  searchParams: Promise<Props>;
}) {
  const { locale, requestId } = await params;
  const token = (await cookies()).get(authCookieNames.access)?.value;

  let request: any = null;
  let loadError: string | null = null;
  if (!token) loadError = "authentication_required";
  else {
    const res = await callPatientApi(`/insurance/requests/${encodeURIComponent(requestId || (await searchParams).requestId || "")}`, {}, token);
    request = res.ok ? await res.json().catch(() => null) : null;
    if (!res.ok || !request?.id || !request?.booking_id || typeof request?.price !== "number") {
      loadError = "not_found";
    }
  }

  if (loadError) {
    return (
      <main className="page" dir="rtl">
        <h1 className="text-xl font-bold mb-2">طلب التأمين</h1>
        <Card>
          <p className="text-sm">{loadError === "authentication_required" ? "سجّل الدخول لعرض طلبات التأمين." : "تعذّر تحميل طلب التأمين — تحقق من الرابط أو من ملكيتك للطلب."}</p>
          <p className="mt-3"><Link className="underline" href={`/${locale}/insurance`}>رجوع إلى التأمين</Link></p>
        </Card>
      </main>
    );
  }

  const state = String(request.state);
  const price = Number(request.price);
  const copay = Number(request.copay_amount ?? 0);
  const covered = Math.max(0, price - copay);

  const headline: Record<string, string> = {
    PENDING_PROVIDER_REVIEW: "بانتظار مراجعة مزود الخدمة",
    APPROVED_FULL: "موافقة كاملة من التأمين",
    COPAY_PENDING: "دفع التحمل المعتمد",
    COPAY_PAID: "تم تسجيل دفع التحمل — الموعد مؤكد",
    REJECTED: "تم رفض الطلب",
    EXPIRED: "انتهت صلاحية الطلب",
    CANCELLED: "الطلب ملغى",
  };
  const detail: Record<string, string> = {
    PENDING_PROVIDER_REVIEW: "لم يُحدد مزود الخدمة التغطية بعد، لا يمكن تأكيد الحجز أو الدفع الآن. حدِّث الحالة لاحقًا.",
    APPROVED_FULL: "لا يوجد مبلغ مستحق عليك. أكّد لتسجيل الموافقة الكاملة وتأكيد الموعد.",
    COPAY_PENDING: "سيُفتح بوابة دفع آمنة للمبلغ الذي اعتمده مزود الخدمة فقط.",
    COPAY_PAID: "تمت تسوية التحمل عبر سجل دفع موثق، والموعد أصبح مؤكدًا.",
    REJECTED: "يمكنك تعديل المستندات وإعادة الإرسال من تطبيق الجوال أو الدفع نقديًا.",
    EXPIRED: "أنشئ طلب تغطية جديدًا للحجز.",
    CANCELLED: "أُلغي هذا الطلب.",
  };

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">حالة طلب التأمين</h1>
      <Card>
        <p className="text-base font-semibold">{headline[state] || "حالة غير معروفة"}</p>
        <p className="text-sm mt-1 text-black/70">{detail[state] || ""}</p>
      </Card>

      <div className="mt-3">
        <Card>
          <p className="text-sm font-semibold mb-2">الأرقام المعتمدة من الخادم</p>
          <dl className="text-sm">
            <div className="flex justify-between py-1"><dt>إجمالي الخدمة</dt><dd>{price} ر.س</dd></div>
            <div className="flex justify-between py-1"><dt>تغطية التأمين</dt><dd>{covered} ر.س</dd></div>
            <div className="flex justify-between py-1 font-bold"><dt>حصتك المعتمدة</dt><dd>{copay} ر.س</dd></div>
          </dl>
          {request.policy?.company_name ? <p className="text-xs mt-2 text-black/60">شركة التأمين: {request.policy.company_name}</p> : null}
        </Card>
      </div>

      <div className="mt-3">
        <InsuranceCopayActions locale={locale} requestId={String(request.id)} bookingId={String(request.booking_id)} state={state} copay={copay} />
      </div>
    </main>
  );
}
