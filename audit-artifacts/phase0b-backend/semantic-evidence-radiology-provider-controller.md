# Phase 0B semantic evidence — radiology-provider.controller.ts

**Archive member:** `src/modules/radiology/controllers/radiology-provider.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–222; full 222-line member covered.

## Guard and identity wiring

Lines 20–27 define public booking ID query support for Mongo `_id` or public UUID `id`, a controller prefix `radiology/provider`, class-level `JwtAuthGuard`, and `Roles(UserRole.RADIOLOGY, ADMIN, SUPER_ADMIN)`. Lines 29–34 inject center bookings, radiology services, machines and users. Lines 36–42 resolve the provider account by app-level user ID and classify admin roles. Lines 44–53 implement `assertBookingAccess`: missing booking is `BadRequestException`, admins bypass center ownership, non-admins must resolve a center and match `radiology_center_id`, except pending bookings may be claimed.

## Provider queue, response, machine allocation

`GET /queue` (56–71) accepts but ignores `provider_id`; admins receive all active queue statuses, while non-admins receive all pending bookings plus their center's accepted/check-in/scanning bookings. `POST /:id/respond` (73–96) loads by public UUID or `_id`, checks access with pending allowed, validates boolean accept, prevents admins from claiming, assigns the current center on accept, or cancels with a rejection reason, then saves.

`POST /allocate-machine/:id` (98–128) requires machine ID, checks any accepted/check-in/scanning booking using that machine, rejects a conflict unless `conflict.id` differs from the route ID, then updates the target booking using public UUID or `_id` to `CHECKED_IN`. It does not check schedule overlap, machine ownership, machine existence/active status, prior state, idempotency or atomic uniqueness.

## Report upload and wallet

`POST /finalize-scan/:id` (130–160) loads and access-checks the booking, requires report text/PDF URL, then unconditionally throws `legacy_raw_report_upload_disabled_use_secure_storage_flow` at line 140. Lines 142–159 are unreachable legacy code that would accept raw URLs and claim doctor notification; the actual route cannot finalize a report.

`GET /wallet` (162–191) scopes non-admin queries to the current center, includes scanning-completed/report-uploaded statuses, classifies insurance versus cash from booking fields, and computes transactions. It uses `total_price || total`, marks insurance as `INSURANCE_CLAIM_APPROVED` without visible claim verification, and applies a hard-coded 10% deducted commission (184). It returns gross revenue, insurance claims, commission and sorted transactions without currency, ledger, settlement, pagination or reconciliation.

`GET /catalog` (193–196) ignores `provider_id` and returns all active non-deleted radiology services. `POST /catalog/:id` (198–205) is admin-only, allows a limited patch including `price`, and updates by legacy `id` without not-found validation or idempotency/audit/version guard.

## Inventory

`GET /inventory` (207–212) scopes non-admin results by `user.id` and active machines; admins receive all active machines. `POST /inventory` (214–221) rejects admins, requires name/type, creates active inventory under `user.id`, and returns it. No DTO schema, machine type normalization, ownership validation, capacity/schedule, audit, or idempotency is visible.

## Confirmed findings and test implications

Positive evidence: class-level JWT/role guards, center ownership checks on provider booking operations, admin separation for claims/inventory/catalog, and 404/BadRequest distinction as implemented. However, pending queue visibility is intentionally broad and requires abuse review. The report finalization route is hard-disabled while unreachable code still contains raw URL behavior, creating a contract/documentation mismatch. Machine allocation is not atomic and uses mixed UUID/_id comparison. Wallet is a derived hard-coded financial summary with unverified insurance approval and 10% commission. Catalog and inventory mutations lack DTO validation, idempotency, audit, and version/CAS controls.

Require tests for unauth/role matrix, provider owner/foreign center/pending claim, exact 401/403/404 contracts, UUID versus `_id`, machine ownership and time overlap, concurrent allocation, report secure-storage handoff, wallet ledger/insurance reconciliation, catalog not-found and price governance, inventory validation, audit events and replay. No tests executed during this semantic read.
