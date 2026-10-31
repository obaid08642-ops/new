/**
 * What providers offer for one catalogue service (backend/src/common/service-offers.ts, #2067). The lists carry the summary
 * (`providers_count`, `from_price`, `premises_available`, `home_available`, `insurance_accepted`) and the detail adds `offers`
 * (one per provider: the public provider card, price, where, insurance). A field the payload does not hold stays empty and the
 * screen draws nothing for it; an older answer with no `providers_count` has no summary at all.
 */
import { pickDbField } from './localize';

type Raw = Record<string, unknown>;

export interface OfferSummary {
  /** Providers (centres, labs, nurses) that offer the service now; 0 = listed, but nobody offers it yet. */
  providersCount: number;
  /** The lowest price any provider set; null when none priced it. */
  fromPrice: number | null;
  premises: boolean;
  home: boolean;
  insurance: boolean;
}

export interface ServiceOffer {
  providerId: string;
  name: string;
  rating: number | null;
  ratingCount: number;
  /** null when the provider offers it without a price. */
  price: number | null;
  premises: boolean;
  home: boolean;
  insurance: boolean;
}

const isRaw = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/** The summary of a list row or a detail; null when the payload has no `providers_count`. */
export function offerSummaryOf(raw: unknown): OfferSummary | null {
  if (!isRaw(raw)) return null;
  const n = raw.providers_count;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return { providersCount: Math.floor(n), fromPrice: positive(raw.from_price), premises: raw.premises_available === true, home: raw.home_available === true, insurance: raw.insurance_accepted === true };
}

/** The offers of a detail, in the order the server sent (cheapest first, unpriced last). */
export function offersOf(raw: unknown): ServiceOffer[] {
  if (!isRaw(raw) || !Array.isArray(raw.offers)) return [];
  const out: ServiceOffer[] = [];
  for (const entry of raw.offers) {
    if (!isRaw(entry) || !isRaw(entry.provider) || typeof entry.provider.id !== 'string' || !entry.provider.id) continue;
    const p = entry.provider;
    const name = pickDbField<string>({ name_ar: typeof p.name_ar === 'string' ? p.name_ar : undefined, name_en: typeof p.name_en === 'string' ? p.name_en : undefined }, 'name');
    out.push({
      providerId: p.id as string,
      name: typeof name === 'string' ? name : '',
      rating: positive(p.rating),
      ratingCount: typeof p.rating_count === 'number' && p.rating_count > 0 ? p.rating_count : 0,
      price: positive(entry.price),
      premises: entry.premises === true,
      home: entry.home === true,
      insurance: entry.insurance === true,
    });
  }
  return out;
}

type K = (key: string, vars?: Record<string, string | number>) => string;

/** "3 centres" (or "3 providers" for nursing): the one, two (Arabic) and many forms are three keys of the translation files. */
export function providersText(k: K, num: (n: number) => string, lang: string, count: number, nursing: boolean): string {
  const base = nursing ? 'diag.offer.countNursing' : 'diag.offer.count';
  const key = count === 1 ? `${base}One` : count === 2 && lang === 'ar' ? `${base}Two` : base;
  return k(key, { n: num(count) });
}

export interface OfferLines {
  /** "3 centres", or "No centre offers this yet". */
  providers: string;
  none: boolean;
  /** "From 120.00": only when a provider priced it. */
  from?: string;
  /** Where it is done and whether insurance is accepted. */
  where: string[];
}

/** The words of a summary, ready to draw (every word from the translation files, every number in the language's format). */
export function offerLines(summary: OfferSummary | null, ui: { k: K; num: (n: number) => string; money: (n: number) => string; lang: string }, nursing = false, cataloguePrice: number | null = null): OfferLines | null {
  if (!summary) return null;
  // nobody offers it: the catalogue price is an indicative "From" (never a provider's confirmed price)
  if (summary.providersCount === 0) return { providers: ui.k('diag.offer.none'), none: true, from: cataloguePrice !== null ? ui.k('diag.offer.from', { price: `${ui.money(cataloguePrice)} ${ui.k('pharmacy.currency')}` }) : undefined, where: [] };
  return {
    providers: providersText(ui.k, ui.num, ui.lang, summary.providersCount, nursing),
    none: false,
    from: summary.fromPrice !== null ? ui.k('diag.offer.from', { price: `${ui.money(summary.fromPrice)} ${ui.k('pharmacy.currency')}` }) : undefined,
    where: [...(summary.premises ? [ui.k('diag.offer.atCentre')] : []), ...(summary.home ? [ui.k('diag.offer.atHome')] : []), ...(summary.insurance ? [ui.k('diag.offer.insurance')] : [])],
  };
}
