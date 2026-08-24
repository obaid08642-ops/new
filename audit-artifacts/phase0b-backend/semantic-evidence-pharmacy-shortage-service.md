# Phase 0B semantic evidence — PharmacyShortageService

**Archive member:** `src/modules/pharmacy/services/pharmacy-shortage.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–253 from the baseline archive extraction.

Lines 1–25 define the shortage flag/rejection/medicine/order repositories and role dependencies. Lines 31–40 implement provider shortage reporting: provider role is required and an unapproved pending flag is created from opaque SKU/name/dosage/form/reason inputs.

Lines 42–59 implement admin-created flags. Admin role is required; an approved flag is created, optional SKU causes medicine availability status to become `admin_flagged_shortage`, and reason is persisted. Lines 61–96 implement admin approve/reject/resolve transitions, including medicine availability updates for approved/resolved flags.

Lines 98–103 implement flag listing. Admin-like callers receive unfiltered flags; provider callers are limited to approved admin flags and their own reported flags. Other roles are not explicitly rejected in the visible method. Lines 105–122 implement patient lookup by barcode or active ingredient; availability status other than none returns localized limited-availability messaging.

Lines 128–155 implement automatic rejection triggers. Each rejection writes a log, checks the latest five logs for all rejects, and checks ten rejects in seven days; thresholds set medicine availability to `availability_may_be_limited`. No atomic counter/unique event guard is visible.

Lines 157–173 implement acceptance logging. Acceptance is written as a rejection-log record with type accept; if medicine is auto-limited, status resets to none, while admin_flagged_shortage is preserved.

Lines 175–184 implement admin direct medicine status marking with allowed status union and notes. Lines 190–251 implement admin dashboard analytics: top rejected medicines, cancellation counts based on cancelled orders/items, and daily rejection trends over 30 days. The cancellation loop queries medicines per item and does not visibly verify that an item had a rejection before counting it.

**Auth/ownership:** provider/admin checks on write paths; provider list narrowed by provider ID; patient lookup has no visible actor check because controller supplies JWT patient guard; dashboard/admin direct methods require admin. Some listing role fallthrough is not explicit.

**State transitions:** pending flag → approved/rejected; approved → resolved; medicine availability none/limited/admin-flagged; rejection/acceptance log-driven automatic status changes.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** opaque flag bodies; automatic trigger is non-atomic and may repeat; patient lookup exposes shortage status but controller is session-protected; dashboard cancellation counts appear to count all medicine items in cancelled orders rather than only rejection-linked items; no visible idempotency for report/approve/reject/resolve/logging; admin writes and medicine status updates are not transactional.

**Test implications:** role/owner/stranger/unauth, flag status transitions, provider list isolation, patient lookup, repeated rejection trigger, acceptance reset versus admin flag preservation, dashboard count correctness, and mutation replay. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
