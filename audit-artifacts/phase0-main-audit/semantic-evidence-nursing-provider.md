# Semantic evidence — Provider Nursing Dashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

Source: `NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx`.

The navigator exposes home/orders/jobs/drugs/settings tabs and routes for order detail, checklist, check-in, care plan, progress notes, visit report, supplies, pricing/coverage, wallet, chat, insurance requests, working hours, notifications, password, 2FA and devices. The existence of a navigator route is not proof that the underlying contract is implemented.

Lines 80–99 fetch nursing jobs through `/provider/jobs/queue?kind=nursing&status=incoming|active|completed`, convert missing/error responses into an empty `jobs` list at lines 94–96, and therefore conflate load failure with an empty queue. This must be reconciled with the canonical nursing controller and explicit retry/error state.

Lines 128–160 show an emergency nursing request and call `POST /nursing/visits/:id/respond` with `{ accept: true|false }`. Idempotency, role eligibility, ownership/assignment, state transition, rejection semantics and server acknowledgement remain unverified. Lines 135–139 display the patient address and a hard-coded `3.2 KM` distance, which is a confirmed fabricated operational value unless the source object is proven to supply it.

Lines 226 onward begin a provider availability mutation through `/home-care/provider/availability`; exact method, role, persistence, audit, rollback and canonical contract require controller matching. The remainder of the file must be read in ranges before classifying additional actions such as check-in, GPS, QR, notes, reports, supplies, chat and wallet.

Classification at this checkpoint: confirmed source observations only. No remediation or production activation is performed in Phase 0. Final status for each surface must be PASS/FIX/BLOCKED/INCONCLUSIVE with source, contract, actor/ownership, state, data truthfulness, test and deployment evidence.

## Additional evidence from lines 221–734

The availability toggle at lines 226–232 optimistically calls `toggleOnline()` before a POST to `/home-care/provider/availability` and silently swallows failures. This requires server acknowledgement, rollback, idempotency and a canonical contract before operational readiness.

The home dashboard uses empty icon values and symbol characters in statistic cards at lines 258–263. It renders a hard-coded clinical demographic fallback (`age || 70`, male) and client-side price fallback at lines 298–306. These are confirmed truthfulness/UI findings unless the backend contract explicitly guarantees those defaults.

`NursingOrdersTab` calls `GET /nursing/jobs/active` at lines 356–363 without visible loading/error/retry handling and renders generic `Patient`/price/time fields at lines 383–408. The order detail still calls stale-looking `/home-care/bookings/:id/respond` at lines 422–436, while the dashboard calls `/nursing/visits/:id/respond`; this is a confirmed route-drift candidate requiring exact controller matching.

The checklist loads `/provider/nursing/checklist` at lines 507–511 but toggles task completion only in local state at lines 511–548 and then forwards a derived list to the report. Persistence and server acknowledgement are not shown.

`DigitalCheckin` starts GPS polling every five seconds and posts `/home-care/bookings/:id/gps` at lines 575–582, starts transit with the same route at lines 598–609, checks in through `/home-care/bookings/:id/check-in` at lines 611–626, and ends through `/home-care/bookings/:id/visit-report` at lines 665–678. These high-risk location/visit transitions require exact canonical route, consent, retention, ownership, state and idempotency proof. The UI claims automatic patient navigation tracking at lines 649–655; this claim must be backed by an approved location contract.

`CarePlan` begins reading and creating plans through `/home-care/care-plans/:patientId` at lines 696–720. Ownership, minimum-PHI, role, persistence and audit boundaries must be verified before accepting this as an operational screen.

These remain Phase 0 observations only; no remediation or activation is performed.

## Backend comparison evidence

Source: `nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts`.

The controller declares `/home-care/bookings/:id/respond`, `/check-in`, `/gps`, and `/visit-report` (lines 141–179), so those specific paths exist in the inspected baseline. However, `NursingDashboard` also uses `/nursing/visits/:id/respond`, `/provider/jobs/queue`, and `/nursing/jobs/active`; those paths require separate controller matching and cannot be credited from HomeCareCompatController.

The controller protects the module with `JwtAuthGuard` and checks patient/provider access (lines 21–23, 65–72), but the nursing provider predicate includes generic `provider` role/type values (lines 61–64). This is a confirmed authorization-scope candidate because the service domain is nursing; the effective role/type policy must be reconciled with the authoritative security matrix.

The controller creates bookings from client `address` and `payment_method` while taking price from the active service (lines 74–95), which is directionally server-authoritative for price but still requires validation of address structure, payment policy, idempotency, recurrence, insurance and audit requirements.

The controller’s `provider/availability` endpoint reads `available` and `available_now` (lines 209–212), while the dashboard posts `available` at `NursingDashboard.tsx:226–232`; the exact persisted field mapping and rollback behavior need tests.

The controller accepts arbitrary `lat/lng` numbers and writes current GPS to the booking (lines 162–167) without visible consent/retention/rate-limit evidence in this module. This remains a high-risk contract review item, not an automatic PASS.

The controller stores visit-report fields, vitals, notes and completion transitions (lines 170–179) and care plans (lines 183–207), but client code also sends `signature_base64: 'signed'` and derives checklist completion locally. The signature and checklist persistence/verification contract is not established by these source excerpts.

NursingFieldOps has additional confirmed observations: it locally decrements distance every three seconds (lines 42–49), sends fixed coordinates `{ lat: 24.71, lng: 46.67 }` on arrival (lines 89–95), uses local checklist switches (lines 102–116), sends literal `'signed'` rather than a signature artifact (lines 236–241), and promises automatic refund on emergency abort (lines 246–269) without an evidenced financial/refund contract. Its `POST /nursing/visits/:id/:endpoint` dispatcher at lines 64–79 requires route-by-route matching; `transit`, `arrive`, `start-care`, `complete`, and `emergency-abort` are not all declared by HomeCareCompatController.

These are Phase 0 evidence findings only. No code or contract was changed.
