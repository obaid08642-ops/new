# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/integration/Adapters.ts`
- **Member SHA-256:** `b5f93b9b09cb6e66df40ebbd8cc3ee29bee777cf0d03db4b1d818c65ef4ce006`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: getRoutePath(startCoords: any, endCoords: any): Promise<any>;`
- `32: submitClaim(claimData: any): Promise<{ claimId: string; status: string }>;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: verifyOTP(phone: string, code: string): Promise<boolean>;`
- `31: verifyPolicy(policyNumber: string, patientId: string): Promise<{ isValid: boolean; coverageDetails: any }>;`
### state_transitions
- `32: submitClaim(claimData: any): Promise<{ claimId: string; status: string }>;`
### payment_insurance_relevance
- `28: // Insurance Verification Provider Interface`
- `30: export interface InsuranceProvider {`
- `31: verifyPolicy(policyNumber: string, patientId: string): Promise<{ isValid: boolean; coverageDetails: any }>;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
