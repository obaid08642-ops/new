import { diagArtKey, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import type { LabService } from "@/lib/api/labs";
import type { RadiologyService } from "@/lib/api/radiology";
import type { LineNames } from "@/lib/ordering/basket";
import { hoursText, money } from "@/lib/diagnostics-format";
import type { OfferSummary } from "@/lib/api/offers";
import { pickName } from "@/lib/i18n/localized";
import { DIAG_TONES } from "./tones";

/** One test or scan of the hub's full list, ready to draw (every word already in the page's language). */
export type CatalogRow = {
  id: string;
  art: DiagArtKey;
  href: string;
  title: string;
  tags?: { label: string; tone: (typeof DIAG_TONES)[keyof typeof DIAG_TONES] }[];
  note?: string;
  /** "No fasting · Result within 24 hours": only the parts the catalogue really sent (fasting_required, turnaround_hours). */
  meta?: string;
  price?: string;
  /** "Rating 4.5 (12)": only when the backend sent a rating above 0 and the number of ratings behind it. */
  rating?: string;
  imageUrl?: string;
  /** What providers offer for it (the catalogue's own summary), already in the page's language; absent when the payload carries none. */
  offer?: OfferLines;
  line: { id: string; nameAr?: string; nameEn?: string; names?: LineNames };
};

/** The offer summary of a catalogue row as words: "3 centres", "From 120 SAR", where it is done and whether insurance is accepted. */
export type OfferLines = {
  /** "3 centres", or "No centre offers this yet" when nobody does (the row is still listed). */
  providers: string;
  none: boolean;
  /** "From 120 SAR": only when a provider priced it. */
  from?: string;
  where: string[];
};

export type RowKey = "tagHome" | "tagFasting" | "noFasting" | "resultWithin" | "fromPrice" | "ratingLine" | "offerCount" | "offerNone" | "offerAtCentre" | "offerAtHome" | "offerInsurance";
export type RowContext = {
  locale: string;
  tr: (key: RowKey, values?: Record<string, string | number>) => string;
  /** The item page for the patient's order context (place and payment). */
  itemHref: (id: string, kind: "lab" | "radiology", facilityOnly?: boolean) => string;
};

const names = (s: { nameAr?: string; nameEn?: string; names: Record<string, string | undefined> }) => [s.nameAr, s.nameEn, ...Object.values(s.names)];

/** The rating line of a card, or undefined: shown only for a rating above 0 with its count above 0. */
export function ratingLine(ctx: Pick<RowContext, "locale" | "tr">, rating: number | undefined, count: number | undefined): string | undefined {
  if (!(typeof rating === "number" && rating > 0) || !(typeof count === "number" && count > 0)) return undefined;
  return ctx.tr("ratingLine", { value: new Intl.NumberFormat(ctx.locale, { maximumFractionDigits: 1 }).format(rating), count: new Intl.NumberFormat(ctx.locale).format(count) });
}

/** The offer lines of a row from its summary (undefined when the payload has no summary: an older answer draws nothing). */
export function offerLines(ctx: Pick<RowContext, "locale" | "tr">, offer: OfferSummary | undefined): OfferLines | undefined {
  if (!offer) return undefined;
  const none = offer.providersCount === 0;
  return {
    providers: none ? ctx.tr("offerNone") : ctx.tr("offerCount", { count: offer.providersCount }),
    none,
    from: !none && offer.fromPrice !== undefined ? ctx.tr("fromPrice", { price: money(ctx.locale, offer.fromPrice) }) : undefined,
    where: none ? [] : [
      ...(offer.premisesAvailable ? [ctx.tr("offerAtCentre")] : []),
      ...(offer.homeAvailable ? [ctx.tr("offerAtHome")] : []),
      ...(offer.insuranceAccepted ? [ctx.tr("offerInsurance")] : []),
    ],
  };
}

/** The fasting and result-time line of a card; each part only when the catalogue sent it (fasting_required, turnaround_hours). */
export function metaLine(ctx: Pick<RowContext, "locale" | "tr">, fastingRequired: boolean | undefined, turnaroundHours: number | undefined): string | undefined {
  const parts = [
    fastingRequired === undefined ? undefined : ctx.tr(fastingRequired ? "tagFasting" : "noFasting"),
    turnaroundHours !== undefined ? ctx.tr("resultWithin", { time: hoursText(ctx.locale, turnaroundHours) }) : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function labRow(s: LabService, ctx: RowContext): CatalogRow {
  return {
    id: s.id,
    // the backend's own `category` decides the illustration first (diagArtKey), then the sample type and the names
    art: diagArtKey({ kind: "lab", category: s.category, sampleType: s.sampleType, names: names(s) }),
    href: ctx.itemHref(s.id, "lab"),
    title: pickName(ctx.locale, s.names) ?? "",
    tags: [
      ...(s.homeVisitSupported ? [{ label: ctx.tr("tagHome"), tone: DIAG_TONES.lab }] : []),
    ],
    meta: metaLine(ctx, s.fastingRequired, s.turnaroundHours),
    // with the offer summary the price is the providers' own "from" (in the offer lines); the catalogue's base price is the fallback of an older answer
    price: (s.offer === undefined || s.offer.fromPrice === undefined) && s.price !== undefined ? money(ctx.locale, s.price) : undefined,
    rating: ratingLine(ctx, s.rating, s.ratingCount),
    imageUrl: s.imageUrl,
    offer: offerLines(ctx, s.offer),
    line: { id: s.id, nameAr: s.nameAr, nameEn: s.nameEn },
  };
}

export function scanRow(s: RadiologyService, ctx: RowContext): CatalogRow {
  return {
    id: s.id,
    art: diagArtKey({ kind: "radiology", category: s.category, modality: [s.modality, s.modalityCategory].filter(Boolean).join(" "), bodyPart: s.bodyPart, names: names(s) }),
    href: ctx.itemHref(s.id, "radiology", s.homeVisitSupported !== true),
    title: pickName(ctx.locale, s.names) ?? "",
    meta: metaLine(ctx, s.fastingRequired, s.turnaroundHours),
    note: (s.offer === undefined || s.offer.fromPrice === undefined) && s.price !== undefined ? ctx.tr("fromPrice", { price: money(ctx.locale, s.price) }) : undefined,
    rating: ratingLine(ctx, s.rating, s.ratingCount),
    imageUrl: s.imageUrl,
    offer: offerLines(ctx, s.offer),
    line: { id: s.id, nameAr: s.nameAr, nameEn: s.nameEn },
  };
}
