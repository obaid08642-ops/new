# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/family-group.test.ts`
- **Member SHA-256:** `61790f440ea3e68dac60e4fcbf01bc70b23d5d61d01f0fe35480f89d2decfa66`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: it("keeps group name/count and drops invite, permissions, and ids", () => {`
- `5: expect(parseFamilyGroup({ id: "private", name: "Home", owner_id: "owner", invite_code: "secret", members: [{ user_id: "u1", permissions: ["*"] }, { user_id: "u2", permissions: ["vitals"] }] }, "owner")).toEqual({ name: "Home", memberCount: `
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
