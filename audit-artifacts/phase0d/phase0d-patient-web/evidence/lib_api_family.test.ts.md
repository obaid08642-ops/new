# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/family.test.ts`
- **Member SHA-256:** `e3a742e743406d30d8f51e29df4c4d790d0ba4ba646dfbafe901f65526381c21`
- **Line count:** 9
- **Read range:** `1-9`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: it("keeps role and join date only, excluding member identifier and permissions from display data", () => {`
- `6: const members = extractFamilyMembers({ members: [{ user_id: "member_123", role: "owner", joined_at: "2026-08-20T10:00:00.000Z", display_name: "عضو خاص", relation: "parent", permissions: ["view_health"], health_summary: "private" }] });`
- `7: expect(members).toEqual([{ id: "member_123", role: "owner", joinedAt: "2026-08-20T10:00:00.000Z", displayName: "عضو خاص", relation: "parent" }]);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
