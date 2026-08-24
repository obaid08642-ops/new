# Semantic evidence — Mobile Settings Feedback

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/feedback.tsx:29–43` posts `{ rating, type, message }` to `POST /support/feedback`, but only checks that message is truthy. Rating range, type allowlist, length, content/PHI moderation, attachment support, locale and contact/reply identity are not validated in the screen. No visible Idempotency-Key, request/ticket ID, ownership, rate-limit, spam protection or duplicate/replay handling exists.

The catch explicitly sets `sent` to true (`:37–40`) even when the API fails, with the comment “show success even if API fails, don't block UX”. The success screen therefore falsely claims the feedback was received and promises a response within 24 hours (`:47–71`) without server confirmation, ticket status, notification linkage or retry. This is a direct false-success finding.

The five feedback types and all labels are hard-coded Arabic (`:45,109–130`) and no localization branch is present. The send button uses an upload icon for feedback (`:161–179`), has no disabled/validation explanation beyond empty text, and no draft/offline recovery. No Phase 0 remediation was made.
