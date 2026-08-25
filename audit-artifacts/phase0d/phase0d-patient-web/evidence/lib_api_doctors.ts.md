# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors.ts`
- **Member SHA-256:** `356475d61a5c6e24b6cda0ed09bcac86416a8fe1b5a3d6bdc8031ffe1a3fbece`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `15: export function extractDoctors(payload: unknown): DoctorRow[] { return rowsFrom(payload).flatMap((value) => { const parsed=doctorSchema.safeParse(value); if(!parsed.success) return []; const d=parsed.data; const id=d.id ?? d._id; if(!id) re`
### payment_insurance_relevance
- `10: consultation_fee: z.number().nonnegative().optional(), price: z.number().nonnegative().optional(), average_wait: z.number().nonnegative().optional(), years_experience: z.number().int().nonnegative().optional(), experience_years: z.number().`
- `11: offers_online: z.boolean().optional(), offers_clinic: z.boolean().optional(), offers_home: z.boolean().optional(), accepts_insurance: z.boolean().optional(), facility_name: z.string().max(180).optional(), clinic_name: z.string().max(180).op`
- `13: export type DoctorRow = { id: string; name?: string; degree?: string; specialty?: string; rating?: number; reviews?: number; price?: number; waitMinutes?: number; experienceYears?: number; online: boolean; clinic: boolean; home: boolean; ac`
- `14: function rowsFrom(payload: unknown): unknown[] { if (Array.isArray(payload)) return payload; if (payload && typeof payload === "object" && !Array.isArray(payload)) { const root=payload as Record<string,unknown>; for (const key of ["data","i`
- `15: export function extractDoctors(payload: unknown): DoctorRow[] { return rowsFrom(payload).flatMap((value) => { const parsed=doctorSchema.safeParse(value); if(!parsed.success) return []; const d=parsed.data; const id=d.id ?? d._id; if(!id) re`
- `16: export function doctorQuery(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" }) { const params=new URLSearchParams(); const search=(input.search ?? input.specialty ?? "").trim(); if(search) params.set("search`
- `17: export function extractDoctor(payload: unknown): DoctorRow | null { const rows = extractDoctors([payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload ? (payload as Record<string, unknown>).data : payload]);`
- `20: export function extractDoctorSlots(payload: unknown): DoctorSlots | null { if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null; const p=payload as Record<string, unknown>; if(typeof p.date!=="string" || !["cli`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
