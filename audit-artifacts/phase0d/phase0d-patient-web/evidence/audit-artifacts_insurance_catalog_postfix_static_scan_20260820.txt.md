# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/insurance_catalog_postfix_static_scan_20260820.txt`
- **Member SHA-256:** `14e10ffd19a3bce310cba96fca2fbbe68c2a5a4c1af06b79a00546fbfea56c72`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: /home/ubuntu/nabdah_execution/provider/src/screens/doctor/DoctorDashboard.tsx:1153: <NBadge label="Bupa A" variant="primary" size="xs" />`
### backend_consumers_or_contracts
- `2: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:7: * served by the backend (insurance_companies / insurance_networks collections,`
- `3: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:15:  id: string;          // company code (e.g. 'bupa')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:7: * served by the backend (insurance_companies / insurance_networks collections,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
