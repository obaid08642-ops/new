import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Offer detail (parity #23): server-fetched campaign + its participating
 * providers. Redemption rides on loyalty-points at checkout (D-021 pending
 * owner decision for a dedicated redeem flow — see HANDOFF).
 */
export default async function OfferDetailPage({ params }: { params: Promise<{ locale: string; offerId: string }> }) {
  const { locale, offerId } = await params;
  if (!isLocale(locale)) notFound();
  if (!/^[0-9a-zA-Z_-]{6,80}$/.test(offerId)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const [offerRes, providersRes] = await Promise.all([
    callPatientApi(`/offers/${encodeURIComponent(offerId)}`, {}, token),
    callPatientApi(`/promotions/offers/${encodeURIComponent(offerId)}/providers`, {}, token),
  ]);
  if (offerRes.status === 401) redirect(`/${locale}/login`);
  if (!offerRes.ok || offerRes.status === 404) notFound();
  const offer: any = await offerRes.json().catch(() => null);
  const providers: any = providersRes.ok ? await providersRes.json().catch(() => []) : [];
  const providerList = Array.isArray(providers) ? providers : [];

  return (
    <main className="page" dir="rtl">
      <Link href={`/${locale}/offers`} className="text-sm underline">رجوع للعروض</Link>
      <h1 className="text-xl font-bold mt-2 mb-2">{String(offer?.title_ar || offer?.title_en || "").slice(0, 160)}</h1>
      <Card>
        <dl className="text-sm">
          <div className="flex justify-between py-1"><dt>السعر قبل</dt><dd>{offer?.original_price != null ? `${offer.original_price} ر.س` : "—"}</dd></div>
          <div className="flex justify-between py-1 font-bold"><dt>سعر العرض</dt><dd>{offer?.discounted_price != null ? `${offer.discounted_price} ر.س` : "—"}</dd></div>
          {offer?.end_date ? <div className="flex justify-between py-1"><dt>ينتهي</dt><dd>{String(offer.end_date).slice(0, 10)}</dd></div> : null}
        </dl>
      </Card>

      <h2 className="mt-4 text-lg font-bold">المزودون المشاركون</h2>
      {providerList.length === 0 ? (
        <Card><p className="text-sm">لم يُرفق مزودون بهذا العرض بعد.</p></Card>
      ) : (
        <div className="mt-2 grid gap-2">
          {providerList.slice(0, 20).map((p: any) => (
            <div key={String(p.id)} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm text-sm flex justify-between">
              <span>{String(p.name || p.id).slice(0, 80)}</span>
              <span className="text-black/60">{p.specialty || ""}{p.city ? ` · ${p.city}` : ""}{p.rating_avg ? ` · ★ ${p.rating_avg}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
