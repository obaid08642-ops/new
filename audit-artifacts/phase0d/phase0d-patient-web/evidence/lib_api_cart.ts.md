# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/cart.ts`
- **Member SHA-256:** `28328c65884429ee38cfa49376d65687d069a13010701a6d7502694375d174f8`
- **Line count:** 32
- **Read range:** `1-32`
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
- No matching static signal found in this member.
### payment_insurance_relevance
- `5: export type PatientCartLine = { lineId: string; kind: string; serviceId: string; name?: string; quantity?: number; price?: number; paymentMethod?: string; homeVisit?: boolean };`
- `6: export type PatientCartSummary = { groups: Array<{ kind: string; count?: number; subtotal?: number; items: PatientCartLine[] }>; subtotal?: number; homeVisitFee?: number; total?: number; currency?: string };`
- `14: export function extractCartSummary(payload: unknown): PatientCartSummary | null {`
- `15: const root = record(payload);`
- `17: if (!Array.isArray(groupsValue)) return { groups: [], subtotal: numberField(root ?? {}, ["subtotal"]), homeVisitFee: numberField(root ?? {}, ["home_visit_fee", "homeVisitFee"]), total: numberField(root ?? {}, ["total"]), currency: stringFie`
- `27: return [{ lineId, serviceId, kind: group.kind as string, name: stringField(item, ["name_ar", "name_en"]), quantity: numberField(item, ["qty", "quantity"]), price: numberField(item, ["price"]), paymentMethod: stringField(item, ["payment_meth`
- `29: return [{ kind: group.kind as string, count: numberField(group, ["count"]), subtotal: numberField(group, ["subtotal"]), items }];`
- `31: return { groups, subtotal: numberField(root ?? {}, ["subtotal"]), homeVisitFee: numberField(root ?? {}, ["home_visit_fee", "homeVisitFee"]), total: numberField(root ?? {}, ["total"]), currency: stringField(root ?? {}, ["currency"]) };`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
