# Phase 0B semantic evidence — Review schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/review.schema.ts:1–18`

`Review` is a timestamped schema with generated unique ID, indexed provider and patient IDs, required booking kind/ID, rating constrained to 1–5, optional comment, optional object aspects and status enum (`pending_review|approved|rejected`) defaulting to `approved` and indexed (`4–15`). A unique compound index prevents more than one review per `(booking_kind, booking_id)` (`17–18`).

Rating bounds and compound booking uniqueness are useful baseline controls. However, `booking_kind` is an unconstrained string and the schema does not cross-check that booking ID belongs to the patient, provider, service, completed/eligible state or authorized actor (`7–11,18`). Aspects is a generic object with no bounds despite rating-like fields, and comment has no length, content, PII/PHI, HTML/link, language or moderation policy (`12–13`).

Status has a runtime enum but defaults to approved, with no reviewer identity, moderation reason, transition actor, timestamp, appeal, edit history or audit integrity (`14–15`). No anonymity/public projection, provider response, consent, deletion/retention, abuse/rate-limit, duplicate retry or transaction policy is visible. The unique index is not a substitute for ownership or concurrent eligibility checks. No code was changed and no build/test/application operation was performed during this read.
