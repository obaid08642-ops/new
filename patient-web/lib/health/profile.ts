import { maskPhone } from "@/lib/api/emergency-contacts";

/** The patient's own lists in GET /medical-profile (same keys the old conditions and allergies page read). */
export const PROFILE_LISTS = [
  { list: "chronic-diseases", field: "chronic_diseases" },
  { list: "allergies", field: "allergies" },
  { list: "surgeries", field: "surgeries" },
  { list: "long-term-medications", field: "long_term_medications" },
] as const;

export type ProfileListKey = (typeof PROFILE_LISTS)[number]["list"];
export type ProfileItem = { id: string; name: string };
export type ProfileBasics = { heightCm?: number; weightKg?: number; bloodType?: string };
export type FamilyContact = { id: string; name: string; relation?: string; maskedPhone?: string };

const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** The profile object out of `{ data }` or the bare answer. */
export function profileRoot(payload: unknown): Record<string, unknown> | null {
  const root = record(payload);
  return record(root?.data) ?? root;
}

/** The items of one list: an id and a name each; an item with no id cannot be removed, so it is left out. */
export function profileItems(value: unknown): ProfileItem[] {
  const list = Array.isArray(value) ? value : record(value)?.data;
  return (Array.isArray(list) ? list : []).flatMap((entry) => {
    const row = record(entry);
    const id = String(row?.id ?? row?._id ?? "");
    const name = text(row?.name);
    return id && name ? [{ id, name }] : [];
  });
}

export function profileBasics(root: Record<string, unknown> | null): ProfileBasics {
  return { heightCm: finite(root?.height_cm), weightKg: finite(root?.weight_kg), bloodType: text(root?.blood_type) };
}

/** The family members who are emergency contacts (GET /family/emergency-contacts): name, relation and a masked number. */
export function familyContacts(payload: unknown): FamilyContact[] {
  const root = record(payload);
  const rows = Array.isArray(payload) ? payload : [root?.data, root?.contacts, root?.items].find(Array.isArray);
  return ((rows as unknown[] | undefined) ?? []).flatMap((entry, index) => {
    const row = record(entry);
    const name = text(row?.display_name);
    if (!row || !name) return [];
    const phone = text(row.phone);
    return [{ id: text(row.user_id) ?? `family-${index}`, name, relation: text(row.relation), maskedPhone: phone ? maskPhone(phone) : undefined }];
  });
}
