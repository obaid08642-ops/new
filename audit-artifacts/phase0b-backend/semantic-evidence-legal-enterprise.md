# Phase 0B semantic evidence — Legal Enterprise

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/legal/legal-enterprise.service.ts:2–398`
- `src/modules/legal/legal-enterprise.controller.ts:2–162`

The controller exposes public policy PDF and archive verification, authenticated acceptance PDF, admin commission history/audit log/license-monitor trigger/policy diff, provider settlements (JSON/Excel/PDF), provider insurance matrix, provider SLA, consents, and an internal snapshot method (`legal-enterprise.controller.ts:10–162`). Many routes repeat `@UseGuards(JwtAuthGuard)`; settlement, insurance and SLA routes have no visible role assertion beyond the JWT and user ID. Public policy PDF reads arbitrary policy key and builds a minimal ASCII-safe PDF (`26–41`). Archive PDF is authenticated but service lookup does not visibly enforce that the requester owns the acceptance; archive verification is public (`43–57`).

The service snapshots user identity, role, policy metadata, timestamp and request metadata into an archive with SHA256, while PDF generation strips non-Latin characters and stores `pdf_stored:false` (`legal-enterprise.service.ts:26–77`). Verification recomputes the hash from reconstructed Date values (`96–110`). Commission and audit history store raw before/after values, IP/device and actor information (`112–147`). Settlement data queries orders/ledger with limits, computes commission/VAT/net using config plus fixed 15% VAT, and returns transfers and rows (`149–193`); Excel/PDF exports reproduce those figures (`195–237`).

A daily cron auto-suspends expired provider profiles and writes notifications; warning flags and notification errors are not visibly transactional (`239–284`). Insurance matrix accepts all insurers when no matrix exists, and set accepts arbitrary company arrays without visible validation (`286–306`). SLA reads provider profile/type and a mapped collection, loads all matching jobs for the period, computes rates with denominator `orders.length || 1`, and counts SLA logs without time window (`308–363`). Consent types are hard-coded, set uses `!!body.value` at controller level and catches service errors into a successful-shaped `{ok:false}` response (`365–387; controller:125–138`). Version diff accepts caller-supplied text and compares words, while controller ignores `from_content` (`389–398; controller:140–155`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unauthorized acceptance archive access, legal PDF fidelity loss, raw audit/PII retention, settlement formula/policy drift, auto-suspend/notification inconsistency, insurance fail-open, unbounded SLA, weak consent typing/error status and incomplete version-diff semantics.
