# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/articles.test.ts`
- **Member SHA-256:** `1b8c981a890a76fc390fb025c4b402d669ce0ff8527940772a3abe58ca3c5c60`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: expect(articleQuery({ q: "  blood pressure ", category: "cardio & care", page: 2 })).toBe("/articles?limit=20&page=2&q=blood+pressure&category=cardio+%26+care");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `9: expect(articleQuery({ q: "  blood pressure ", category: "cardio & care", page: 2 })).toBe("/articles?limit=20&page=2&q=blood+pressure&category=cardio+%26+care");`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
