# Phase 0B semantic evidence — AiService Excel spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/ai/ai.service.excel.spec.ts:1–22`

The spec constructs an XLSX workbook with a `Prescription` worksheet and three Arabic headers, adds one test medicine row, constructs `AiService` with mocked dependencies and verifies `parseExcel` returns success with one item whose `medicine_id` is null, preserving raw name, quantity and notes (`5–15`). It also verifies an invalid non-XLSX buffer returns `{ success: false, items: [] }` (`17–21`).

The test is a parser unit check only. It does not establish catalog matching, medicine identity, quantity bounds, notes size/content safety, duplicate-row handling, formula/macro/external-link rejection, workbook/worksheet/row/cell size limits, MIME/extension validation, decompression-bomb protection, malformed Unicode/localization variants, authorization, upload/storage scanning, PII/PHI redaction, audit/retention/deletion, idempotency, or a safe error reason. `medicine_id: null` demonstrates no catalog resolution in this test and must not be treated as a real product link. No code was changed and no build/test/application operation was performed during this read.
