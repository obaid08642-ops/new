# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/orders.test.ts`
- **Member SHA-256:** `7b71e84b067188a98c40bc64909033864d3e2ddaa97002137cca737bbb928cc0`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: it("rejects non-UUID route identifiers before an upstream call", () => {`
### backend_consumers_or_contracts
- `2: import { extractOrderRows, parseOrderId } from "./orders";`
- `15: const { extractOrderTracking } = await import("./orders");`
### auth_ownership
- `6: expect(parseOrderId("../../admin").success).toBe(false);`
### state_transitions
- `6: expect(parseOrderId("../../admin").success).toBe(false);`
- `7: expect(parseOrderId("91047ef2-ad36-422a-a184-629693e7c729").success).toBe(true);`
- `11: expect(extractOrderRows({ data: [{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "DELIVERED", createdAt: "2026-08-20T10:00:00.000Z", items: [{ name_ar: "private medicine" }], totals: { total: 42, currency: "SAR" }, patient_account_id:`
- `16: expect(extractOrderTracking({ data: { state: "OUT_FOR_DELIVERY", pharmacy_name: "Sandbox Pharmacy", delivery_mode: "DELIVERY", delivery: { eta_minutes: 24 }, total: 18, currency: "SAR", updated_at: "2026-08-21T10:00:00.000Z", patient_accoun`
### payment_insurance_relevance
- `10: it("keeps bounded patient pharmacy summary fields and excludes private payload fields", () => {`
- `11: expect(extractOrderRows({ data: [{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "DELIVERED", createdAt: "2026-08-20T10:00:00.000Z", items: [{ name_ar: "private medicine" }], totals: { total: 42, currency: "SAR" }, patient_account_id:`
- `16: expect(extractOrderTracking({ data: { state: "OUT_FOR_DELIVERY", pharmacy_name: "Sandbox Pharmacy", delivery_mode: "DELIVERY", delivery: { eta_minutes: 24 }, total: 18, currency: "SAR", updated_at: "2026-08-21T10:00:00.000Z", patient_accoun`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
