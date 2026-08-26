# Patient Web source-review consolidation — 2026-08-26

## Scope and evidence boundary

This is an **evidence-first, source-only consolidation** of the manually completed `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv`. The verified inventory count is **246/246** rows: `3 CONFIRMED_DEFECT`, `1 INSUFFICIENT_EVIDENCE`, `53 STATIC_MATCHED_PARTIAL`, and `189 MISSING_CAPABILITY`. The count closes only the **manual source-review inventory**. It does not prove runtime behavior, backend reconciliation, data ownership, production security, financial correctness, clinical safety, visual parity, accessibility, performance, SEO readiness, or production readiness.

> **Decision: NO-GO.** Patient Web source inventory closure is not an authorization for remediation, deployment, feature release, data migration, or a production-readiness assertion.

## What source evidence establishes

| Area | Source-level outcome | Material boundary |
|---|---|---|
| Identity, sessions, privacy | OTP/session BFF and protected read pages exist; settings are read-only summaries. | Registration, social/guest paths, recovery, privacy/security/session controls and backend enforcement still require separate evidence. |
| Pharmacy and orders | Catalog, medicines, cart/checkout, orders and prescriptions have source surfaces. | The required pharmacy journey—cart → geo broadcast → offers → patient selection → cash/card or insurance/co-pay decision → fulfillment—is not evidenced end-to-end. |
| Consultations and diagnostics | Doctor discovery, appointment actions, diagnostics lists and catalog detail exist. | Insurance approval/co-pay, authoritative slot/provider/price, payment-confirmation sequencing, call room/waiting states, results and post-care are incomplete or not evidenced. |
| PHI and health | Protected summaries exist for health, vitals, chronic facts, reports, family, prescriptions, reminders and notifications. | Most are read-only. Source does not establish consent, provenance, delegated access, clinical interpretation, alerting, correction or deletion. |
| Content and support | Articles and bookmarks have read/list/detail paths. | Missing or partial moderation, medical-source governance, support, feedback, community, reviews and deep-link resolution are not closed. |
| Feature domains | Many Mobile domains have no localized Web surface. | AI, emergency/SOS, wallet, loyalty, returns, nutrition, maternity, wearables, maps, voice, scans and numerous service flows are `MISSING_CAPABILITY` at the Web source layer. |

## High-priority journey blockers

| Journey contract | Source-review result | Required decision/reconciliation before remediation |
|---|---|---|
| Pharmacy | No evidenced offer-broadcast/selection and insurance settlement chain. | Define authoritative cart, geo scope, offer/substitution/price/ETA, selection lock, payment/COD policy, payer result, co-pay, fulfilment, refund and ledger contracts. |
| Consultation/lab/radiology/home-care | Discovery and selected booking surfaces exist; end-to-end insurance/payment/provider state chains are not fully evidenced. | Define provider/slot lock, price authority, cash-before-confirmation, insurance decision, co-pay payment, confirmation, cancellation/reschedule, call-token/room and result contracts. |
| PHI/family | Read-only pages do not establish delegated authorization or lifecycle control. | Define ownership, guardianship, consent, least privilege, audit, revocation, sharing, export/deletion and retained-data rules. |
| Clinical and emergency | Scores, trends, mental-health reads and emergency contacts are not clinical intervention or escalation workflows. | Define clinical ownership, disclaimers, safe messaging, triage/escalation, incident response, emergency collection and human handoff. |
| Financial domains | Wallet, loyalty, returns and payment-outcome screens are absent. | Establish payment provider/webhook/ledger/reconciliation/idempotency/refund/dispute and accounting ownership contracts. |

## Evidence artifacts and classification discipline

The row-level evidence is preserved in `patient-web-manual-evidence/` and referenced from each tracker row. `MISSING_CAPABILITY` means a specifically searched Web route/CTA/surface is absent in the reviewed source; it does **not** assert a backend endpoint is absent. `STATIC_MATCHED_PARTIAL` means a source surface has an analogous read/navigation role but lacks the required CTA, state, authority or contract proof. `CONFIRMED_DEFECT` remains source-specific. `INSUFFICIENT_EVIDENCE` is retained where source reading cannot establish a required claim.

The completed inventory must not be mechanically converted into a remediation backlog. Each proposed build item must first receive a journey-specific contract pack: exact patient CTA and state, API or socket method/path/payload, backend controller/service/DTO/state transition, ownership enforcement, authoritative decision source, payment/ledger/COD/co-pay state, provider/admin action and notification/result branches.

## Stream boundaries and next controlled step

Patient Mobile is source-reviewed separately at `246/246`, but its findings are not automatically valid Web requirements: Web must correct—not reproduce—Mobile defects. Provider’s prior source read remains unreconciled to backend/runtime and is not production ready. Admin remains a separate manual-review stream. Backend/Data is the shared contract, security, authorization, financial and data-governance owner.

The next allowed work is **contract reconciliation and remediation planning**, after explicit authorization and backend/data-owner decisions. It must remain separate from implementation, builds, runtime tests, migration, merge and deployment. No production readiness claim is justified by this consolidation.
