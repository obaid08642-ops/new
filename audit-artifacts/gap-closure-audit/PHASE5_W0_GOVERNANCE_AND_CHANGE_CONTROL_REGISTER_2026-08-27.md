# Nabd — Phase 5 W0 governance and change-control register

**Status:** active artifacts-only control register
**Date:** 2026-08-27
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Applicable source:** the baseline and any later review branch; the unrelated `quarantine/workstation-source-51a84c7` snapshot remains evidence-limited.

> **W0 purpose.** Prevent additional untraceable or unsafe changes while authoritative root registers, complete application source and contracts are recovered. This register does not authorize edits, runtime tests, migrations, merges or deployments.

## 1. Current W0 decision table

| Control | Required W0 state | Current evidence | Status | Owner required before release |
|---|---|---|---|---|
| Frozen baseline | All reviews declare the exact baseline and never compare an orphan snapshot via normal commit range. | Baseline fixed as `22526bed…`; incoming snapshot has no common ancestor. | `ACTIVE` | Engineering reviewer |
| Branch/PR discipline | One bounded repair card per branch/PR; no direct `main`, squash-only history or force push after review begins. | Required, but no executable repair branch is supplied. | `BLOCKED_INPUT` | Engineering lead |
| Source provenance | Original commit history or verified replay series for incoming work. | 50 claimed hashes unavailable in snapshot Git DB. | `BLOCKED_INPUT` | Workstation/source owner |
| Scope completeness | Provider UI, Admin UI, shared contracts and excluded Mobile config scope are inventoried. | Provider source, Admin frontend and selected contracts/config are absent. | `BLOCKED_INPUT` | Surface owners |
| Root repair cards | Every candidate maps to an authoritative root/subroot with one accountable owner. | The five cited inputs are present at verified remote commit `a3f5f388…`; direct revalidation of each baseline source anchor remains required. | `READY_FOR_DRAFTING_AFTER_SOURCE_RECHECK` | Audit owner/Product |
| Feature flags | New/unsafe/unproven capabilities fail closed with accountable flag owner, expiry and removal plan. | Needs route-by-route inspection against complete source. | `NOT_STARTED` | Product + Backend |
| Fake-success prevention | No financial, availability, coverage, clinical or operations result can be produced from local/catch/fallback truth. | Known Pharmacy/Mobile/Web defects are recorded; global proof needs root mapping and source scope. | `PARTIAL` | Backend/Data + surface owners |
| Secrets/config hygiene | No secret in source/log/evidence; config has documented owner and environment scope. | Static audit does not constitute a full secret/config review; Mobile integration config excluded. | `BLOCKED_INPUT` | Security/SRE |
| Logging/PHI redaction | Correlation/audit logs have PHI minimization, access controls and retention policy. | No complete cross-surface verification. | `NOT_STARTED` | Security/Privacy/SRE |

## 2. Mandatory repair-card schema

No product change is eligible until the following card is complete and reviewed. Values in braces are required evidence, not placeholders to be silently omitted.

| Field | Required content |
|---|---|
| Card and root | `{root_id}/{subroot_id}`, title, source evidence file/line, current classification and risk rating. |
| Accountable owner | One named Product/Engineering owner; required approvers from Security/Privacy/Clinical/Finance/Payer/Operations. |
| Scope | Exact source paths and intended behavior; non-goals and affected Mobile/Web/Provider/Admin surfaces. |
| Truth and states | Canonical owner for price/stock/slot/coverage/co-pay/payment/result; state machine, allowed transitions, guards, expiry, cancellation and compensation. |
| Contract | HTTP/event method, path, version, request/response schema, error taxonomy, idempotency/replay keys and correlation ID. |
| Identity/access | Actor, role, tenant, resource owner, delegation/purpose scope, audit event and notification audience. |
| Data | Canonical schema/identifier, migration/backfill/rollback/reconciliation plan and privacy classification. |
| UX | Exact CTA, next state, loading/empty/error/retry/blocked states, locale/RTL/a11y and deep-link handling. |
| Tests | Unit, contract, DB/Redis integration, isolated external sandbox and E2E success/failure/owner/stranger/unauth/replay/concurrency cases. |
| Rollout | Feature flag state/owner/expiry, monitoring/alert, rollback/kill switch and evidence artifact paths. |
| Disposition | `OPEN`, `BLOCKED_DECISION`, `BLOCKED_INPUT`, `RUNTIME_VERIFICATION_REQUIRED`, `FIXED_AWAITING_REVIEW`, or `CLOSED_WITH_EVIDENCE`. |

