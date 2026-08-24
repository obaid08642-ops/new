# Semantic evidence — Mobile Insurance Coverage Check

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/coverage-check.tsx:13–18` defines four service types locally, with labels/examples and empty icon values. The source comment claims connection to `GET /insurance/coverage-check` (`:1–2,20`), but the actual request is built from a free-text provider name as `service_key` and a local service type (`:30–43`). No typed request/response schema, identifier validation, debounce/rate limit, current policy selection, or explicit authentication/ownership contract is shown.

The checking state renders three completed-looking steps—document verification, network matching and copay calculation—while the code only waits for the single GET response (`:45–57`). This can imply work not independently evidenced by the client. On any request failure it returns to the form and shows a generic alert, losing the distinction between unauthenticated, no policy, insurer unavailable, unsupported service and coverage-engine error (`:30–43`).

Result parsing accepts `covered` or `eligible`, optional copay fields and preauthorization flags (`:61–75`). It displays coverage and percentages, but does not validate ranges or ensure the result corresponds to the current patient policy/provider/service. If preauthorization is required, the CTA navigates to `/support/chat` (`:132–145`) rather than creating or tracking an authorization request; no claim/preauth ID, state lifecycle, consent, or idempotency is present.

The UI presents a free-text provider field and hard-coded category examples (`:171–204`), with no server-backed provider selection or ambiguity handling. No path connects the result to booking/checkout, cash fallback, insurer decision, authorization expiry, or service-specific eligibility. No Phase 0 remediation was made.
