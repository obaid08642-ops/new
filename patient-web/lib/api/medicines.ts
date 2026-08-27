import { z } from "zod";

const medicineIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const searchSchema = z.object({ q: z.string().trim().max(80).optional(), page: z.coerce.number().int().min(1).max(100).default(1) });

export type MedicineRow = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  activeIngredient?: string;
  genericName?: string;
  form?: string;
  strength?: string;
  requiresPrescription?: boolean;
  availabilityStatus?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function medicineFrom(value: unknown): MedicineRow | null {
  const record = asRecord(value);
  const id = medicineIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  return {
    id: id.data,
    nameAr: text(record, "name_ar"),
    nameEn: text(record, "name_en"),
    activeIngredient: text(record, "active_ingredient"),
    genericName: text(record, "generic_name"),
    form: text(record, "form"),
    strength: text(record, "strength"),
    requiresPrescription: typeof record.requires_prescription === "boolean" ? record.requires_prescription : undefined,
    availabilityStatus: text(record, "availability_status"),
  };
}

export function parseMedicineId(value: string) {
  return medicineIdSchema.safeParse(value);
}

export function parseMedicineSearch(value: { q?: string | string[]; page?: string | string[] }) {
  const q = typeof value.q === "string" ? value.q : undefined;
  const page = typeof value.page === "string" ? value.page : undefined;
  return searchSchema.parse({ q, page });
}

export function medicineQuery(search: { q?: string; page: number }) {
  const params = new URLSearchParams({ limit: "24", page: String(search.page) });
  if (search.q) params.set("q", search.q);
  return `/medicines?${params.toString()}`;
}

export function extractMedicineRows(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const medicine = medicineFrom(item);
    return medicine ? [medicine] : [];
  });
}

export function extractMedicineDetail(payload: unknown) {
  const root = asRecord(payload);
  return medicineFrom(asRecord(root?.data) ?? root);
}
