# Phase 0B semantic evidence — create-procurement-request.dto.ts

**Archive member:** `src/modules/pharmacy/dto/create-procurement-request.dto.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–30; full 30-line member covered.

Lines 2–4 import class-validator and class-transformer. Lines 6–19 define ProcurementItemDto: required medicineId string; required quantity number with minimum 1; optional notes string. Lines 21–30 define CreateProcurementRequestDto: required array of nested ProcurementItemDto with transformation/validation and optional comment string.

**Positive contract:** Nested items are transformed and validated, medicineId is required as a string, and quantity cannot be less than one under the declared validator. The DTO does not accept a client price or total, which leaves quotation pricing to a later server-side process.

**Missing controls:** No nonempty-array rule, maximum item count, duplicate medicine prevention, integer/finite/upper-bound quantity, identifier format, note/comment length or normalization, priority, delivery constraints, prescription/attachment reference, or source pharmacy/request context. There is no idempotency key or client correlation/version field.

**Authorization/ownership:** The DTO contains no patient/user, pharmacy, facility, or tenant identity. The controller/service must derive requester identity from the authenticated session and bind the request to permitted pharmacy/procurement scope; it must not trust body identity or cross-tenant medicine IDs.

**Truthfulness/state:** Since no price is submitted, creation should persist a request/pending state only and must not imply quotation, availability, reservation, or payment. Server-side catalog validation must confirm each medicine and normalize quantities before persistence. Duplicate/replayed submission must not create multiple procurement requests.

**Test implications:** require owner/stranger/unauth/role tests, nonempty/unique items, integer/finite/bounded quantities, strict medicine IDs, note/comment bounds, catalog availability, tenant binding, attachment authorization if supported, state transition and idempotency/replay tests. No tests executed during this semantic read.
