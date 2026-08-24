# Phase 0B semantic evidence — hospital-enterprise.controller.ts

**Archive member:** `src/modules/providers/controllers/hospital-enterprise.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–125; full 125-line member covered.

Lines 2–17 inject HospitalSubEntity, User, Appointment and ProviderProfile models into a controller rooted at `providers/enterprise`. No class-level JWT, role or ownership guard is visible.

Lines 19–47 expose `POST /providers/enterprise/provision-sub-provider` with an untyped body. It accepts hospitalId, branchId, staffUserId, entityType and permissions (lines 20–21), casts IDs directly to ObjectId (lines 24–29), creates an active binding, then separately updates the user parent/branch credentials and auto-sets `verified=true` for `BRANCH_DOCTOR` (lines 33–40). It returns success and binding ID (lines 42–46).

**Critical integrity finding:** the create and user update are two independent writes with no Mongo session/transaction, so partial binding or partial credential mutation is possible. No explicit check proves the caller owns/administers the hospital, that branch belongs to hospital, staff user is eligible, entityType is permitted for the organization, or permissions are allowlisted. The endpoint can therefore become a staff-assignment/privilege-escalation surface if upstream global guards do not protect it. Auto-verification of branch doctors is a trust-boundary transition.

Lines 49–68 expose `GET /providers/enterprise/branch-staff/:hospitalId/:branchId`. It queries active mappings for the supplied IDs and populates `full_name phone email role verified` (lines 54–58), returning these user fields (lines 60–67). No caller identity, role, parent/branch ancestry, pagination, redaction or rate limit is visible. This is a direct PII disclosure risk and permits enumeration if the route is reachable without external guards.

Lines 70–85 expose `POST /providers/enterprise/branch-financials/:hospitalId/:branchId` and require a body `requestorId`; it loads that user and rejects missing users or receptionists. The supplied requestor ID is trusted as authorization context; there is no comparison with authenticated principal, no hospital/branch ownership check, no role allowlist beyond receptionist denial, and no explicit authentication decorator.

Lines 86–100 calculate branch financials by finding branch doctors, converting user IDs to provider IDs, and loading appointments with doctor IDs and status COMPLETED/CONFIRMED. Lines 101–110 sum insurance totals into escrow and cash totals into cash collected. Lines 112–113 define wallet balance as escrow plus all card appointment totals, described as simplified. Lines 115–123 return metrics including SAR amounts.

**Financial truthfulness/integrity:** calculations use appointment `total_price` without visible settlement/refund/discount/tax/currency or payment-capture verification, include CONFIRMED appointments, and define wallet as a hard-coded simplified formula. No deduplication, date range, branch ancestry check, pagination, transaction-consistent snapshot or audit event is visible. `providerModel.find` uses `p.id`, which may be a virtual/string rather than `_id`; this requires verification against the schema and can mis-associate appointments.

**Test implications:** live unauth/owner/stranger/admin/receptionist tests; hospital-branch ancestry and staff eligibility; transaction rollback; replay/idempotency; permission allowlist; auto-verification policy; PII redaction/pagination; requestor-vs-session binding; financial fixture reconciliation with refunds/capture/insurance claims/currency; date and branch filters; duplicate provider ID handling; and audit logs. No tests executed during this semantic read.
