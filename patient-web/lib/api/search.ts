import { z } from "zod";

const resultSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  typeEn: z.string().optional(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  sub: z.string().optional(),
  subEn: z.string().optional(),
  rate: z.string().optional(),
  price: z.string().optional(),
});

export type SearchResult = z.infer<typeof resultSchema>;

export function extractSearchResults(payload: unknown, locale: string): SearchResult[] {
  const values = Array.isArray(payload) ? payload : [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const parsed = resultSchema.safeParse(value);
    if (!parsed.success) return [];
    const r = parsed.data;
    return [{
      ...r,
      name: (isAr ? r.name : r.nameEn || r.name) || r.name,
      sub: isAr ? r.sub : r.subEn || r.sub,
      type: isAr ? r.type : r.typeEn || r.type,
    }];
  });
}
