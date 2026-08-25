# Phase 0B semantic evidence — LiveKit follow-up spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/livekit/livekit.followup.spec.ts:1–123`

This Jest spec constructs `LiveKitService` with mocked appointment/database connection and event emitter (`4–8`). It covers denial of provider ping without active appointment, UUID business-id usage for provider no-show, denial for an unowned appointment, creation of a booking-room token with 600-second `exp-nbf`, patient and assigned-doctor token issuance within a ±15-minute video appointment window, foreign identity denial, non-video rejection and outside-window rejection (`10–122`).

The suite provides focused source evidence for selected participant identity, business-ID lookup, token room/TTL and basic timing/type constraints. It does not prove real LiveKit signing/verification against the configured API secret, key rotation, token revocation, room ACLs, participant grants, name/identity uniqueness, appointment cancellation/completion handling, consent, call initiation/join/end/reject/no-show lifecycle, event/audit persistence, HTTP guard/status behavior or live media connectivity (`35–80,82–122`).

The ±15-minute tests use `new Date()`/`Date.now()` without a fixed clock, timezone/DST/clock-skew or boundary exactness matrix (`52–122`). `createBookingToken` is tested with test environment variables and token payload decoding, while `issueBookingCallToken` replaces the token creator with a mock (`59–80,89–122`), so the end-to-end credential path is not established. Error behavior is asserted as Nest exceptions only; no redaction, rate limit, replay/idempotency, duplicate device/session or persistence failure behavior is tested. No test was run and no product code was changed during this semantic read.
