import Link from "next/link";
import { Gift } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import s from "./offers.module.css";

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
    return [{ id, title, description: typeof r.description_ar === "string" && isAr ? r.description_ar : typeof r.description_en === "string" && !isAr ? r.description_en : typeof r.description === "string" ? r.description : undefined, price: price != null ? String(price) : undefined, originalPrice: original != null ? String(original) : undefined, provider: typeof r.provider_name === "string" ? r.provider_name : undefined }];
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
  return <main className="main" style={{ background: "#FDFDFC", padding: "24px 16px", maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
    <div className={s.hero}><div><p className={s.eyebrow}>{t("title")}</p><h1>{t("title")}</h1><p>{t.has("subtitle") ? t("subtitle") : ""}</p></div><span className={s.heroIcon} aria-hidden="true"><Gift size={48} /></span></div>
    {!response.ok ? <p role="alert" className={s.meta}>{t("error")}</p> : offers.length === 0 ? <div className={s.state}><span className={s.heroIcon}><Gift size={48} /></span><p>{t("empty")}</p></div> : <ul className={s.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>{offers.map((o) => <li key={o.id} className={s.card}><Link href={`/${locale}/offers/${encodeURIComponent(o.id)}`} style={{ display: "grid", gap: 6 }}><strong>{o.title}</strong>{o.description ? <p>{o.description}</p> : null}<span className={s.meta}>{[o.price ? `${o.price} ${t("sar")}` : null, o.originalPrice && o.originalPrice !== o.price ? o.originalPrice : null, o.provider ?? null].filter(Boolean).join(" · ")}</span></Link></li>)}</ul>}
  </main>;
}
