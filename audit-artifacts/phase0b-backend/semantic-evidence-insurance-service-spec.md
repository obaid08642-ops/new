# Phase 0B semantic evidence — InsuranceService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/insurance/insurance.service.spec.ts:1–316`

The spec constructs `InsuranceService` in a Nest TestingModule with mocked company/network/rule/provider/facility/patient models, an empty claim model and mocked AI gateway (`7–61`). It covers `checkCoverage` for no patient insurance, provider/network mismatch, base provider contract with no coverage rules, and a matching service-specific coverage rule with copay/preauthorization (`63–209`). It also verifies that OCR rejects missing/placeholder images, upload rejects missing provider/policy number and persists a supplied policy as unverified through an upsert, stored-policy NPHIES eligibility returns false/true according to mock data with `nphies_live: false`, and savePolicy updates a mocked patient profile (`211–316`).

Positive evidence includes distinction between provider contract and coverage-rule override, rejection of the old simulated OCR placeholder, default-unverified upload, explicit non-live NPHIES marker and basic patient model targeting (`111–208,211–247,250–280,287–313`).

The tests use `any` models and fixtures and do not issue HTTP requests or exercise guards, current-user binding or stranger access (`16–61,63–316`). They do not prove policy ownership/tenant scope, national-ID privacy, policy/claim attachment security, company/network FK and verified-source truth, expiry/retirement, coverage effective dates, currency/rounding/limits, transaction/payment/claim settlement, NPHIES authenticity or fallback safety, OCR size/MIME/consent/retention/prompt-injection controls, cache/public projection, idempotency or concurrent upsert behavior. Coverage tests do not cover facility path, all service types, unsupported inputs or provider data freshness; upload accepts client-provided fields and uses `findOneAndUpdate` without a tested uniqueness/race/verification workflow. No code was changed and no build/test/application operation was performed during this read.
