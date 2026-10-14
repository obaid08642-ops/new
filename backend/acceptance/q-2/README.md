# Q-2 — patients act in their own pharmacy chat

Queue: `docs/review/OPENCODE_QUEUE.md`, Queue A (base `main`). Run: `cd backend && node scripts/run-acceptance.mjs q-2`.

Required behaviour (HTTP, real controller, real guards, real service, real Mongo models):
- The order's patient can post a message, accept a substitute, reject, and remove the item on their own thread, each with its real effect (message stored as `patient`, allocation item becomes the substitute, thread closed with the right resolution, item removed from the order, events emitted). Content screening still applies to the patient.
- Another patient gets 403 or 404 on all four; nothing changes.
- The thread's pharmacy can still post; accept / reject / remove stay the patient's decisions (pharmacy gets 403). A pharmacy not on the thread gets 403 or 404.

The framework files (`jest.acceptance.config.js`, `scripts/run-acceptance.mjs`, `acceptance/README.md`, `acceptance/DONE`) are byte-identical copies from `fix/audit-2026-09`, because `main` did not have them yet.
