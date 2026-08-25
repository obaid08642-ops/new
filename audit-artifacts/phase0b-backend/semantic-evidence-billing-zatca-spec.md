# Phase 0B semantic evidence — Billing ZATCA spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/billing/tests/billing-zatca.spec.ts:1–69`

The spec tests `tlvQr` using a local parser (`1–17`). It verifies base64 decodes into tags 1–5, Arabic seller/VAT/ISO date/total/VAT values are emitted, Arabic UTF-8 byte length is used, and an ASCII reference vector has the expected tag-length-value concatenation (`19–55`). It also tests a local inclusive-15% VAT extraction formula for four totals (`57–69`).

This is focused encoding/math coverage, not a complete invoicing contract. The parser itself does not validate base64 alphabet, truncation, duplicate/out-of-order tags, length overflow or trailing bytes (`6–17`). The TLV tests do not cover required-field emptiness, seller/VAT format, VAT registration authority, timestamp validity/timezone, decimal precision/negative/NaN/Infinity/large values, currency, tax category, invoice UUID, cryptographic signing or ZATCA Phase 2 compliance (`19–55`). The VAT tests use a local formula and a small set of values; they do not reconcile server line items, inclusive/exclusive totals, rounding policy, discounts, shipping, zero-rated/exempt cases, refunds, credit notes or database invoice state (`57–69`). No HTTP/auth/tenant/accounting ownership, idempotency, transaction, duplicate invoice, audit trail, PII minimization, QR exposure/access, retention or live ZATCA validation is exercised. No code was changed and no build/test/application operation was performed during this read.
