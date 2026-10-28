import { diagArtKey, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import type { LabService } from "@/lib/api/labs";
import type { RadiologyService } from "@/lib/api/radiology";
import type { LineNames } from "@/lib/ordering/basket";
import { hoursText, money } from "@/lib/diagnostics-format";
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
  price?: string;
  /** "Rating 4.5 (12)": only when the backend sent a rating above 0 and the number of ratings behind it. */
  rating?: string;
  imageUrl?: string;
  line: { id: string; nameAr?: string; nameEn?: string; names?: LineNames };
};

export type RowKey = "tagHome" | "tagFasting" | "resultWithin" | "fromPrice" | "ratingLine";
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

export function labRow(s: LabService, ctx: RowContext): CatalogRow {
  return {
    id: s.id,
    // the backend's own `category` decides the illustration first (diagArtKey), then the sample type and the names
    art: diagArtKey({ kind: "lab", category: s.category, sampleType: s.sampleType, names: names(s) }),
    href: ctx.itemHref(s.id, "lab"),
    title: pickName(ctx.locale, s.names) ?? "",
    tags: [
      ...(s.homeVisitSupported ? [{ label: ctx.tr("tagHome"), tone: DIAG_TONES.lab }] : []),
      ...(s.fastingRequired ? [{ label: ctx.tr("tagFasting"), tone: DIAG_TONES.warn }] : []),
    ],
    note: s.turnaroundHours !== undefined ? ctx.tr("resultWithin", { time: hoursText(ctx.locale, s.turnaroundHours) }) : undefined,
    price: s.price !== undefined ? money(ctx.locale, s.price) : undefined,
    rating: ratingLine(ctx, s.rating, s.ratingCount),
    imageUrl: s.imageUrl,
    line: { id: s.id, nameAr: s.nameAr, nameEn: s.nameEn },
  };
}

export function scanRow(s: RadiologyService, ctx: RowContext): CatalogRow {
  return {
    id: s.id,
    art: diagArtKey({ kind: "radiology", category: s.category, modality: [s.modality, s.modalityCategory].filter(Boolean).join(" "), bodyPart: s.bodyPart, names: names(s) }),
    href: ctx.itemHref(s.id, "radiology", s.homeVisitSupported !== true),
    title: pickName(ctx.locale, s.names) ?? "",
    note: s.price !== undefined ? ctx.tr("fromPrice", { price: money(ctx.locale, s.price) }) : undefined,
    rating: ratingLine(ctx, s.rating, s.ratingCount),
    imageUrl: s.imageUrl,
    line: { id: s.id, nameAr: s.nameAr, nameEn: s.nameEn },
  };
}
