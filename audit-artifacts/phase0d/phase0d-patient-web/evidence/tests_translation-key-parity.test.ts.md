# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/translation-key-parity.test.ts`
- **Member SHA-256:** `b8224dd4da70ac04aac0e4b00bcc0b97854cd8191ccf3b7147668e8ba744d234`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: it("includes the settings session-disclosure key in every language", () => {`
- `25: for (const locale of languageFiles) expect(keysFor(locale)).toContain("Settings.sessionsSummary");`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
