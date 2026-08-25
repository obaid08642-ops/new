# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/radiology.ts`
- **Member SHA-256:** `d6a4d898a8a3980bbba0da9d05e70dd54f8d259f632465244de595fe674e2cc8`
- **Line count:** 19
- **Read range:** `1-19`
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
- `17: function parse(value: unknown): RadiologyService|null { const p=serviceSchema.safeParse(value); if(!p.success || (!p.data._id&&!p.data.id) || (!p.data.name_ar&&!p.data.name_en)) return null; const x=p.data; return { id:x._id??x.id!, shortCo`
### payment_insurance_relevance
- `8: price: z.number().nonnegative().optional(), old_price: z.number().nonnegative().optional(),`
- `15: export type RadiologyService = { id:string; shortCode?:string; nameAr?:string; nameEn?:string; modality?:string; bodyPart?:string; price?:number; oldPrice?:number; contrastRequired?:boolean; fastingRequired?:boolean; descriptionAr?:string; `
- `17: function parse(value: unknown): RadiologyService|null { const p=serviceSchema.safeParse(value); if(!p.success || (!p.data._id&&!p.data.id) || (!p.data.name_ar&&!p.data.name_en)) return null; const x=p.data; return { id:x._id??x.id!, shortCo`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
