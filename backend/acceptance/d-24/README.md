# D-24 — doctor chat only inside a booked consultation (owner decision 2026-10-06 item 24)

Run: `cd backend && node scripts/run-acceptance.mjs d-24` (needs `redis-server`; builds and starts `dist/main.js`). `live-server.ts` is part of the spec.

1. No free chat with a doctor: no direct or group thread patient↔doctor; only `POST /chat/threads/booking`. The compat `POST /consultations/:id/messages` may not bypass the rules.
2. Video: text, images, files, voice; open until 72 h after completion.
3. Clinic / home: nothing before completion; after completion text, images and files only (no voice, no call) for 72 h.
4. After the window: read-only; permissions say `can_chat: false` and offer a follow-up booking.
5. `POST /chat/threads/:id/close` and `POST /chat/threads/:id/extend` (thread's doctor only; one extension).
6. Every consultation thread's permissions carry "997".

The 72 h value is the default; it must stay admin-editable (the existing `consultation_followup_hours` system-config key, default changed from 24 to 72, is fine).
