/** One catalogue item (lab test or package, radiology scan, nursing service) in the shape the item page draws. */
import type { LabService } from "@/lib/api/labs";
import type { TextLists } from "@/lib/i18n/localized-lists";
import { resolveLocalizedList, type LocalizedListResult } from "@/lib/i18n/localized-field";
import type { Texts } from "@/lib/i18n/localized";
import type { NursingCatalogItem } from "@/lib/api/nursing-catalog";
import type { RadiologyService } from "@/lib/api/radiology";
import type { OfferSummary, ServiceOffer } from "@/lib/api/offers";
import { diagArtKey, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";

export type ItemView = {
  /** the name, description and preparation in every language the server holds; the Ar/En fields below stay for callers that read two */
  names?: Texts;
  descriptions?: Texts;
  preparations?: TextLists;
  id: string;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  preparationAr: string[];
  preparationEn: string[];
  fastingHours?: number;
  turnaroundHours?: number;
  sampleType?: string;
  included: string[];
  isPackage: boolean;
  /** nursing: the length the catalogue states, as a value in minutes or hours text parsed by the page */
  durationValue?: number;
  duration?: string;
  /** The category illustration of a lab test, package or scan (a nursing service keeps its service glyph). */
  art?: DiagArtKey;
  /** The item's own picture (`image_url`); the page draws it first and `art` only as the fallback. */
  imageUrl?: string;
  /** What providers offer for it (the catalogue detail's summary and offers); absent when the payload carries none. */
  offer?: OfferSummary;
  offers?: ServiceOffer[];
};

export function fromLab(s: LabService): ItemView {
  return {
    names: s.names, descriptions: s.descriptions, preparations: s.preparations,
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
    preparationAr: s.preparationAr ?? [], preparationEn: s.preparationEn ?? [], fastingHours: s.fastingRequired ? s.fastingHours ?? 0 : undefined,
    imageUrl: s.imageUrl, turnaroundHours: s.turnaroundHours, sampleType: s.sampleType, included: s.includedServices ?? [], isPackage: s.isPackage === true, offer: s.offer, offers: s.offers,
    art: diagArtKey({ kind: "lab", category: s.category, sampleType: s.sampleType, names: [s.nameAr, s.nameEn, ...Object.values(s.names)] }),
  };
}

export function fromRadiology(s: RadiologyService): ItemView {
  return {
    names: s.names, descriptions: s.descriptions, preparations: s.preparations,
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
    preparationAr: s.preparationAr ?? [], preparationEn: s.preparationEn ?? [], fastingHours: s.fastingRequired ? 0 : undefined,
    imageUrl: s.imageUrl, turnaroundHours: s.turnaroundHours, included: [], isPackage: false, offer: s.offer, offers: s.offers,
    art: diagArtKey({ kind: "radiology", category: s.category ?? undefined, modality: [s.modality, s.modalityCategory].filter(Boolean).join(" "), bodyPart: s.bodyPart, names: [s.nameAr, s.nameEn, ...Object.values(s.names)] }),
  };
}

export function fromNursing(s: NursingCatalogItem): ItemView {
  return { offer: s.offer, offers: s.offers, id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn, preparationAr: [], preparationEn: [], included: [], isPackage: false, durationValue: s.durationValue, duration: s.duration };
}

/** The preparation lines in the page's language, else the other language (lib/i18n/localized-field.ts); see preparationField for the mark. */
export function preparationField(locale: string, item: { preparations?: TextLists; preparationAr?: string[]; preparationEn?: string[] }): LocalizedListResult {
  const p = item.preparations;
  const ar = p?.ar?.length ? p.ar : item.preparationAr;
  const en = p?.en?.length ? p.en : item.preparationEn;
  return resolveLocalizedList({ locale, ar, en, perLocale: p ? { ur: p.ur, hi: p.hi, bn: p.bn, tl: p.tl } : undefined });
}

export function preparationFor(locale: string, item: ItemView): string[] {
  return preparationField(locale, item).items;
}
