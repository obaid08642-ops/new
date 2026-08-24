# Phase 0B semantic evidence — DeviceTrustService

**Archive member:** `src/modules/auth/device-trust.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–116 from the baseline archive extraction.

Lines 1–28 define the admin trusted-device registry, Mongo model, Redis service, and a five-minute online-session TTL. The service comments state that issue is called only after completed 2FA/WebAuthn, returns the raw token once, and stores only a SHA-256 hash.

Lines 30–43 implement SHA-256 hashing and user-agent-derived device names for iPhone/iPad/Mac/Windows/Android/Linux/unknown.

Lines 45–57 issue a 32-byte base64url token, persist only its hash together with user ID, device name, truncated user-agent, IP, last IP, and last-seen timestamp, and return the token plus full device object to the caller.

Lines 59–68 validate a token only when it is a string of at least 20 characters, matching user ID, hashed token, and `revoked:false`; successful validation updates last-seen/IP and returns the device. Lines 70–80 list non-revoked devices while excluding token hashes and mark a selected user-owned device revoked.

Lines 82–103 implement heartbeat. The registry key is per user; device identity is a truncated hash of the device token or `unknown-device`. Redis JSON is read best-effort, current user-agent/IP/time are written, entries older than five minutes are removed, and registry TTL is reset to five minutes.

Lines 105–115 implement online session listing from the Redis registry, filtering entries newer than five minutes and returning hashed session identifiers plus metadata.

**Auth/ownership:** device records are user-scoped; validation requires user ID and non-revoked hash; revoke requires both device ID and user ID. Service assumes caller established admin/2FA context.

**State transitions:** issued → validated/heartbeat-seen → revoked; online registry entries expire/stale-prune after five minutes.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** raw trust token is returned only on issue while DB stores SHA-256; list excludes token hash; revoke returns `{ok:true}` even if no record was changed; heartbeat and onlineSessions swallow Redis parse errors; unknown-device collapses sessions when token is absent; IP/user-agent metadata is retained and truncated.

**Test implications:** token entropy/hash storage, user/device binding, revoked-token rejection, last-seen updates, revoke-not-found semantics, Redis unavailable/invalid JSON, heartbeat stale pruning, unknown-device collision, metadata redaction, and 5-minute online TTL. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
