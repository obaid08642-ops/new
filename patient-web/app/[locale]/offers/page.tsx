import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

type Offer = { id: string; title: string; description?: string; price?: string; originalPrice?: string; provider?: string };

function extractOffers(payload: unknown, locale: string): Offer[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.offers, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r) return [];
    const id = String(r.id ?? r._id ?? "");
    if (!id) return [];
    const title = String((isAr ? r.title_ar : r.title_en) ?? r.title_ar ?? r.title_en ?? r.title ?? "");
    if (!title) return [];
    const price = r.discounted_price ?? r.price;
    const original = r.original_price;
    return [{
      id, title,
      description: typeof r.description_ar === "string" && isAr ? r.description_ar : typeof r.description_en === "string" && !isAr ? r.description_en : typeof r.description === "string" ? r.description : undefined,
      price: price !== undefined && price !== null ? String(price) : undefined,
      originalPrice: original !== undefined && original !== null ? String(original) : undefined,
      provider: typeof r.provider_name === "string" ? r.provider_name : undefined,
    }];
  });
}

export default async function OffersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Offers");
  const response = await callPatientApi("/home/offers", {}, token);
  const offers = response.ok ? extractOffers(await response.json().catch(() => null), locale) : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : offers.length === 0 ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {offers.map((offer) => (
          <li key={offer.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "14px 16px" }}>
            <strong>{offer.title}</strong>
            {offer.description ? <p style={{ margin: "6px 0 0", opacity: 0.8, fontSize: 14 }}>{offer.description}</p> : null}
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
              {[
                offer.price !== undefined ? `${offer.price} ${t("sar")}` : null,
                offer.originalPrice && offer.originalPrice !== offer.price ? offer.originalPrice : null,
                offer.provider ?? null,
              ].filter(Boolean).join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
