# Phase 0B semantic evidence — Legal enterprise settlement Excel spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/legal/legal-enterprise.service.excel.spec.ts:1–21`

The test constructs `LegalEnterpriseService` with a mocked database dependency, spies on `settlementData` and supplies one settlement row plus totals/transfers/generated timestamp (`4–10`). It calls `settlementExcel('provider-1')`, loads the returned buffer with ExcelJS, and asserts exactly `Settlements` and `Totals` worksheets, the `Order ID` header, order-1 in the first row and `Gross Total` in the Totals sheet (`12–19`).

This verifies workbook shape and a small column contract only. Since settlementData is mocked, it does not prove source query authorization, provider ownership, tenant scope, date/range validation, settlement arithmetic, commission/VAT/net reconciliation, transfer/payout status truthfulness, duplicate/order completeness, timezone, refund/chargeback handling or concurrent financial updates. It does not test formula-injection, workbook size/resource safety, PII minimization, export authorization/audit/retention, file delivery headers, error behavior, or actual database/ledger integration. No code was changed and no build/test/application operation was performed during this read.
