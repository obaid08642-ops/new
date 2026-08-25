# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/family-group.ts`
- **Member SHA-256:** `267539e1877f806c55ef3b5448f6281b1296db92a0c9b020f28b7e8445b423c1`
- **Line count:** 4
- **Read range:** `1-4`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: const groupSchema=z.object({name:z.string().max(160).optional(),owner_id:z.string().max(160).optional(),members:z.array(z.unknown()).optional()}).passthrough();`
- `3: export type FamilyGroupSummary={name?:string;memberCount:number;viewerIsOwner:boolean};`
- `4: export function parseFamilyGroup(payload:unknown,viewerId?:string):FamilyGroupSummary|null{const root=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as Record<string,unknown>:null;const p=groupSchema.safeParse(root?.dat`
### state_transitions
- `4: export function parseFamilyGroup(payload:unknown,viewerId?:string):FamilyGroupSummary|null{const root=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as Record<string,unknown>:null;const p=groupSchema.safeParse(root?.dat`
### payment_insurance_relevance
- `4: export function parseFamilyGroup(payload:unknown,viewerId?:string):FamilyGroupSummary|null{const root=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as Record<string,unknown>:null;const p=groupSchema.safeParse(root?.dat`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
