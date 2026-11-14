import { z } from "zod";

/** A bookable nurse as GET /home-care/providers and GET /home-care/providers/:id send it (`id` is the nurse's account id; `price` comes with a service). */
const nurseSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
  name_ar: z.string().trim().max(200).nullish(),
  name_en: z.string().trim().max(200).nullish(),
  name: z.string().trim().max(200).nullish(),
  facility_name: z.string().trim().max(200).nullish(),
  degree: z.string().trim().max(200).nullish(),
  rating: z.number().finite().min(0).max(5).nullish(),
  reviews_count: z.number().finite().nonnegative().nullish(),
  years_experience: z.number().finite().nonnegative().max(80).nullish(),
  price: z.number().finite().nonnegative().max(1_000_000).nullish(),
  available_now: z.boolean().nullish(),
}).strip();

export type Nurse = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  facility?: string;
  degree?: string;
  rating?: number;
  reviewCount?: number;
  years?: number;
  price?: number;
  availableNow?: boolean;
};

const clean = (value: string | null | undefined) => (value && value.length > 0 ? value : undefined);

function toNurse(value: unknown): Nurse | null {
  const parsed = nurseSchema.safeParse(value);
  if (!parsed.success) return null;
  const n = parsed.data;
  const nameAr = clean(n.name_ar) ?? clean(n.name);
  const nameEn = clean(n.name_en) ?? clean(n.name);
  if (!nameAr && !nameEn) return null;
  return {
    id: n.id,
    nameAr,
    nameEn,
    facility: clean(n.facility_name),
    degree: clean(n.degree),
    rating: n.rating ?? undefined,
    reviewCount: n.reviews_count && n.reviews_count > 0 ? n.reviews_count : undefined,
    years: n.years_experience && n.years_experience > 0 ? n.years_experience : undefined,
    price: n.price ?? undefined,
    availableNow: n.available_now ?? undefined,
  };
}

const unwrap = (payload: unknown): unknown => (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload ? (payload as { data: unknown }).data : payload);

/** One nurse (the profile endpoint); null when the answer is not a nurse. */
export function parseNurse(payload: unknown): Nurse | null {
  return toNurse(unwrap(payload));
}

/** The nurses of a service, in the order the server sent them; a row that is not a nurse is dropped. */
export function parseNurses(payload: unknown): Nurse[] {
  const rows = unwrap(payload);
  return Array.isArray(rows) ? rows.flatMap((row) => { const nurse = toNurse(row); return nurse ? [nurse] : []; }).slice(0, 50) : [];
}

export type NurseSort = "any" | "rating";
export const nurseSortOf = (value: unknown): NurseSort => (value === "rating" ? "rating" : "any");
export type NurseGender = "any" | "male" | "female";
/** issue 1819: the nationality choices of the app's filter sheet; the value is the readable spelling; the server matches it ignoring case (#2042). */
export const NURSE_NATIONALITIES = ["Saudi", "Filipino", "Egyptian"] as const;
export type NurseNationality = "any" | (typeof NURSE_NATIONALITIES)[number];
export const nurseNationalityOf = (value: unknown): NurseNationality => (NURSE_NATIONALITIES as readonly unknown[]).includes(value) ? (value as NurseNationality) : "any";
/** issue 1819: "available now" only (`available=true` on GET /home-care/providers). */
export const nurseAvailableOf = (value: unknown): boolean => value === "now";
export const nurseGenderOf = (value: unknown): NurseGender => (value === "male" || value === "female" ? value : "any");

/** The policy the patient has on file, from GET /insurance/coverage-check (`{ has_policy | eligible, policy }`); nothing is invented when a field is absent. */
export type InsuranceOnFile = { has: boolean; company?: string; policy?: string };
export function parseInsuranceOnFile(payload: unknown): InsuranceOnFile | null {
  const root = unwrap(payload);
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;
  const r = root as Record<string, unknown>;
  const policy = r.policy && typeof r.policy === "object" && !Array.isArray(r.policy) ? (r.policy as Record<string, unknown>) : null;
  const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() || undefined : undefined);
  const has = typeof r.has_policy === "boolean" ? r.has_policy : typeof r.eligible === "boolean" ? r.eligible : policy !== null;
  return {
    has,
    company: str(policy?.company_name) ?? str(policy?.company) ?? str(policy?.provider) ?? str(r.provider),
    policy: str(policy?.policy_number) ?? str(policy?.number) ?? str(r.policy_number) ?? (typeof r.policy === "string" ? str(r.policy) : undefined),
  };
}
