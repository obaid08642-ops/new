# Phase 0B semantic evidence — Coturn / ICE credentials

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/coturn/coturn.service.ts:2–93`
- `src/modules/coturn/coturn.controller.ts:2–19`
- `src/modules/coturn/coturn.module.ts:2–10`

`CoturnService` reads TURN host/secret/ports/realm/URL override from environment, but defaults to `turn.example.com` and `change_this_secret` when absent (`coturn.service.ts:23–34`). It derives STUN/TURN/TURNS URLs and generates REST credentials using HMAC-SHA1 with username `<expiry>:<userId>` and a caller-selectable TTL defaulting to 86400 seconds (`36–67`). No visible TTL bounds, user existence/authorization check, secret fail-closed startup guard, URL validation or key rotation/version is present.

`CoturnController` is JWT guarded and exposes both `/calls/ice/config` and `/calls/ice/credentials`, passing the authenticated `u.id` into credential generation (`coturn.controller.ts:5–18`). The credentials endpoint returns raw credential material and the config endpoint returns realm and ICE topology. The service does not itself distinguish privileged users, call membership or session purpose. The module only registers/exports the service/controller (`coturn.module.ts:5–10`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: insecure default TURN secret/host, fail-open environment configuration, long/unbounded credential TTL, raw ICE topology/credential exposure, endpoint duplication and missing call/session authorization.