## 3. Pre-merge gate for every repair branch

| Gate | Must pass before reviewer can accept a PR | Fails closed when |
|---|---|---|
| Scope gate | Diff maps only to an approved repair card/root; no unrelated generated files or broad refactor. | Root is missing, evidence is generic, or scope expands without owner approval. |
| Contract gate | Exact method/path/DTO/controller/service/schema/state transition documented. | Route mismatch, client-owned truth, missing idempotency or unmodeled state transition. |
| Authorization gate | Auth, role, tenant, ownership/delegation and audit/notification paths are demonstrable. | Any actor can reach a provider/admin/financial/PHI operation on ID knowledge alone. |
| Financial/clinical truth gate | Source of price, stock, slot, coverage, payment and clinical result is server-authoritative and persisted/audited. | Fallback, local state or broad catch represents an operational outcome. |
| Test gate | Deterministic source tests and a defined isolated runtime plan cover the card. | Only a happy path, test total or handoff claim is supplied. |
| Safety/release gate | Secrets/redaction/migration/flag/rollback/observability impacts reviewed. | Missing owner or runtime evidence for a high-risk flow. |

## 4. Known W0 blocking candidates from the incoming snapshot

These are not replacement root IDs; they must be mapped to the authoritative root register once supplied.

| Candidate | Evidence-backed condition | W0 disposition |
|---|---|---|
| `SNAP-PHARM-001` | Payment intent authorization reads `patient_id`, whereas PharmacyOrder persists `patient_account_id`. | `OPEN — do not expose pharmacy card payment`. |
| `SNAP-PHARM-002` | Offer selection creates state before an unchecked conditional broadcast lock and has no offer ID binding. | `OPEN — do not expose offer confirmation`. |
| `SNAP-PHARM-INS-008` | Pharmacy insurance request uses `patient_id` owner lookup against PharmacyOrder. | `OPEN — do not expose pharmacy insurance request`. |
| `SNAP-INS-AUTHZ-009` | Insurance provider queue/decision lacks explicit provider role/eligibility enforcement. | `OPEN — no provider decision exposure`. |
| `SNAP-WEB-004/005/006/007` | GET-side offer selection, forced Arabic redirect, missing explicit Web COD and insurance journey. | `OPEN — Web pharmacy contract/UX repair required`. |
| `SNAP-MOB-PHARM-009` | Mobile checkout shows payment/insurance choices but drops them from governed create payload. | `OPEN — disable/repair misleading options`. |
| `SNAP-WEB-BOOK-012` | Cash consultation can reach pending payment without a Web payment continuation. | `OPEN — do not expose as confirmed booking`. |
| `SNAP-CHAT-007/008` | Realtime gateway trusts client lifecycle state and uses process-local maps. | `OPEN — no scale/readiness assertion`. |
| Provider/Admin scope | Source not provided. | `BLOCKED_INPUT — no implementation or closure assessment`. |

## 5. Required next intake package

The W0 register cannot advance to root-linked repairs without the following package:

1. Direct source-byte/line revalidation for every root selected for a repair card, using the verified root/mapping inputs recorded in `PHASE5_ROOT_REGISTER_PROVENANCE_AND_STRUCTURAL_VALIDATION_2026-08-27.md`.
2. A complete Provider and Admin frontend source archive, shared contracts and a checksum manifest.
3. Original commit history/replay export if claims are to be attributed to historical commits.
4. Written policy owners for pharmacy COD/insurance/substitution, payment/ledger, PHI/consent, clinical safety, public indexing and external providers.
5. Explicit authorization for an isolated non-production test environment before G3–G5 work begins.

Until that package arrives, W0 is correctly operating as a change-control boundary rather than speculative code remediation.
