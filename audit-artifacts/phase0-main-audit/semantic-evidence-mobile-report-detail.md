# Semantic evidence — Mobile Medical Report Detail

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/reports/view-report.tsx:62–80` loads `/reports/{id}` only when a route ID exists, parses `res?.data || res`, and renders a generic load error with back navigation. It does not prove owner-scoped access, 401/403/404 distinction, report status/version, mark-read mutation, or retry from the error state.

The screen renders title, facility, date, doctor, report type, critical flag and free-text clinical fields directly from the response (`:115–240`). Missing fields fall back to generic labels or omit sections. Lab categories/tests are rendered by array index (`:216–230`) without typed validation, range/unit/reference-range/abnormality provenance or document integrity checks.

Share constructs a plain-text message containing title, facility/doctor, summary, diagnosis and recommendations, then calls the native OS `Share.share` (`:82–95`). There is no recipient restriction, consent/confirmation, redaction, audit, expiry, watermark, or warning that PHI is leaving the application. Share failures are silently swallowed.

The “AI analysis” CTA routes to `/reports/ai-analysis` with the report ID (`:242–248`). No consent, PHI disclosure, model/provider provenance, prompt/data retention policy, async job/state, result ownership, rate limit, or failure/revocation semantics are present in this screen. No PDF/download action is implemented despite historical comments referring to such behavior. No Phase 0 remediation was made.
