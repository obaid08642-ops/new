import { cookies } from "next/headers";
// PH-PHARMACY web parity: server-rendered offers comparison (no client JS needed).
import { redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { OfferSelectButton } from "@/components-next/offer-select-button";

type Offer = {
  pharmacy_account_id: string; pharmacy_name: string; response_type: string;
  available_items: number; total_items: number; eta_minutes?: number;
  delivery_fee: number; subtotal_estimate?: number;
  items?: Array<{ have: string; alternative?: { name?: string } | null }>;
};

async function loadOffers(orderId: string, token: string) {
  const res = await callPatientApi(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/offers`, {}, token);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export default async function PharmacyOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect("/ar/login");
  if (!orderId || !/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) {
    return <main className="page"><section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p>معرّف طلب غير صالح</p></section></main>;
  }

  const data = await loadOffers(orderId, token);
  const offers: Offer[] = Array.isArray(data?.offers) ? data.offers : [];
  const state = String(data?.state ?? "");

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">عروض الصيدليات</h1>
      <p className="text-sm opacity-70 mb-4">قارن السعر والتوفر وسرعة التجهيز ثم اختر عرضًا واحدًا. لا يتم أي دفع قبل الاختيار.</p>

      {offers.length === 0 && (
        <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <p>{["broadcasting", "awaiting_full_acceptance", "awaiting_offer_selection"].includes(state)
            ? "جارٍ إرسال طلبك للصيدليات القريبة… حدّث الصفحة بعد قليل."
            : "لا توجد عروض لهذا الطلب."}</p>
        </section>
      )}

      <div className="grid gap-3">
        {offers.map((o) => (
          <section key={o.pharmacy_account_id}>
            <div className="flex items-center justify-between gap-2">
              <strong>{o.pharmacy_name}</strong>
              <span className="text-sm">{o.response_type === "have_all"
                ? `متوفر كامل (${o.total_items}/${o.total_items})`
                : `متوفر ${o.available_items}/${o.total_items}`}</span>
            </div>
            <p className="text-sm mt-1">
              السعر التقديري: <b>{o.subtotal_estimate ?? "—"}</b> ر.س
              {Number(o.delivery_fee) > 0 ? ` + توصيل ${o.delivery_fee} ر.س` : " — توصيل مجاني"}
              {o.eta_minutes ? ` • تجهيز ~${o.eta_minutes} د` : ""}
            </p>
            {o.items?.some((i) => i.have === "alternative") && <p className="text-xs text-cyan-700">يتضمن بدائل مقترحة</p>}
            {o.items?.some((i) => i.have === "no") && <p className="text-xs text-red-700">أصناف ناقصة في هذا العرض</p>}
            <OfferSelectButton orderId={orderId} pharmacyAccountId={o.pharmacy_account_id} />
          </section>
        ))}
      </div>

      <p className="mt-6 text-xs opacity-60">للإلغاء استخدم التطبيق أو صفحة الطلب بعد إصداره.</p>
    </main>
  );
}
