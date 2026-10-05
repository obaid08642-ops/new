import { z } from "zod";

// The API sends `null` for a field it has no value for (a doctor without a price, a medicine without a
// rating); that is "absent", not a malformed result, so it must not drop the whole row.
const optionalText = z.string().nullish().transform((value) => value ?? undefined);

const resultSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  typeEn: optionalText,
  name: z.string().min(1),
  nameEn: optionalText,
  sub: optionalText,
  subEn: optionalText,
  rate: optionalText,
  price: optionalText,
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
