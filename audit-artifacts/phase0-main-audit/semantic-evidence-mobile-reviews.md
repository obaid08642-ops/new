# Semantic evidence — Mobile Reviews

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/reviews/index.tsx:49–81` derives `booking_kind` and `booking_id` from route parameters and posts `/patient-ux/review` with rating, comment, aspects and anonymous flag. The route ID is checked only for non-empty presence; no server-backed booking lookup, ownership/eligibility (completed appointment/order/service), duplicate-review policy, rating/comment bounds, or participant privacy contract is visible.

The mutation has no visible Idempotency-Key, client request ID, version/precondition or replay handling (`:61–76`). Any successful HTTP response sets local `submitted=true` and schedules `router.back()` after 1.5 seconds, without using a returned review ID/status or proving moderation/accepted/pending state. A failure shows a generic alert and does not preserve a retry/result state beyond local form values.

Aspect names and rating labels are hard-coded (`:28–33,132–139`), while comment length/content moderation, profanity/PHI detection, attachment handling, edit/delete/report, provider response, anonymization guarantees and audit visibility are not represented. The screen also accepts a provider/doctor name from route params for display (`:105–107`) without validating it against the booking.

This is not a fabricated-data fallback, but it is an unverified write contract with ownership, replay, eligibility, moderation and truthful status gaps. No Phase 0 remediation was made.
