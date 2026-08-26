# Provider FacilityProfileConfigScreen: manual semantic review

Reviewed `src/screens/facility/FacilityProfileConfigScreen.tsx`, lines 1–120.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-018 | 23–55 | profile GET/PATCH is a useful anchor but source shows no facility-admin role/organization constraint, verified-field separation or moderation lifecycle | enforce entity ownership and field-level permissions; distinguish verified legal identity from editable marketing content |
| P-FAC-019 | 83–89 | website and WhatsApp are persisted from raw input with no client-side validation; client validation is insufficient in any case | server-side URL/phone validation, safe-link rendering, approval and audit needed |
| P-FAC-020 | 91–114 | specialties are selected from static constants and displayed using literal icon values | specialize against approved catalog/capability/licensure, not self-declared values; use approved accessible vector icon system rather than emoji-like literals |
| P-FAC-021 | 74 | profile media is deferred to a KYC/profile media flow but no linked status/action exists in this screen | define media upload, review, ownership, malware scan, retention and public display policy before facility profile is complete |
