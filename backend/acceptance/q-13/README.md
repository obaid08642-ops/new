# Q-13 — "Available now" (owner feature)

Queue: `docs/review/OPENCODE_QUEUE.md`, Queue A. Run: `cd backend && node scripts/run-acceptance.mjs q-13`.

**Depends on Q37's one shared availability function (`modules/care/availability.ts`, PR #306, not yet on `main`).** Build on it; do not write a second slot engine. The spec checks the buffer, other patients' holds and approved leave, which the current `main` SlotService does not apply to holds.

`GET /api/v1/care/doctors?available_within=<minutes>&type=clinic|video|home_visit`:
- Only doctors with a free slot starting within the window for that mode (schedule, approved leave, bookings + 5-minute buffer, other patients' active holds); nearest start first; each item has `next_slot_at` (ISO) inside the window.
- `type=video`: a doctor whose online switch is on (what the provider app toggle writes: `provider_availability.status = 'accepting_orders'` for the doctor's account id) counts without a free slot, `next_slot_at` = now. Never for clinic or home visit.
- `available_within` must be a positive whole number; otherwise 400. Non-public doctors never appear.

Reviewer decisions where the queue text was open: "online and accepting" = the provider app's online toggle (`provider_availability`), not the separate "instant pulse" setting in `provider_accounts.availability`; results are ordered by `next_slot_at`.
