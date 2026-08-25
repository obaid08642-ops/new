# Phase 0B semantic evidence — Phase 6 contract drafts spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/phase6-contracts.spec.ts:1–22`

The spec verifies that the Phase 6 contract status is exactly `DRAFT_NOT_ACTIVE`, that the consent scope list does not contain the broad `health:*` scope, and that the draft error registry maps consent and QR inactive contracts to HTTP 501 (`9–15`). It then verifies that requesting consent, QR and emergency-location inactive contracts throws Nest `NotImplementedException` (`17–21`).

This provides a useful fail-closed unit assertion for three named draft contract identifiers. It does not enumerate all draft contracts, prove route/controller exposure is blocked, test authentication/authorization or tenant boundaries, validate the error body/schema and headers, test feature-flag/activation governance, check that deployment configuration cannot activate the drafts, or exercise HTTP/integration behavior. It also does not test emergency-location registry metadata in the first assertion. No code was changed and no build/test/application operation was performed during this read.
