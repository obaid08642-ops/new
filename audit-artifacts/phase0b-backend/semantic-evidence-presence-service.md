# Phase 0B semantic evidence — PresenceService

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/presence/presence.service.ts:2–83`

`presence.service.ts:12–20` uses Redis hashes/sets keyed by raw user ID with a 30-second online TTL. `:22–32` sets online, refreshes both user/device keys and adds socket ID. `:34–49` removes a socket, reads remaining devices, marks user offline if the set is empty, or refreshes only the user key TTL when devices remain. `:51–54` heartbeat refreshes keys based only on user/socket arguments but does not verify the socket is a member of the device set. `:56–72` determines presence from hash/exists and reports raw device count. `:75–81` performs unbounded parallel bulk lookups and returns last-seen timestamps. No input validation, namespace normalization, atomic Lua/transaction, key privacy, stale-socket reconciliation, Redis error policy or audit is visible.

## Findings candidates

The read supports: non-atomic multi-device online/offline races, heartbeat spoofing if caller context is weak, stale device-set counts, TTL/last-seen inconsistency, bulk presence amplification and ambiguous Redis failure semantics.

No product code was changed and no tests/builds were executed during this semantic read.
