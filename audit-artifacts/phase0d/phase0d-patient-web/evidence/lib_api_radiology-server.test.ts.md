# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/radiology-server.test.ts`
- **Member SHA-256:** `acf2e2d354290140cb357676b27a8f8f881fc906980684fcc8a33cf6c33ce2dd`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: call }));`
- `4: import { getPublicRadiologyServices } from "./radiology-server";`
- `9: expect(call).toHaveBeenCalledWith(expect.stringContaining("/radiology/services?"), expect.objectContaining({ method: "GET", cache: "no-store" }));`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `8: getPublicRadiologyServices({ modality: "mri", bodyPart: "brain", homeVisit: "true", homeOnly: "true", highestRated: "true", lowestPrice: "true", search: "scan", nearest: "evil" });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
