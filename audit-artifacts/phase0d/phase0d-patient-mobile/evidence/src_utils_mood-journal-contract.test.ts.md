# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/mood-journal-contract.test.ts`
- **Member SHA-256:** `b7e6b4ef6c01465345cc9db5860d9f41e0c39bbb0ff9c26a0069446b85dc7c6a`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: it('treats a malformed response as a load failure instead of an empty history', () => {`
### payment_insurance_relevance
- `1: import { buildMoodJournalPayload, parseMoodHistory } from './mood-journal-contract';`
- `5: expect(buildMoodJournalPayload({ mood: 'good', energy: undefined, stress: undefined, sleep: '', note: '  A note  ', tags: ['calm'] })).toEqual({`
- `11: expect(() => buildMoodJournalPayload({ mood: 'okay', energy: 6, stress: undefined, sleep: '25', note: '', tags: [] })).toThrow('energy_level');`
- `12: expect(() => buildMoodJournalPayload({ mood: 'okay', energy: undefined, stress: undefined, sleep: 'not-a-number', note: '', tags: [] })).toThrow('sleep_hours');`
### error_empty_loading_retry_cancel
- `19: it('treats a malformed response as a load failure instead of an empty history', () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
