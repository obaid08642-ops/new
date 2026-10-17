/**
 * The lab catalogue's category codes (backend schemas/lab.schema.ts `category`). The page shows each one by its label in
 * `LabsPackages.categoryName`; a code outside this list has no label in the six languages and is not shown as a choice.
 */
export const LAB_CATEGORIES = ["blood", "hormones", "diabetes", "vitamins", "cardiac", "imaging", "kidney", "liver", "package"] as const;
export type LabCategory = (typeof LAB_CATEGORIES)[number];

export function isLabCategory(value: unknown): value is LabCategory {
  return typeof value === "string" && (LAB_CATEGORIES as readonly string[]).includes(value.trim().toLowerCase());
}
