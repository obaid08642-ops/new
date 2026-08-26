import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

function PayForm({ action, orderId, locale, label, tone }: { action: string; orderId: string; locale: string; label: string; tone?: string }) {
  return (
    <form method="post" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotency-key" value={`web-pay-${orderId}-${action.endsWith("pay-wallet") ? "w" : "c"}`} />
      <button type="submit" className="w-full rounded-lg py-3 font-bold text-white" style={{ backgroundColor: tone || "#087f8c" }}>
        {label}
      </button>
    </form>
  );
}

/**
 * PH-PHARMACY final step (parity #12): choose wallet or card. Amount shown is
 * the server-owned selected_offer snapshot from GET /patient/pharmacy/orders/:id
 * — never computed here. Both branches post to BFF routes that call real APIs.
 */
export default async function PharmacyPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { orderId, error } = await searchParams;
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);
  if (!orderId || !/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) {
    return <main className="page"><section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p>معرّف طلب غير صالح</p></section></main>;
  }

  const orderRes = await callPatientApi(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, {}, token);
  const order: any = orderRes.ok ? await orderRes.json().catch(() => null) : null;
  if (!orderRes.ok || !order?.id) {
    return <main className="page"><section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p>تعذر تحميل الطلب{order?.message ? `: ${order.message}` : "."}</p></section></main>;
  }

  // Same source payWithWallet charges: selected_offer snapshot + delivery fee.
  const amount = Math.round((Number(order.selected_offer?.subtotal_estimate || 0) + Number(order.selected_offer?.delivery_fee || 0)) * 100) / 100;
  const balanceRes = await callPatientApi(`/wallet/balance`, {}, token);
  const balanceData: any = await balanceRes.json().catch(() => null);
  const balance = Number(balanceData?.balance ?? NaN);

  // Server loyalty quote (EPIC S12): how many points this order may redeem —
  // informational; redemption itself settles upstream at checkout.
  let loyalty: any = null;
  const quoteRes = await callPatientApi("/finance-engine/loyalty/redeem-quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ order_total: amount }),
  }, token).catch(() => null);
  if (quoteRes?.ok) loyalty = await quoteRes.json().catch(() => null);

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">إتمام الدفع</h1>
      {error ? (
        <div className="mb-3">
          <Card><p className="text-sm text-red-600" role="alert">تعذر الدفع{error ? `: ${decodeURIComponent(error)}` : "."}</p></Card>
        </div>
      ) : null}
      <Card>
        <dl className="text-sm">
          <div className="flex justify-between py-1"><dt>رقم الطلب</dt><dd className="font-mono text-xs">{orderId}</dd></div>
          <div className="flex justify-between py-1 font-bold"><dt>المستحق (من عرض الصيدلية المختار)</dt><dd>{amount > 0 ? `${amount} ر.س` : "—"}</dd></div>
          <div className="flex justify-between py-1"><dt>رصيد المحفظة</dt><dd>{Number.isFinite(balance) ? `${balance} ر.س` : "غير متاح"}</dd></div>
        </dl>
        {loyalty?.enabled && Number(loyalty.max_points_for_order) > 0 ? (
          <p className="text-xs mt-2 text-black/60">
              نقاط ولاء قابلة للاستبدال على هذا الطلب: {loyalty.max_points_for_order} نقطة ≈ خصم حتى {loyalty.max_discount_sar} ر.س
              (يُسوّى على الخادم وفق حد {loyalty.max_redeem_percent}% من الإجمالي).
          </p>
        ) : null}
      </Card>
      <div className="mt-3 grid gap-3">
        <PayForm action={`/api/pharmacy/orders/${encodeURIComponent(orderId)}/pay-wallet`} orderId={orderId} locale={locale}
          label={Number.isFinite(balance) && balance >= amount ? `ادفع من المحفظة — ${amount} ر.س` : "ادفع من المحفظة"} />
        <PayForm action={`/api/pharmacy/orders/${encodeURIComponent(orderId)}/payment-intent`} orderId={orderId} locale={locale}
          label={`ادفع ببطاقة — بوابة آمنة`} tone="#334155" />
      </div>
    </main>
  );
}
