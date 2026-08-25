# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/profile.test.ts`
- **Member SHA-256:** `1df287e9b5a3d326af57bdb60b0fcf0fff88a726b93585d3c9575a8eb54f8e75`
- **Line count:** 26
- **Read range:** `1-26`
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
- `2: import { extractRecord, profileDomainState, readProfileFields } from "./profile";`
- `19: it("keeps empty, forbidden and upstream failure states distinct", () => {`
- `20: expect(profileDomainState(200, 0)).toBe("empty");`
- `21: expect(profileDomainState(200, 1)).toBe("available");`
- `22: expect(profileDomainState(403, 0)).toBe("forbidden");`
- `23: expect(profileDomainState(404, 0)).toBe("forbidden");`
- `24: expect(profileDomainState(503, 0)).toBe("error");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `19: it("keeps empty, forbidden and upstream failure states distinct", () => {`
- `20: expect(profileDomainState(200, 0)).toBe("empty");`
- `24: expect(profileDomainState(503, 0)).toBe("error");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
