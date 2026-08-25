# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_AMBULANCE_EMERGENCY_GAPS_20260819.md`
- **Member SHA-256:** `17e84f5b1611122d78a12ed7f1b422de78feb2d27c9771547a2b9724e1bf4428`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | **P0** | Mission loader creates an actionable fake mission after an access/load failure | When mission fetch fails or ID is absent from returned pool, it sets `{ id }` then renders controls to track, hand over, or complete. | Fail closed `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The approved programme rule keeps SOS, emergency-location, QR, consent and related legal/operational contracts **fail-closed** pending owner legal/product approval. Therefore, the presence of these active Provider flows is itself a release `
- `14: | **P1** | Location tracking lacks purpose-specific consent/status/reliability controls | App requests location then posts best-effort GPS every 30 seconds, silently ignores errors, and has no retention/precision/visibility/stop assurance. `
- `16: | **P1** | Emergency UI lacks six-language and minimum-necessary PHI review | Displayed patient identity, symptoms, severity, time and handover content are AR/EN only and not governed by a least-data rule. | Complete approved multilingual e`
- `20: Ambulance features are **P0 BLOCKED/FAIL-CLOSED**. No deployment or E2E activation is permitted until the owner approves the separate emergency/consent/location/QR contracts and all corresponding implementation gates are completed.`
### state_transitions
- `5: The approved programme rule keeps SOS, emergency-location, QR, consent and related legal/operational contracts **fail-closed** pending owner legal/product approval. Therefore, the presence of these active Provider flows is itself a release `
- `7: ## Confirmed defects`
- `11: | **P0** | Provider ambulance dashboard exposes active SOS claim, tracking, handover and completion flows despite unapproved emergency contracts | UI polls emergency missions, claims a mission, publishes GPS, records handover and completes `
- `12: | **P0** | Mission loader creates an actionable fake mission after an access/load failure | When mission fetch fails or ID is absent from returned pool, it sets `{ id }` then renders controls to track, hand over, or complete. | Fail closed `
- `13: | **P0** | Clinical/legal handover and completion records are unstructured and language-dependent | Hospital is a free-text name; notes and vitals are unvalidated strings. Outcome is sent as display text, so Arabic/English language choice c`
- `14: | **P1** | Location tracking lacks purpose-specific consent/status/reliability controls | App requests location then posts best-effort GPS every 30 seconds, silently ignores errors, and has no retention/precision/visibility/stop assurance. `
- `15: | **P1** | Availability, response and mission-history UI is not truthful | Online toggle does not establish dispatch availability; history fetches wallet ledger then always assigns no missions; failed pool load looks like no SOS calls. | Us`
- `16: | **P1** | Emergency UI lacks six-language and minimum-necessary PHI review | Displayed patient identity, symptoms, severity, time and handover content are AR/EN only and not governed by a least-data rule. | Complete approved multilingual e`
- `20: Ambulance features are **P0 BLOCKED/FAIL-CLOSED**. No deployment or E2E activation is permitted until the owner approves the separate emergency/consent/location/QR contracts and all corresponding implementation gates are completed.`
### payment_insurance_relevance
- `15: | **P1** | Availability, response and mission-history UI is not truthful | Online toggle does not establish dispatch availability; history fetches wallet ledger then always assigns no missions; failed pool load looks like no SOS calls. | Us`
### error_empty_loading_retry_cancel
- `5: The approved programme rule keeps SOS, emergency-location, QR, consent and related legal/operational contracts **fail-closed** pending owner legal/product approval. Therefore, the presence of these active Provider flows is itself a release `
- `12: | **P0** | Mission loader creates an actionable fake mission after an access/load failure | When mission fetch fails or ID is absent from returned pool, it sets `{ id }` then renders controls to track, hand over, or complete. | Fail closed `
- `14: | **P1** | Location tracking lacks purpose-specific consent/status/reliability controls | App requests location then posts best-effort GPS every 30 seconds, silently ignores errors, and has no retention/precision/visibility/stop assurance. `
- `15: | **P1** | Availability, response and mission-history UI is not truthful | Online toggle does not establish dispatch availability; history fetches wallet ledger then always assigns no missions; failed pool load looks like no SOS calls. | Us`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
