# Phase 0B semantic evidence — admin-create-quotation.dto.ts

**Archive member:** `src/modules/pharmacy/dto/admin-create-quotation.dto.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–36; full 36-line member covered.

Lines 2–4 import class-validator decorators and class-transformer Type. Lines 6–20 define `QuotationItemDto`: medicineId is required string; quantity is required number with minimum 1; price is required number with minimum 0. There is no integer, finite, precision, currency, maximum, identifier-format or medicine/request ownership validation.

Lines 22–36 define `AdminCreateQuotationDto`: required array of nested QuotationItemDto with transformation/validation; required totalPrice number with minimum 0; optional adminNotes string. There is no nonempty-array rule, duplicate medicine prevention, maximum item count, maximum note length, currency, tax/fee representation, quotation expiry, version/concurrency token, or idempotency key.

**Financial integrity:** totalPrice is client/payload supplied and is not constrained to equal the sum of item quantities × prices. Unit prices are also client-supplied. The DTO does not establish a server-authoritative catalog price, currency, rounding or settlement source, so those must be verified/recomputed in ProcurementService before persistence or payment.

**Authorization/ownership:** DTO contains no target request/pharmacy identifiers and cannot prove that the admin is authorized for the procurement tenant or that each medicine belongs to the request/catalog. Controller/service must bind all resource identity to authenticated context and target request.

**Test implications:** require nonempty/unique items, strict medicine IDs, positive integer quantities, finite bounded money and currency, total recomputation/ignore-client-total, note bounds, quotation expiry/version, target request/pharmacy ownership, admin role/tenant, and exact-once quotation creation/replay tests. No tests executed during this semantic read.
