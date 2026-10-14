# D-14 — remove the whole ambulance system (owner decision 2026-10-06 item 14, answer O-2)

Run: `cd backend && node scripts/run-acceptance.mjs d-14` (needs `redis-server`; builds and starts `dist/main.js`). `live-server.ts` is part of the spec.

1. Gone (404 for everyone, admin included): emergency trigger/dispatch/missions/claim/tracking/assign/escalate/resolve, provider and admin ambulance fleet, the whole `drivers` module.
2. `ambulance` is refused at provider registration and onboarding (400, nothing stored); the six other types still register.
3. Kept and built: `POST /api/v1/emergency/share-location { lat, lng }` — contacts who use the app get an in-app notification with the map link; the others come back as `sms_links[]` (`sms:` href with the same link) for the patient's own phone; no emergency request, no dispatch, no admin alert; 400 on bad coordinates, 401 anonymous, 429 beyond 5 calls per 10 minutes.
4. Archive first: `scripts/migrations/2026-10-archive-ambulance.ts` (dry-run by default, `--apply` writes; `MONGODB_URI`, `DB_NAME`) copies `emergency_requests`, `ambulance_vehicles`, `drivershifts` and the ambulance rows of `provider_accounts` / `provider_profiles` into `archive_<collection>` (same `_id`, `archived_at`), then removes them; reruns add no duplicates.

The 997 dial button is client-only. Reviewer decision: SMS goes out from the patient's phone (`sms:` links) because the server SMS channel is off by default.
