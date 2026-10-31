import type { OfferSummary } from "@/lib/api/offers";
import { money } from "@/lib/diagnostics-format";

type Tr = (key: "offerCountNursing" | "offerNone" | "fromPrice" | "offerAtHome" | "offerAtCentre" | "offerInsurance", values?: Record<string, string | number>) => string;

/**
 * What nurses offer for one nursing service, as the three nursing lists draw it (the home care hub, the guest page and /nursing/catalog, all from
 * GET /home-care/services): "3 providers · From 120 SAR", and where / insurance as chips. A service nobody offers yet says so (and is still listed).
 * The price is the providers' own "from" price; when there is none, or no summary (an older answer), the catalogue price stays.
 */
export function nursingOfferLine({ locale, tr, offer, price }: { locale: string; tr: Tr; offer?: OfferSummary; price?: number }): { line?: string; chips: string[]; none: boolean } {
  if (!offer) return { line: price !== undefined ? money(locale, price) : undefined, chips: [], none: false };
  // the providers' own "from" price when there is one, else the catalogue's price (a service nobody offers yet, or offered without a price, keeps its price)
  const priceText = offer.fromPrice !== undefined ? tr("fromPrice", { price: money(locale, offer.fromPrice) }) : price !== undefined ? money(locale, price) : undefined;
  if (offer.providersCount === 0) return { line: [tr("offerNone"), price !== undefined ? tr("fromPrice", { price: money(locale, price) }) : undefined].filter(Boolean).join(" · "), chips: [], none: true };
  const parts = [tr("offerCountNursing", { count: offer.providersCount }), ...(priceText ? [priceText] : [])];
  return {
    line: parts.join(" · "),
    chips: [...(offer.homeAvailable ? [tr("offerAtHome")] : []), ...(offer.premisesAvailable ? [tr("offerAtCentre")] : []), ...(offer.insuranceAccepted ? [tr("offerInsurance")] : [])],
    none: false,
  };
}
