import { z } from "zod";

/**
 * What providers offer for one catalogue service (backend/src/common/service-offers.ts, #2067). The lists carry the summary
 * (`providers_count`, `from_price`, `premises_available`, `home_available`, `insurance_accepted`) and the detail adds `offers`
 * (one per provider: the public provider card, price, where, insurance). Nothing here is invented: a field the payload does not
 * hold stays undefined and the page draws nothing for it.
 */
export type OfferSummary = {
  /** Providers (centres, labs, nurses) that offer the service now; 0 = the service is listed but nobody offers it yet. */
  providersCount: number;
  /** The lowest price any provider set; undefined when none priced it. */
  fromPrice?: number;
  premisesAvailable: boolean;
  homeAvailable: boolean;
  insuranceAccepted: boolean;
};

/** True when the catalogue lists the service but no provider offers it yet (the summary says 0; no summary = unknown, not unoffered). */
export const isUnoffered = (offer?: OfferSummary): boolean => offer?.providersCount === 0;

export type ServiceOffer = {
  providerId: string;
  names: { ar?: string; en?: string };
  logo?: string;
  rating?: number;
  ratingCount: number;
  /** undefined when the provider offers it without a price. */
  price?: number;
  currency: string;
  premises: boolean;
  home: boolean;
  insurance: boolean;
};

const num = z.number().finite().nonnegative();
const offerSchema = z.object({
  provider: z.object({
    id: z.string().min(1).max(128),
    name_ar: z.string().max(240).nullish(), name_en: z.string().max(240).nullish(),
    logo: z.string().max(2048).nullish(),
    rating: z.number().min(0).max(5).nullish(), rating_count: z.number().int().nonnegative().nullish(),
  }),
  price: num.nullish(), currency: z.string().max(8).nullish(),
  premises: z.boolean().optional(), home: z.boolean().optional(), insurance: z.boolean().optional(),
}).strip();

const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** The summary of a list row or detail; undefined when the payload has no `providers_count` (an older answer): the page then draws no offer line. */
export function parseOfferSummary(value: unknown): OfferSummary | undefined {
  const row = record(value);
  if (!row || typeof row.providers_count !== "number" || !Number.isFinite(row.providers_count) || row.providers_count < 0) return undefined;
  const from = typeof row.from_price === "number" && Number.isFinite(row.from_price) && row.from_price > 0 ? row.from_price : undefined;
  return {
    providersCount: Math.floor(row.providers_count),
    fromPrice: from,
    premisesAvailable: row.premises_available === true,
    homeAvailable: row.home_available === true,
    insuranceAccepted: row.insurance_accepted === true,
  };
}

/** The offers of a detail (cheapest first, as the server sends them); [] when the payload has none. */
export function parseOffers(value: unknown): ServiceOffer[] {
  const row = record(value);
  if (!row || !Array.isArray(row.offers)) return [];
  return row.offers.flatMap((raw): ServiceOffer[] => {
    const parsed = offerSchema.safeParse(raw);
    if (!parsed.success) return [];
    const o = parsed.data;
    return [{
      providerId: o.provider.id,
      names: { ar: o.provider.name_ar ?? undefined, en: o.provider.name_en ?? undefined },
      logo: o.provider.logo ?? undefined,
      rating: o.provider.rating ?? undefined,
      ratingCount: o.provider.rating_count ?? 0,
      price: o.price != null && o.price > 0 ? o.price : undefined,
      currency: o.currency ?? "SAR",
      premises: o.premises === true, home: o.home === true, insurance: o.insurance === true,
    }];
  });
}

/** The offer fields a service row carries. */
export type WithOffers = { offer?: OfferSummary; offers?: ServiceOffer[] };
export const offersOf = (value: unknown): WithOffers => ({ offer: parseOfferSummary(value), offers: record(value) && Array.isArray(record(value)!.offers) ? parseOffers(value) : undefined });
