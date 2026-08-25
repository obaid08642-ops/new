# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MATERNITY_CLINICAL_STATE_GAP_20260819.md`
- **Member SHA-256:** `713a6ff7bbd869929509e5d4988a13687193c0dcbc5636a50df8887b6d133429`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: This review compares the Patient maternity hub with the guarded Backend maternity profile and checkup contracts. The routes are present and method-compatible: `GET/POST /maternity/profile`, `GET /maternity/content`, and `PUT /maternity/chec`
- `11: | Immediately persists pregnancy/planning toggle and checkup completion locally before request; API failure only logs to console | Backend persists the requested profile/checkup state and can reject/not find profile | UI and storage can div`
- `12: | Builds fertility “AI” advice and says regular-cycle prediction is “highly accurate” from local date arithmetic | Backend profile supplies date inputs; no clinical decision engine is invoked in this screen | Overstated precision and a loca`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: # Phase 2 Patient — maternity clinical-state gap`
- `5: This review compares the Patient maternity hub with the guarded Backend maternity profile and checkup contracts. The routes are present and method-compatible: `GET/POST /maternity/profile`, `GET /maternity/content`, and `PUT /maternity/chec`
- `9: | On profile read failure, loads an AsyncStorage profile; if setup was recorded locally but no profile exists, fabricates pregnancy week 28 and a due date 112 days ahead | Backend owns profile creation/update and computes due date/week from`
- `10: | Renders fallback week 28 and a generated due date when profile is absent | Backend response is the intended source of truth | A clinical timeline can appear even with no authoritative profile | **P0 FIX — replace with empty/setup state** `
- `11: | Immediately persists pregnancy/planning toggle and checkup completion locally before request; API failure only logs to console | Backend persists the requested profile/checkup state and can reject/not find profile | UI and storage can div`
- `12: | Builds fertility “AI” advice and says regular-cycle prediction is “highly accurate” from local date arithmetic | Backend profile supplies date inputs; no clinical decision engine is invoked in this screen | Overstated precision and a loca`
- `14: | Status toggle sends only `is_pregnant` | Backend profile creation can generate a due date/current week when no due date or LMP is supplied | A status toggle can create/alter a pregnancy profile without verified clinical dates | **FIX/BLOC`
- `22: The maternity journey must remain **medical-safety gated** until authoritative profile, setup, recovery, state-reconciliation, and content rules are implemented and tested. Existing educational navigation may remain discoverable, but no fab`
### payment_insurance_relevance
- `13: | Displays fixed fetal size/weight/length content in the hub regardless of dynamic week | A dedicated fetal reference dataset exists elsewhere but the hub does not bind this card to it | Educational content can be wrong for the displayed we`
### error_empty_loading_retry_cancel
- `10: | Renders fallback week 28 and a generated due date when profile is absent | Backend response is the intended source of truth | A clinical timeline can appear even with no authoritative profile | **P0 FIX — replace with empty/setup state** `
- `11: | Immediately persists pregnancy/planning toggle and checkup completion locally before request; API failure only logs to console | Backend persists the requested profile/checkup state and can reject/not find profile | UI and storage can div`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
