# Semantic evidence — Mobile Insurance Benefits Summary

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/benefits-summary.tsx:19–25` dynamically imports `apiFetch` and calls `/insurance/benefits-summary`; any failure is silently ignored and `benefits` remains empty. There is no loading, error, retry, unauthenticated, stale or no-policy distinction. The screen is not parameterized by a policy ID or request context.

The aggregate `totalLimit` is hard-coded to `500000` (`:27–29`), while `totalUsed` is reduced from unvalidated `usedAmount` values. The UI computes remaining and percentage locally (`:56–58,62–65`) without checking annualLimit zero/negative values, currency, coverage ranges, policy period, active/expired state, server freshness or reconciliation to the policy displayed on the Insurance Hub.

Benefit fields (`service`, `coverage`, `usedAmount`, `annualLimit`, `remaining`, `usedCount`, `limitCount`, `icon`) render without schema validation or policy/claim source metadata (`:61–110`). No interaction opens service-specific coverage rules, exclusions, preauthorization, claim linkage, provider network or supporting documents.

Renewal text is fixed to “31 December 2024” and claims that all limits reset at renewal (`:114–121`), which is stale/unsupported against the 2026 baseline unless sourced from the server. No expiry/renewal action, policy selection, notification, dispute or audit trail exists. No Phase 0 remediation was made.
