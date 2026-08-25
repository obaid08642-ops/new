# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase4-test-files.txt`
- **Member SHA-256:** `1203fcb8fa74de7283a1e8602f4934758158e95d3dd92617ea5635c9ba938611`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: app/[locale]/diagnostics/labs/labs-ssr.test.ts`
- `4: app/[locale]/diagnostics/packages/labs-packages-ssr.test.ts`
- `5: app/[locale]/home-care/home-care-ssr.test.ts`
- `9: app/[locale]/orders/orders-ssr.test.ts`
- `10: lib/api/cart.test.ts`
- `11: lib/api/diagnostics-report.test.ts`
- `12: lib/api/diagnostics-server.test.ts`
- `13: lib/api/diagnostics.test.ts`
- `14: lib/api/home-care-server.test.ts`
- `15: lib/api/home-care-services-server.test.ts`
- `16: lib/api/home-care-services.test.ts`
- `17: lib/api/home-care.test.ts`
### auth_ownership
- `27: lib/api/sandbox-order-ownership.test.ts`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
