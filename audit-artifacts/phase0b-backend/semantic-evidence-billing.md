# Phase 0B semantic evidence — Billing

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/billing/billing.module.ts:2–253`
- `src/modules/billing/billing.service.ts:2–66`

This baseline contains the billing controller, service, schema, ZATCA QR helper and module in one file. `billing.module.ts:27–43` defines EInvoice with generated id, unique invoice_no, booking kind/id, patient, totals, VAT, currency, QR payload and status, but totals/status fields are broadly typed and no compound uniqueness on booking_kind+booking_id is visible. `:45–59` encodes five TLV tags into base64 but does not implement Phase-2 clearance/UBL/cryptographic signing.

`:68–77` obtains invoice sequence through a counters update; `:79–87` maps free-form kind to booking models. `:90–120` returns an existing issued invoice or loads a booking by ID, checks patient/user ownership or `user.role === 'admin'`, derives total from a booking amount field, extracts VAT as inclusive, uses a production env fallback rule for VAT number and creates an invoice; the existing-check and create are separate and no visible transaction/idempotency is present. `:123–129` lists patient invoices/admin invoices. `:131–187` renders a PDF using booking data, including optional patient name and item names/prices; `:189–205` emails invoice totals and masked email using HTML built from invoice values.

`:208–246` exposes invoice issue/read, PDF, email, patient list and admin list. The invoice route is `GET` despite issue-on-read behavior, email is a mutation without visible idempotency, admin list has an admin role decorator, while service ownership recognizes only lowercase `admin` rather than effective roles. `:248–253` registers MailModule and EInvoice.

## Findings candidates

The read supports: duplicate invoice race, client/domain booking amount trust, incomplete ZATCA compliance, free-form booking kind and identifiers, weak role/ownership mismatch, PDF/email PII/HTML escaping, and missing invoice lifecycle/audit/retention/reconciliation. The separate `src/modules/billing/billing.service.ts` member was read in the earlier finance baseline slice and is not conflated with this embedded module service.

No product code was changed and no tests/builds were executed during this semantic read.
