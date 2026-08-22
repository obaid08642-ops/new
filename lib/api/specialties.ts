import { z } from "zod";

const specialtySchema = z.object({
  slug: z.string().min(1).max(120).optional(),
  name_ar: z.string().min(1).max(160).optional(),
  name_en: z.string().min(1).max(160).optional(),
  name: z.string().min(1).max(160).optional(),
  count: z.number().int().nonnegative().optional(),
  provider_count: z.number().int().nonnegative().optional(),
}).strip();

export type SpecialtyRow = {
  slug?: string;
  nameAr?: string;
  nameEn?: string;
  count?: number;
};

function rowsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data;
    if (Array.isArray(root.specialties)) return root.specialties;
    if (Array.isArray(root.items)) return root.items;
  }
  return [];
}

export function extractSpecialties(payload: unknown): SpecialtyRow[] {
  return rowsFrom(payload).flatMap((value) => {
    const parsed = specialtySchema.safeParse(value);
    if (!parsed.success) return [];
    const item = parsed.data;
    const nameAr = item.name_ar ?? item.name;
    const nameEn = item.name_en ?? item.name;
    if (!nameAr && !nameEn) return [];
    return [{ slug: item.slug, nameAr, nameEn, count: item.count ?? item.provider_count }];
  });
}
