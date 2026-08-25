# Phase 0B semantic evidence — Phase 6 contract drafts

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/phase6-contracts.ts:1–83`

The file explicitly defines Phase 6 as a non-operational draft and sets `PHASE6_CONTRACT_STATUS='DRAFT_NOT_ACTIVE'` (`3–8`). It exports consent scope/status types and a `ConsentDraft` interface (`10–35`), QR verification fields (`37–50`), emergency coarse-location fields (`52–60`), and a draft error-code registry (`62–72`). These are TypeScript compile-time shapes only; this member contains no runtime DTO decorators, validators, controllers, routes, persistence, signing/key verification, replay store, consent state machine, location capture, retention, or audit implementation.

`ConsentDraft` allows arbitrary `actor_role`, `purpose`, `version`, `source` and optional evidence values without runtime constraints visible here (`21–35`). `QrVerificationDraft` carries security-sensitive `kid/jti/iss/aud/sub/iat/exp/resource_id/signature` values but provides no algorithms, key source/rotation, audience/purpose binding, clock skew, nonce replay persistence or resource ownership contract (`37–50`). `EmergencyLocationDraft` captures coarse coordinates and consent state but provides no accuracy/privacy bounds, retention/deletion, access audit or emergency lifecycle (`52–60`).

The registry includes a small fixed set of statuses, but no mapping validation proves alignment with global error handling or HTTP/OpenAPI contracts (`62–72`). `assertPhase6ContractInactive` always throws `NotImplementedException`, but accepts any registry key and only special-cases three inactive contract keys; it does not prevent an operational caller from bypassing this helper or provide a typed response contract (`74–83`). No product code was changed and no tests/builds were executed during this semantic read.
