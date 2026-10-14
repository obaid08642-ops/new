# D-16 — module switches (owner decision 2026-10-06 item 16, issue #335)

Run: `cd backend && node scripts/run-acceptance.mjs d-16` (needs `redis-server` on the PATH; the test runs `nest build` itself, then starts the compiled `dist/main.js` twice on one in-memory MongoDB). `live-server.ts` is part of the spec: do not edit it.

Contract:
- Keys: `pharmacy, consultations, labs_radiology, nursing, nutrition, maternity, mental_health, family, insurance, loyalty, ai, articles`. Never switched = ON.
- `GET /api/v1/modules` (public) → `{ modules: { key: boolean } }`.
- `PUT /api/v1/admin/modules/:key { enabled, reason }` — admin only, reason ≥ 5 chars, unknown key 400/404.
- A module that is OFF: its patient and public routes answer **403** with `module_disabled` and the key, before any other processing; nothing is written. Other modules and admin routes keep working.
- Instant on every instance: a second instance follows within 5 s.

Reviewer decisions (owner may overrule): 403 rather than 5xx, so the stale-if-error web cache never serves a switched-off module; admin routes are never blocked; provider-app routes are not covered by this spec.
