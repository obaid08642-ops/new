# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/family/family-ssr.test.ts`
- **Member SHA-256:** `4d2a5222fee9c4d832301e409fd544965f7e1c839eafbc8edd1c66879e58a6b8`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import FamilyPage from "./page";`
- `25: const html = renderToStaticMarkup(await FamilyPage({ params: Promise.resolve({ locale: "en" }) }));`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/family-server", () => ({ getPatientFamilyMembers: state.getPatientFamilyMembers }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `14: const serverToken = "server-only-family-token-never-in-html";`
- `19: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `22: it("renders only member role and join date without identifier, permissions, or access token", async () => {`
- `23: state.getPatientFamilyMembers.mockResolvedValue(new Response(JSON.stringify({ members: [{ user_id: "private_member_123", role: "owner", joined_at: "2026-08-20T10:00:00.000Z", permissions: ["view_health", "view_prescriptions"] }] }), { statu`
- `27: expect(state.getPatientFamilyMembers).toHaveBeenCalledWith(serverToken);`
- `28: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientFamilyMembers: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/family-server", () => ({ getPatientFamilyMembers: state.getPatientFamilyMembers }));`
- `18: state.getPatientFamilyMembers.mockReset();`
- `19: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `23: state.getPatientFamilyMembers.mockResolvedValue(new Response(JSON.stringify({ members: [{ user_id: "private_member_123", role: "owner", joined_at: "2026-08-20T10:00:00.000Z", permissions: ["view_health", "view_prescriptions"] }] }), { statu`
- `27: expect(state.getPatientFamilyMembers).toHaveBeenCalledWith(serverToken);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
