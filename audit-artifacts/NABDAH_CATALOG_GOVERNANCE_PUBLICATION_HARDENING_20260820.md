# Nabdah Plus — Catalog Governance and Public-Projection Hardening

**Date:** 2026-08-20  
**Scope:** Phase 4 of the hardening program  
**Source branch:** `manus/on-live-reconciliation` only  
**Deployment status:** **Not deployed**. This document records a source candidate and local verification only.

## Decision

Public discovery is now **fail-closed**. A medicine, provider, facility, laboratory service, radiology service, or home-care service is no longer publicly discoverable merely because it exists, is active, or is operationally verified.

> A public catalog entity must have `public_eligibility: true` **and** `medical_review_status: "approved"`, in addition to its entity-specific operational state. Search indexing remains separately opt-in through `indexing_eligibility: true`.

| Entity | Required operational state | Public gate | Index gate |
|---|---|---|---|
| Medicine | Not soft-deleted | `public_eligibility` + approved medical review | Explicit `indexing_eligibility` only |
| Provider/doctor | `status: ACTIVE` | Same | Same |
| Facility | `is_active: true` | Same | Same |
| Lab/radiology/home-care service | `active: true`, not soft-deleted | Same | Same |

## Implemented controls

The schemas for Medicine, ProviderProfile, Facility, LabService, RadiologyService, and HomeCareService now carry `public_eligibility`, `indexing_eligibility`, `medical_review_status`, `last_reviewed`, and `provenance`. Defaults are false/pending; therefore new or legacy records do not become public by schema default.

Public read surfaces now apply the gate across medicine list, full-text search, cursor pagination, autocomplete, barcode lookup, categories, filters, comparison, details, alternatives, and hot-cache output. Provider list, map, and public details are similarly gated. Care discovery now gates doctors, specialties, availability lookup, global search, facilities, facility details, and nested similar/associated doctors. SEO/share-link resolution uses the governed source collections and gates medicine, doctor, facility, lab, and home-care targets. Public lab, radiology, and nursing catalogs are also gated.

## Approval projection and audit event

`CatalogPublicationService` materializes `public_catalog_projections` synchronously after an approval decision. The projection contains publication state, indexability, canonical relative path, deep link, sitemap inclusion/last modification time, feed inclusion, and robots metadata. It invalidates scoped public/SEO cache keys and writes a durable `catalog.publication.projected` event.

`SystemEvent` and `EventBusService` now support a sparse unique `idempotency_key`. A replay or race that hits the same key is treated as an already durable command and **does not fan out a second event**. Approval workflow decisions and medicine/provider approve/reject/suspend operations use stable command keys. The public projection is updated for both publication and withdrawal.

The generic ApprovalWorkflow stamps an approved decision with publication eligibility, a medical review timestamp, and `approval_workflow:<requestId>` provenance. It deliberately leaves indexing disabled; a separate, explicitly governed indexing decision is required before a sitemap/indexing projection becomes eligible.

## Migration and rollback

`backend/scripts/backfill-catalog-governance.ts` was added. It is dry-run by default and requires both an explicit command and matching confirmation variable to mutate data. Apply mode sets missing governance fields to false/pending and marks `legacy_backfill_pending_review`, intentionally withdrawing legacy records until human review. Rollback mode only unsets fields on untouched rows with that exact provenance and pending/false state; it cannot reverse a later reviewed decision. The migration has **not** been run against any environment.

| Operation | Required invocation protection | Effect |
|---|---|---|
| Dry run | No mutation flag | Reports missing governance field counts |
| Apply | `--apply` + `CATALOG_GOVERNANCE_MIGRATION_CONFIRM=apply` | Fail-closed backfill |
| Rollback | `--rollback` + `CATALOG_GOVERNANCE_MIGRATION_CONFIRM=rollback` | Only untouched legacy-backfill rows are unset |

## Verification evidence

| Gate | Result |
|---|---|
| Targeted care/lab/publication/event regressions | 3 suites, 22 tests passed |
| Full Backend regression suite | **70 suites, 401 tests passed** |
| Backend TypeScript build | Passed |
| Production deployment | Not attempted |
| Production data migration | Not attempted |
| Backend candidate archive | `nabdah-backend.zip`, SHA-256 `a802f64b8e99765cbbbb44c239f55ca44c25629d621515474812ac42b74e9df7` |

Expected test-environment warnings for unconfigured S3 fallback and missing Moyasar webhook secret remained fail-closed and did not affect the governance result.

## Release and owner actions

Before any deployment, an authorized reviewer must inspect the generated archive, run the migration dry run against the intended environment, approve the resulting legacy-review population, schedule the fail-closed apply in a controlled window, and verify public searches with Sandbox accounts only. No sitemap, external feed, crawler submission, or production cache purge is performed by this source change; the projection records carry the safe metadata required for a future approved publisher.

The next program phase remains language-completeness validation and Mongoose index review with a separate migration/rollback plan.
