# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/insurance_catalog_final_operational_static_scan_20260820.txt`
- **Member SHA-256:** `b8f338ba4c7e17afc50d6f53dedbf7a5819f3ababdbacb3a522da956aeb3e331`
- **Line count:** 2
- **Read range:** `1-2`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:7: * served by the backend (insurance_companies / insurance_networks collections,`
- `2: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:15:  id: string;          // company code (e.g. 'bupa')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `1: /home/ubuntu/nabdah_execution/provider/src/api/catalogs.ts:7: * served by the backend (insurance_companies / insurance_networks collections,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
