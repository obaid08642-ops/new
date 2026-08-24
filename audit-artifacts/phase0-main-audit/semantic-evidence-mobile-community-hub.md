# Semantic evidence — Mobile Community Hub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/community/hub.tsx:51–67` calls `GET /community/posts?page=1&limit=20` with an optional hard-coded category filter. Failures are logged and only stop loading (`:55–66`), leaving the prior/initial list without a visible retry or error state. The list has no pagination/infinite scroll, refresh control, stale timestamp, deduplication or server cursor. Categories are hard-coded Arabic values (`:38–44`) and are not fetched or localized.

Post cards render response fields directly (`:169–221`) under `@ts-nocheck`, defaulting missing date to “الآن”, comment count/upvotes to zero, and category to “عام”; these fallbacks can make absent data look authoritative. IDs are stringified only for the list key and passed to detail with title (`:171–175`) without identifier validation, not-found/ownership behavior or content moderation status. There are no visible like/upvote, comment, share, report, block, author, pagination or deleted-post states.

Publishing sends `POST /community/posts` with a title derived from the first 80 characters of body and selected category (`:69–87`). There is no visible Idempotency-Key, request ID, auth/guest policy, rate limit, spam/profanity/PHI moderation, attachment handling, consent, draft/retry/duplicate state, or server-generated post ID/status. Success claims the post was sent for moderation and reloads the current page, but does not display the returned moderation state or confirm persistence. The composer text and category are Arabic hard-coded despite no language branch. No Phase 0 remediation was made.
