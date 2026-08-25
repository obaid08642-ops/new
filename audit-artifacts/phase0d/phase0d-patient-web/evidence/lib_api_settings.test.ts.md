# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/settings.test.ts`
- **Member SHA-256:** `49d74405969cb4dfee9156a5fb1f3197ae3e53c6078134d9a7d458927fb28f95`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "./settings";`
- `9: it("drops session ids while keeping device and expiry metadata", () => {`
- `10: expect(parseSessions([{ id: "private-jti", device: "web", expires_in_seconds: 86400, access_token: "private" }])).toEqual([{ device: "web", expiresInSeconds: 86400 }]);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `13: expect(parseStorageSummary({ used: "1 MB", total: "5 GB", items: [{ label: "Reports", val: "1 MB", pct: 2, base64: "private" }], patient_id: "private" })).toEqual({ used: "1 MB", total: "5 GB", items: [{ label: "Reports", value: "1 MB", per`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
