# Phase 0B semantic evidence — InsuranceController

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/insurance/insurance.controller.ts:2–98`

`insurance.controller.ts:16–23` applies `JwtAuthGuard` and `NoGuestsGuard` to the controller. `:25–51` exposes `GET /insurance/active`, loads `PatientProfile` by `user_id=req.user.id`, and returns `insurance_details` as a one-item array when present. The API schema declares `additionalProperties: true` for the policy object, so the full stored insurance object is projected without field-level minimization. The controller does not show explicit identifier validation or an access audit.

`:53–98` exposes `GET /insurance/companies`, requiring authentication and excluding guests, delegating catalog data to `InsuranceService`. The declared response permits additional properties at company and plan levels and does not define an explicit freshness/version/deprecation contract. Both routes depend on the guard stack for auth/ownership; no mutation route is present in this member.

## Findings candidates

The read supports: broad insurance PII projection, weak response schema, authenticated-but-possibly-overbroad catalog access, missing access audit/versioning and mismatch risk between insurance_details and other legacy/editable insurance models.

No product code was changed and no tests/builds were executed during this semantic read.
