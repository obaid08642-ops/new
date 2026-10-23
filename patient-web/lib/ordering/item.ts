/** One catalogue item (lab test or package, radiology scan, nursing service) in the shape the item page draws. */
import type { LabService } from "@/lib/api/labs";
import type { NursingCatalogItem } from "@/lib/api/nursing-catalog";
import type { RadiologyService } from "@/lib/api/radiology";

export type ItemView = {
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
};

export function fromLab(s: LabService): ItemView {
  return {
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
    preparationAr: s.preparationAr ?? [], preparationEn: s.preparationEn ?? [], fastingHours: s.fastingRequired ? s.fastingHours ?? 0 : undefined,
    turnaroundHours: s.turnaroundHours, sampleType: s.sampleType, included: s.includedServices ?? [], isPackage: s.isPackage === true,
  };
}

export function fromRadiology(s: RadiologyService): ItemView {
  return {
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
    preparationAr: s.preparationAr ?? [], preparationEn: s.preparationEn ?? [], fastingHours: s.fastingRequired ? 0 : undefined,
    turnaroundHours: s.turnaroundHours, included: [], isPackage: false,
  };
}

export function fromNursing(s: NursingCatalogItem): ItemView {
  return { id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn, preparationAr: [], preparationEn: [], included: [], isPackage: false, durationValue: s.durationValue, duration: s.duration };
}

/** The preparation lines in the page's language (Arabic and Urdu read the Arabic list). */
export function preparationFor(locale: string, item: ItemView): string[] {
  const rtl = locale === "ar" || locale === "ur";
  const first = rtl ? item.preparationAr : item.preparationEn;
  const second = rtl ? item.preparationEn : item.preparationAr;
  return first.length ? first : second;
}
