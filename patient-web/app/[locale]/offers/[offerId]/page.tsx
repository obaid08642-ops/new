import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; offerId: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function text(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/** Parity with app offers/[id]: real /offers/:id + providers, savings, validity, terms, share. */
export default async function OfferDetailPage({ params }: Props) {
  const { locale, offerId } = await params;
  if (!isLocale(locale) || !idPattern.test(offerId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const [offerRes, providersRes] = await Promise.all([
    callPatientApi(`/offers/${encodeURIComponent(offerId)}`, {}, token),
    callPatientApi(`/promotions/offers/${encodeURIComponent(offerId)}/providers`, {}, token),
  ]);
  if (offerRes.status === 401) redirect(`/${locale}/login`);
  if (!offerRes.ok) notFound();
  const oraw = asRecord(await offerRes.json().catch(() => null));
  const offer = asRecord(oraw?.data) ?? oraw;
  if (!offer) notFound();
  const rtl = locale === "ar" || locale === "ur";
  const title = rtl ? text(offer, ["title_ar", "title"]) ?? "" : text(offer, ["title", "title_ar"]) ?? "";
  const provider = asRecord(offer.provider);
  const providerName = provider ? text(provider, ["name", "name_ar"]) ?? "" : "";
  const target = asRecord(offer.target);
  const inclusions = (target && Array.isArray(target.inclusions) ? target.inclusions : []).filter((x): x is string => typeof x === "string");
  const terms = (target && Array.isArray(target.terms) ? target.terms : []).filter((x): x is string => typeof x === "string");
  const sponsored = target?.sponsored === true;
  const original = Number(offer.original_price ?? 0) || 0;
  const discounted = Number(offer.discounted_price ?? 0) || 0;
  const startDate = text(offer, ["start_date"]);
  const endDate = text(offer, ["end_date"]);
  const praw = providersRes.ok ? asRecord(await providersRes.json().catch(() => null)) : null;
  const plist = [praw?.data, praw?.providers, praw?.provider_profiles].find(Array.isArray);
  const providers = (Array.isArray(plist) ? plist : []).flatMap((p) => {
    const o = asRecord(p);
    if (!o || typeof o.id !== "string") return [];
    return [{
      id: o.id,
      name: text(o, ["name", "name_ar"]) ?? "",
      specialty: text(o, ["specialty", "specialty_ar"]),
      city: text(o, ["city", "city_ar"]),
      rating: typeof o.rating_avg === "number" ? o.rating_avg : null,
      ratingCount: typeof o.rating_count === "number" ? o.rating_count : null,
    }];
  });

  return (
    <main className="main">
      <Link href={`/${locale}/offers`}>{ar ? "العروض" : "Offers"}</Link>
      {sponsored ? <p>{ar ? "ممول" : "Sponsored"}</p> : null}
      <h1>{title}</h1>
      {providerName ? <p>{providerName}</p> : null}
      {original > discounted && discounted > 0 ? (
        <p>{ar ? `وفّر ${original - discounted} ر.س` : `Save ${original - discounted} SAR`} — <strong>{discounted} {ar ? "ر.س" : "SAR"}</strong> <s>{original}</s></p>
      ) : discounted > 0 ? (
        <p><strong>{discounted} {ar ? "ر.س" : "SAR"}</strong></p>
      ) : null}
      {startDate || endDate ? (
        <p>{endDate ? (ar ? `العرض ساري حتى ${endDate}` : `Valid until ${endDate}`) : (ar ? `يبدأ العرض في ${startDate}` : `Starts ${startDate}`)}</p>
      ) : null}
      {inclusions.length > 0 ? (
        <section aria-label={ar ? "مشتملات الباقة" : "Package inclusions"}>
          <h2>{ar ? "مشتملات الباقة" : "Package inclusions"}</h2>
          <ul>{inclusions.map((item, i) => <li key={i}>✓ {item}</li>)}</ul>
        </section>
      ) : null}
      {terms.length > 0 ? (
        <section aria-label={ar ? "الشروط والأحكام" : "Terms & conditions"}>
          <h2>{ar ? "الشروط والأحكام" : "Terms & conditions"}</h2>
          <ul>{terms.map((item, i) => <li key={i}>• {item}</li>)}</ul>
        </section>
      ) : null}
      <section aria-label={ar ? "احجز العرض لدى" : "Book this offer with"}>
        <h2>{ar ? "احجز العرض لدى" : "Book this offer with"}</h2>
        {providers.length === 0 ? (
          <p>{providerName ? (ar ? `سيتم الحجز لدى ${providerName}` : `Booking will be with ${providerName}`) : (ar ? "لا يوجد مقدمو خدمة بعد" : "No providers yet")}</p>
        ) : (
          <ul>
            {providers.map((p) => (
              <li key={p.id}>
                <Link href={`/${locale}/consultations/book/${encodeURIComponent(p.id)}`}>
                  <strong>{p.name}</strong>
                  {[p.specialty, p.city].filter(Boolean).join(" — ")}
                  {p.rating !== null && p.rating > 0 ? ` ★ ${p.rating}${p.ratingCount !== null ? ` (${p.ratingCount})` : ""}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
