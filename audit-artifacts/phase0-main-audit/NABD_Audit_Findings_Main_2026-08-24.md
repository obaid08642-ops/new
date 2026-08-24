# Nabd Plus — Main Root Audit Findings Register

**Baseline audited:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Audit branch:** `agent/audit-main-contract-inventory`  
**Audit mode:** source and contract traceability only; no feature remediation, deployment, migration, payment activation, or production mutation.

## Executive verdict

> **NO-GO for a 100% production-readiness claim.**

The baseline contains broad source coverage and many real backend routes, but the evidence does not prove that every Mobile/Web/Provider/Admin action maps to one authoritative route, schema, owner rule, state transition, error state, test and live behavior. Multiple P0/P1 findings remain, including provider route/payload drift, high-risk Admin controls, fabricated operational fallbacks, client-authoritative commerce values, incomplete ownership/idempotency evidence, and silent failure paths.

## Severity summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 3 | Release-blocking security, operational or contract risk requiring closure before production claim. |
| P1 | 22 | Material correctness, security, parity, truthfulness or lifecycle gaps. |
| P2 | 4 | Important product/parity or governance gaps; may be scheduled only after launch scope decision. |
| Total | 29 | Confirmed source findings recorded to date. |

## Confirmed findings

The authoritative detailed register is `confirmed-findings-v1.md`; it contains F-001 through F-029 with direct file/line evidence and acceptance conditions. The findings are grouped below for reviewer triage.

### Security, identity and ownership

| IDs | Area | Core risk |
|---|---|---|
| F-001 | Patient Web BFF | Exported HTTP verbs exceed effective GET-only allowlist; mutation reachability is not established. |
| F-003 | Mobile auth | Legacy provider returns access/refresh tokens and fallback identity/role values to caller. |
| F-010, F-018 | Chat | Read/send surfaces and PHI handling, participant ownership, moderation, rate limit and idempotency are not fully proven. |
| F-012, F-013, F-019 | Family/Insurance/Home-care | Consent, ownership, guest policy and insurance decision flow remain unresolved. |
| F-022 | Admin Passkey | 2FA enforcement/recovery/replay/audit lifecycle is asserted but not proven by the page evidence. |
| F-023 | Provider Nursing | Patient PHI and operational actions are exposed through drifted routes and fallback values. |
| F-028, F-029 | User settings/security | Backend mutations exist, but typed DTOs, re-auth/idempotency consistency, optimistic rollback and session identifier reconciliation are not proven. |

### Truthfulness and data integrity

| IDs | Area | Core risk |
|---|---|---|
| F-004, F-005, F-006 | Provider Doctor/Nursing | Hard-coded legal/operational fallbacks, silent failures and unverified SOS/refund claims. |
| F-017 | Mobile Diagnostics | API failure and empty state conflation; client-derived cart price/name fields. |
| F-020 | Admin telemetry | Invalid coordinates become synthetic map positions; failed fetches lack visible retry; localhost fallback exists. |
| F-024, F-025 | Pharmacy parity | Web commerce is read-only/noindex while Mobile uses local cart/cache without complete server reconciliation proof. |
| F-027 | Provider Radiology | Failed inbox becomes empty/zero dashboard; safety data and mutation lifecycle require clinical integrity proof. |
| F-028, F-029 | Settings parity | Web is read-only while backend/Mobile expose security/settings mutations with incomplete contract and failure semantics. |

### Contract, state and end-to-end parity

| IDs | Area | Core risk |
|---|---|---|
| F-007, F-008, F-009, F-014, F-015 | Patient Web | Service detail, prescription, diagnostics booking and medicine route continuity are incomplete or inconsistent. |
| F-016 | Unified booking | Lock TTL is 5 minutes in one service definition versus required 10 minutes; release ownership is not validated. |
| F-018, F-023, F-026, F-027 | Provider operations | Consumer routes/payloads and backend compatibility routes are not fully reconciled; operational lifecycle tests are missing. |

## P0 release blockers

| ID | Blocker | Minimum closure evidence |
|---|---|---|
| F-021 | Admin SLA and emergency kill-switch control plane | Backend role/audit/rollback proof; no hard-coded identity; re-auth/approval/replay protection; failure and rollback tests. |
| F-023 | Provider Nursing route/payload drift and fabricated operational values | Exact method/path/body reconciliation; live 401/404/2xx checks; visible failure states; real selected booking context; provider/stranger/unauth/state tests. |
| F-021 plus F-023 | Operational governance and PHI | Least privilege, audit events, PHI minimization, incident/rollback evidence and no silent fallback of safety-critical data. |

## Verification gaps still open

These are not downgraded to PASS merely because source/index artifacts exist: all six-locale completeness; accessibility labels and keyboard navigation; every imported Provider/Admin screen; cache-control and PHI exposure; exact owner/stranger responses; DTO/schema/repository/migration trace; outbox/event durability; payment settlement/refund; Sandbox replay and cleanup; Docker/CI; visual parity; performance; SEO/indexing policy; and complete end-to-end journeys for cash, insurance and card across every service.

## Required closure rule

A finding can be closed only with: (1) first-party code evidence at a fixed commit, (2) exact contract and schema evidence, (3) authentication/role/ownership tests, (4) state/error/loading/empty/retry tests, (5) localization/accessibility review, (6) live or approved Sandbox evidence for transactional behavior, and (7) a pushed commit whose remote head is verified by `git ls-remote`. A passing build alone is insufficient.

## Current disposition

`OPEN/PARTIAL — NO-GO`. This report is a traceability and risk register, not authorization to build or deploy. Remediation must begin only after Phase 0 review approval and after all `DECISION_REQUIRED` items in `NABD_DECISION_REQUIRED_2026-08-24.md` have owners and explicit decisions.
