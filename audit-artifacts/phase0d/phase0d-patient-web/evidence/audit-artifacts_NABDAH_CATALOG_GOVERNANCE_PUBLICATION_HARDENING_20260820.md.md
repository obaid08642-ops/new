# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_CATALOG_GOVERNANCE_PUBLICATION_HARDENING_20260820.md`
- **Member SHA-256:** `baae9ba028d6fbfbf873f40bfc2b9e8829bde7e2bb6d5fb7d2a2da857c3c26ab`
- **Line count:** 62
- **Read range:** `1-62`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `19: | Lab/radiology/home-care service | `active: true`, not soft-deleted | Same | Same |`
### auth_ownership
- `58: ## Release and owner actions`
### state_transitions
- `6: **Deployment status:** **Not deployed**. This document records a source candidate and local verification only.`
- `12: > A public catalog entity must have `public_eligibility: true` **and** `medical_review_status: "approved"`, in addition to its entity-specific operational state. Search indexing remains separately opt-in through `indexing_eligibility: true``
- `14: | Entity | Required operational state | Public gate | Index gate |`
- `16: | Medicine | Not soft-deleted | `public_eligibility` + approved medical review | Explicit `indexing_eligibility` only |`
- `17: | Provider/doctor | `status: ACTIVE` | Same | Same |`
- `23: The schemas for Medicine, ProviderProfile, Facility, LabService, RadiologyService, and HomeCareService now carry `public_eligibility`, `indexing_eligibility`, `medical_review_status`, `last_reviewed`, and `provenance`. Defaults are false/pe`
- `29: `CatalogPublicationService` materializes `public_catalog_projections` synchronously after an approval decision. The projection contains publication state, indexability, canonical relative path, deep link, sitemap inclusion/last modification`
- `33: The generic ApprovalWorkflow stamps an approved decision with publication eligibility, a medical review timestamp, and `approval_workflow:<requestId>` provenance. It deliberately leaves indexing disabled; a separate, explicitly governed ind`
- `37: `backend/scripts/backfill-catalog-governance.ts` was added. It is dry-run by default and requires both an explicit command and matching confirmation variable to mutate data. Apply mode sets missing governance fields to false/pending and mar`
- `60: Before any deployment, an authorized reviewer must inspect the generated archive, run the migration dry run against the intended environment, approve the resulting legacy-review population, schedule the fail-closed apply in a controlled win`
### payment_insurance_relevance
- `56: Expected test-environment warnings for unconfigured S3 fallback and missing Moyasar webhook secret remained fail-closed and did not affect the governance result.`
### error_empty_loading_retry_cancel
- `23: The schemas for Medicine, ProviderProfile, Facility, LabService, RadiologyService, and HomeCareService now carry `public_eligibility`, `indexing_eligibility`, `medical_review_status`, `last_reviewed`, and `provenance`. Defaults are false/pe`
- `37: `backend/scripts/backfill-catalog-governance.ts` was added. It is dry-run by default and requires both an explicit command and matching confirmation variable to mutate data. Apply mode sets missing governance fields to false/pending and mar`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
