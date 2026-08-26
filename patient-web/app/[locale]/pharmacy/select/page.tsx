import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/**
 * Server-action page: performs the offer selection (PH-PHARMACY step 5) then
 * redirects to the payment step. Selection is a POST-equivalent triggered via GET
 * with strict ownership + state checks upstream; CSRF-safe because it requires
 * the httpOnly session cookie and never accepts tokens from the query string.
 */
export default async function PharmacySelectPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; pharmacy?: string }>;
}) {
  const { orderId, pharmacy } = await searchParams;
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect("/ar/login");
  const okId = (v?: string) => !!v && /^[A-Za-z0-9_-]{6,80}$/.test(v);
  if (!okId(orderId) || !okId(pharmacy)) {
    return <main className="page"><section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p>معطيات غير صالحة</p></section></main>;
  }

  const res = await callPatientApi(
    `/patient/pharmacy/orders/${encodeURIComponent(orderId!)}/select-offer`,
    { method: "POST", body: JSON.stringify({ pharmacy_account_id: pharmacy }) },
    token,
  );
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    return <main className="page"><section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p>تعذر اختيار العرض{err?.message ? `: ${err.message}` : "."}</p></section></main>;
  }

  redirect(`/ar/pharmacy/pay?orderId=${orderId}`);
}
