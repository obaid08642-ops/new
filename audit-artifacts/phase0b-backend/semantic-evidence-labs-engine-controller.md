# Phase 0B semantic evidence — labs-engine.controller.ts

**Archive member:** `src/modules/labs/controllers/labs-engine.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–100 and 101–158; full 158-line member covered.

## Routes and behavior

`@Controller('labs/bookings')` (line 7) exposes provider/operations routes without visible authentication, role, ownership, or idempotency decorators. `GET /queue` (14–21) requires `lab_id` and returns bookings for that ID in three active statuses, sorted newest first. `POST /:id/respond` (23–40) accepts `accept` and client-supplied `lab_id`, updates matching booking status to `ACCEPTED` or `CANCELLED`, and returns the booking; missing/unauthorized is represented as `BadRequestException`, not a documented 404.

`POST /collect-sample/:id` (42–68) accepts a client barcode token, checks duplicate token uniqueness, then updates any booking by ID to `SAMPLE_COLLECTED`; no booking-to-lab ownership, actor authorization, prior-state check, transaction, or idempotency is visible. `POST /finalize-test/:id` (70–98) accepts arbitrary `metricResults` and `pdfUrl`, writes them and `REPORT_UPLOADED`, and returns `parent_appointment_id`. The comment at lines 91–92 claims an automatic referring-physician callback, but no callback invocation is visible in the method.

`GET /catalog` (100–104) requires `lab_id` and returns all catalog entries for it. `POST /catalog` (106–119) accepts lab ID, test code, names, prices, insurance flag and ranges, then performs an upsert without visible auth, validation, audit, idempotency, or server-authoritative price governance. `GET /wallet` (121–157) requires `lab_id`, computes revenue from `REPORT_UPLOADED` bookings, classifies insurance/cash, applies a hard-coded 15% commission (144), and returns gross/claims/commission/net plus transactions.

## Security and truthfulness findings

**Critical ownership gap:** routes trust client-supplied `lab_id` and raw booking IDs. No authenticated principal or provider/lab ownership check is visible. A caller may potentially read queue/catalog/wallet or mutate a booking belonging to another lab if the identifier is known. Stranger/unauthenticated 404/401 behavior is not established.

**Critical mutation integrity gap:** respond, barcode collection, report finalization and catalog upsert lack visible `Idempotency-Key`, transaction/compare-and-set state guards, or replay tests. Barcode duplicate checking and update are separate operations and are race-prone without a unique index/transaction.

**Critical data-integrity gap:** `metricResults`, `pdfUrl`, prices, insurance and reference ranges are accepted from request body without DTO validation or server-side provenance shown. The controller claims a doctor callback but does not call a service/event; this is a truthfulness defect.

**Financial gap:** wallet derives payout from report status, uses a hard-coded 15% fee, treats insurance claims as immediately approved revenue, and does not show settlement/payment verification, currency, ledger, authorization, pagination, or reconciliation source. This is not evidence of a production-safe financial ledger.

**Error-contract gap:** not-found and unauthorized cases use generic `BadRequestException` messages in mutation routes rather than the contract-required 404 ownership concealment. No explicit rate limits or audit annotations are visible.

**Price/payment/insurance source:** `total_price`, `payment_method`, `test_name_ar`, `updatedAt`, and status are read from `LabCenterBooking`; commission is hard-coded at 15%; no external payment/insurance verification is called in this controller.

**Test implications:** require owner/stranger/unauth route tests; lab membership/role enforcement; strict DTO/schema validation; replay/idempotency; atomic state transitions and barcode uniqueness; report/PDF authorization and malware/content validation; callback/event delivery evidence; ledger-backed wallet reconciliation; pagination and currency semantics.

No product code was changed and no tests were executed during this semantic read.
