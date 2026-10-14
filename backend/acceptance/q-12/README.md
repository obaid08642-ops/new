# Q-12 — "Nearest" (owner feature)

Queue: `docs/review/OPENCODE_QUEUE.md`, Queue A (base `main`). Run: `cd backend && node scripts/run-acceptance.mjs q-12`.

`GET /api/v1/care/doctors` (real controller, guards, ValidationPipe, CareService, SlotService, Mongo):
- Writers keep sending the clinic point as `location: { lat, lng }`. The profile also stores it as a GeoJSON `Point` with a `2dsphere` index, kept in step on create and on update (a moved clinic is found at its new place).
- `sort=distance&lat=&lng=` → nearest first, each item with `distance_km` (one decimal), answered by the database: the 3 nearest clinics are created after 230 far ones, so "first 200 then sort in memory" fails. Page 2 continues in distance order without repeats.
- `type=clinic|video|home_visit` (`home_visit` = stored mode `home`). Nearest applies to clinic and home visit only: `type=video&sort=distance` → 400.
- No lat/lng: a signed-in patient falls back to `users.city` (only that city, `distance_km` null). Anonymous, or a patient without a city → 400. Out-of-range lat/lng → 400.
- Non-public doctors never appear.

Decisions taken by the reviewer where the queue text was open (raise with the reviewer if you disagree, do not edit the test): video + distance is a 400, not silently ignored; the city fallback reads `users.city`.
