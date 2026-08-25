# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MANUAL_FINDINGS_BATCH_01_20260818.md`
- **Member SHA-256:** `ff7207701dadca7ed12bd1d666d2bf42ef514d58f1c68c55ec02f814dfd5d4a3`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: `main/app/nutrition/hub.tsx` is a broad feature directory but has no data loading. QA `nutrition/hub.tsx` calls `/nutrition/profile` and `/nutrition/daily-summary` with loading/error/retry states but exposes a much narrower set of actions. `
- `17: `main/app/diagnostics/booking-confirm.tsx` preserves the full home-vs-lab, payment, insurance, cart, confirmation, and tracking journey, but contains hardcoded address/coordinates, a fixed home fee and VAT calculation, a provider fallback I`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `19: These findings are evidence for `MERGED` or `BLOCKED` decisions, not permission to copy an entire alternative archive or to patch source silently.`
### state_transitions
- `9: `main/app/nutrition/hub.tsx` is a broad feature directory but has no data loading. QA `nutrition/hub.tsx` calls `/nutrition/profile` and `/nutrition/daily-summary` with loading/error/retry states but exposes a much narrower set of actions. `
- `13: `main/app/maternity/hub.tsx` has the richer pregnancy/cycle/checkup/planning journey, but when backend data is absent it falls back to AsyncStorage and can synthesize a default pregnancy profile with week 28 and a due date derived from `Dat`
### payment_insurance_relevance
- `17: `main/app/diagnostics/booking-confirm.tsx` preserves the full home-vs-lab, payment, insurance, cart, confirmation, and tracking journey, but contains hardcoded address/coordinates, a fixed home fee and VAT calculation, a provider fallback I`
### error_empty_loading_retry_cancel
- `9: `main/app/nutrition/hub.tsx` is a broad feature directory but has no data loading. QA `nutrition/hub.tsx` calls `/nutrition/profile` and `/nutrition/daily-summary` with loading/error/retry states but exposes a much narrower set of actions. `
- `13: `main/app/maternity/hub.tsx` has the richer pregnancy/cycle/checkup/planning journey, but when backend data is absent it falls back to AsyncStorage and can synthesize a default pregnancy profile with week 28 and a due date derived from `Dat`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
