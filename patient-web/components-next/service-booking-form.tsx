import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

export type ServiceBookingProps = {
  kind: string;
  serviceId?: string;
  serviceName?: string;
  price?: string;
};

/**
 * PH-SERVICE web booking (labs | radiology | nursing): server-rendered form.
 * Cash → POST creates booking then redirects to payment intent.
 * Insurance → POST creates the request only (no payment) — decision + co-pay
 * arrive later and settlement confirms, exactly like mobile.
 */
export default async function ServiceBookingForm({
  locale,
  kind,
  serviceId,
  serviceName,
  price,
}: ServiceBookingProps & { locale: string }) {
  const base = kind === "radiology" ? "/radiology" : kind === "nursing" ? "/home-care" : "/labs";
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const svcRes = await callPatientApi(`${base}/services/${encodeURIComponent(serviceId || "")}`, {}, token);
  const svc: any = svcRes.ok ? await svcRes.json().catch(() => null) : null;
  const priceNum = Number(price ?? svc?.price ?? 0);
  // Family on-behalf booking (parity #15): real member list from /family/members.
  const membersRes = await callPatientApi("/family/members", {}, token);
  const membersJson: any = membersRes.ok ? await membersRes.json().catch(() => null) : null;
  const members: { id: string; label: string }[] = Array.isArray(membersJson)
    ? membersJson.flatMap((m: any) => typeof m?.id === "string" ? [{ id: m.id, label: String(m.display_name || m.relation || m.id).slice(0, 80) }] : [])
    : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">
        حجز {kind === "radiology" ? "أشعة" : kind === "nursing" ? "تمريض منزلي" : "تحاليل"} — {serviceName || svc?.name_ar || ""}
      </h1>

      <Card>
        <form action={`/api/bookings/${kind}`} method="post">
          <input type="hidden" name="idempotency-key" value={`web-book-${kind}-${serviceId || "x"}-${Date.now()}`} />
          <label className="block text-sm mt-2">التاريخ
            <input name="date" type="date" required min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)}
              className="w-full mt-1 rounded-lg border border-black/15 p-2" />
          </label>
          <label className="block text-sm mt-3">الوقت
            <select name="time" required className="w-full mt-1 rounded-lg border border-black/15 p-2">
              {["08:00", "09:00", "10:00", "11:00", "12:00", "16:00", "17:00"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {members.length > 0 && (
            <label className="block text-sm mt-3">الحجز لفرد من العائلة (اختياري)
              <select name="member_id" className="w-full mt-1 rounded-lg border border-black/15 p-2">
                <option value="">لي — نفس الحساب</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" name="home_collection" value="true" disabled={kind === "nursing"} defaultChecked={kind === "nursing"} />
            سحب منزلي / زيارة منزلية
          </label>
          <fieldset className="mt-4 text-sm">
            <legend className="font-semibold mb-1">طريقة التغطية</legend>
            <label className="mr-4"><input type="radio" name="coverage" value="CASH" defaultChecked /> نقدي — أدفع الآن ({priceNum} ر.س)</label>
            {/* Insurance requests require an assigned provider; the web funnel
                doesn't pick a nurse, so only mobile offers that branch today. */}
            {kind === "nursing" ? (
              <label className="block opacity-50">
                <input type="radio" disabled /> تأمين — متاح عبر التطبيق بعد اختيار الممرض
              </label>
            ) : (
              <label className="block"><input type="radio" name="coverage" value="INSURANCE" /> تأمين — إرسال الطلب بدون دفع، وأدفع تحمّلي بعد الموافقة</label>
            )}
          </fieldset>
          <input type="hidden" name="service_id" value={serviceId || ""} />
          <button type="submit" className="mt-5 w-full rounded-lg bg-[#087f8c] py-3 font-bold" style={{ color: "#fff" }}>
            {priceNum > 0 && "تأكيد الحجز"}
          </button>
        </form>
      </Card>
    </main>
  );
}
