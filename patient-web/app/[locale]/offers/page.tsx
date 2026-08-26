import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Tag } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Offers index (parity #23): approved, running campaigns — server-fetched. */
export default async function OffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/offers", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const offers: any = res.ok ? await res.json().catch(() => []) : [];
  const list = Array.isArray(offers) ? offers : Array.isArray(offers?.items) ? offers.items : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Tag size={18} aria-hidden="true" /> العروض الحالية</h1>
      {list.length === 0 ? (
        <Card><p className="text-sm">لا توجد عروض نشطة حاليًا.</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((offer: any) => (
            <Link key={String(offer.id)} className={cardClass} href={`/${locale}/offers/${encodeURIComponent(String(offer.id))}`}>
              <strong>{String(offer.title_ar || offer.title_en || offer.id).slice(0, 120)}</strong>
              <span className="block text-sm mt-1">
                {Number(offer.discounted_price ?? 0)} ر.س
                {Number(offer.original_price ?? 0) > Number(offer.discounted_price ?? 0) ? (
                  <span className="line-through text-black/40 mr-2">{offer.original_price} ر.س</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

const cardClass = "rounded-xl border border-black/10 bg-white p-4 shadow-sm block no-underline";
