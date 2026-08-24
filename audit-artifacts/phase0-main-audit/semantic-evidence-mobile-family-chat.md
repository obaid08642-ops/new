# Semantic evidence — Mobile Family Chat

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/chat.tsx:1–14` is marked `@ts-nocheck` and defines a local message model containing only id/text/sender/time/isMe; no attachment, moderation, delivery, read, edit or deletion state is represented.

The screen loads `/family/chat/messages` and maps either the raw array or `res.data` into local messages (`:34–56`). It loads `/users/me/profile` to infer sender identity and `/family/members` to derive a count, swallowing both failures (`:58–71`). There is no explicit group/member identifier, permission/consent check, or distinct unauthorized/not-found/unavailable state in the UI.

Realtime is not implemented: the screen polls the messages endpoint every five seconds while mounted (`:74–78`). Each send posts only `{ text }` to `/family/chat/messages` (`:80–90`), with no visible idempotency key, client correlation, attachment path, content policy, rate limit, participant membership, or replay protection. After successful transport it appends the response, but if the server omits an ID it fabricates `String(Date.now())` locally (`:90–98`); this can duplicate on retries/reloads. Failure restores the text but exposes no domain-specific error or retry status (`:99–103`).

The UI does include loading, empty and retry-on-load-error states (`:138–164`), but the input remains unavailable only for the broad loadError state and there is no explicit handling of send rejection, forbidden membership, revoked access, stale group, moderation, or message delivery/read status. No Phase 0 remediation was made.
