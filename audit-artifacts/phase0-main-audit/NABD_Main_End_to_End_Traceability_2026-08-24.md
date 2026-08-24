# Nabd Plus — Main End-to-End Traceability Matrix

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Audit branch:** `agent/audit-main-contract-inventory`  
**Rule:** this is a Phase 0 audit artifact. No behavior is changed by this document. `PARTIAL` and `UNVERIFIED` are intentional; they are not production claims.

| Journey family | Patient Mobile entry/actions | Patient Web entry/actions | Backend/API evidence | Required states | Ownership/security | Transaction/tests | Status |
|---|---|---|---|---|---|---|---|
| 1. Consultations / booking / video | Doctor search → slot/booking confirm → payment branch → appointment detail/call | Doctor search/detail → booking form → payment intent/cancel/reschedule/call-token BFF surfaces | Mobile `/care/appointments`; Web `/api/appointments/book`; backend UnifiedBookings and call-token evidence | search, no-match, slot conflict, hold expiry, payment pending/failed, cancel/reschedule, call window | patient session, owner 404, stranger 404, short-lived call token | owner/stranger/unauth; booking replay; lock race; payment expiry/refund; call-token window | PARTIAL / FINDING |
| 2. Pharmacy / medicine / cart / orders | `/medicines`, categories, search/filter, product add/qty, barcode, prescription scan, local cart, checkout/payment/order tracking, reorder/order confirmation | public medicine catalog, medicine detail, authenticated read-only `/cart` and checkout preview, order list/detail/tracking | Mobile checkout/payment/tracking/orders/reorder/order-confirm evidence; Web cart/checkout evidence; backend pharmacy/order/payment routes require exact reconciliation | catalog unavailable/empty, stale cache, prescription required, stock/price change, split order, delivery, cash/card/wallet/insurance, partial basket, cancel/refund, stale tracking | session/cart isolation, PHI prescription protection, server price/stock/payment state, owner order access | cart/order/payment/reorder/approve/reject idempotency/replay, insurance approval, amount mismatch, owner/stranger/unauth | PARTIAL / FINDING |
| 3. Labs / radiology diagnostics | DiagnosticsHub labs/radiology tabs, search/filter/location/insurance/cart/detail/booking actions; reports hub/detail after issuance | Labs and radiology catalog/read pages; detail/booking coverage differs; Web report surface read-only/partial | Mobile labs/radiology and medical reports evidence; Web services/report reads; detail/booking contract needs exact source/live evidence | unavailable vs empty, filters, modality/body part, home visit, detail 404, quote/booking, report unread/critical/share/AI blocked | public catalog versus authenticated booking/PHI, insurance ownership, report owner/share consent | service/detail/booking/cart tests; report owner/mark-read/PHI-share/AI-governance tests; server price/availability; no fake reports | PARTIAL / FINDING |
| 4. Home-care / nursing patient journey | Nursing services/packages, search/filter, provider details, cash/insurance, service info/detail, quick-book and provider/address flow | home-care catalog/detail surfaces; booking CTA/contract coverage incomplete | Mobile nursing service-detail and orders evidence; backend JWT-guarded `/home-care/*`, providers, `/unified-bookings/mine` and transitions | service unavailable, filter/no-match, provider match, address invalid, quote/authorization, prescription-required injection, assigned/en-route/arrived/care/completed/cancelled | JWT patient-only create, owner access, provider assignment, PHI/location | booking idempotency, payment/insurance, transition race, cancellation/refund, event durability | PARTIAL / FINDING |
| 5. Health / prescriptions / insurance / family | Health/vitals, prescriptions, insurance add/update/coverage-check, family invite/scan/join/chat/permissions/member health and orders actions, medical reports | Read-only health/prescription/profile/family/insurance surfaces audited partially | Mobile insurance/family/reports evidence; Web read helpers and backend modules need DTO/ownership/test reconciliation | loading, empty, unavailable, stale, consent, expired/used/revoked invite, permission request, claim/preauth decisions, report share/AI blocked | PHI minimization, delegated family access, owner/stranger 404, audience binding, report share consent | vital/reminder mutation contracts, prescription upload/renewal, insurance eligibility/claim replay, family consent/revoke/audit, report mark-read/share/AI governance | PARTIAL / FINDING |
| 6. Chat / notifications / patient communications | Chat/list/thread and notification/settings surfaces; family chat and support-chat handoffs; send/realtime/attachment behavior requires full trace | Chat thread hides message body/attachments and has no composer; notifications/settings read-only | Backend chat aliases include GET and POST variants; Mobile family chat evidence and coverage/preauth support handoff | unread, empty, blocked, send failure, moderation, attachment, emergency lock, realtime disconnect, membership revoked | participant ownership, PHI, moderation, rate limits, audit | send idempotency, duplicate/replay, attachment scan, mark-read/delete contract | PARTIAL / FINDING |
| 7. Provider / Admin operations | Provider Doctor/Nursing plus Admin dashboards, config, security and role-specific operations | Patient Web is not the operator surface but must not expose operator routes | Provider Nursing route/payload drift; Admin health/analytics/config/passkey evidence; backend home-care roles | queue failure, assignment, check-in, GPS, report, SLA change, maintenance, passkey recovery | role/tenant separation, PHI minimization, least privilege, audit logs | owner/role/replay, kill-switch rollback, WebAuthn recovery, event/outbox, live telemetry | FINDING / UNVERIFIED |
| 8. Offers / map / discovery | Mobile Offers list/detail, Map search/filter/provider sheet and directions | Web offer/map parity and indexability not proven | `/home/offers`, `/offers/{id}`, `/promotions/offers/{id}/providers`, `/providers/map`, `/user/insurance`; typed contract/freshness/eligibility pending | no offers/provider results, stale location, permission denied, expired offer, invalid coordinates, external maps failure | location consent/minimization, provider identity, insurance eligibility, link safety | offer redemption/booking binding, map search freshness, provider/service/price context tests | FINDING / PARTIAL |
| 9. Wallet / financial account | Mobile Wallet hub/cards/topup/transactions/transfer; card/default/topup/ledger actions | Web wallet parity not proven | `/wallet/balance`, `/wallet/cards`, `/wallet/topup`, `/wallet/transfer`, transaction routes; financial reconciliation pending | loading/empty, pending/failed/reversed/refunded, duplicate credit, hosted return, card verification, transfer unknown outcome | wallet/card/beneficiary ownership, PCI/tokenization, step-up/fraud | Idempotency/replay, ledger/webhook settlement, receipt/refund/chargeback, owner/stranger/unauth | FINDING / PARTIAL |
| 10. Support / community / ticketing | Support chat/ticket, Community hub/post detail, feedback/help | Web communication parity not proven | `/support/chat`, `/support/tickets`, `/support/feedback`, `/support/faqs`, `/config`; thread/ticket/post contracts pending | empty versus failure, pending/send failure, moderation, attachment, handoff, ticket status/SLA | participant/post ownership, PHI minimization, attachment access, moderation/audit | send/publish/vote/comment/feedback idempotency, realtime/reconnect, ticket context and escalation tests | FINDING / PARTIAL |
| 11. Settings / rights / localization | Privacy/security/notifications/data/language/about/terms; toggles, password, session revoke, export/delete actions | Patient Web settings remains read-only summary | `/users/me/privacy-settings`, `/users/me/security-settings`, `/users/me/notification-settings`, `/users/me/sessions`, `/users/me/storage`, support deletion; legal/config source pending | defaults, sync failure, rollback, re-auth, export/delete lifecycle, six-locale/RTL | consent/audit/identity assurance, session/device ownership, legal retention | PATCH/POST/DELETE idempotency/replay, password/session invalidation, export/deletion status tests | FINDING / PARTIAL |

## Action-to-contract traceability rules

Every actionable UI control must resolve to one exact backend method/path, request schema, response schema, authorization rule, state transition, error mapping, and test identifier. A navigation target alone is not evidence that a feature works. Local calculations of price, VAT, coverage, distance or state must be treated as previews only unless the server contract confirms them.

## Evidence index

- `semantic-evidence-web-mobile-consultation-parity.md`
- `semantic-evidence-labs-packages-parity.md`
- `semantic-evidence-mobile-diagnostics-hub.md`
- `semantic-evidence-mobile-pharmacy.md`
- `semantic-evidence-web-mobile-pharmacy-parity.md`
- `semantic-evidence-mobile-nursing.md`
- `semantic-evidence-mobile-nursing-service-details.md`
- `semantic-evidence-mobile-pharmacy-checkout.md`
- `semantic-evidence-mobile-pharmacy-payment.md`
- `semantic-evidence-mobile-order-tracking.md`
- `semantic-evidence-mobile-orders-center.md`
- `semantic-evidence-mobile-pharmacy-order-history.md`
- `semantic-evidence-mobile-pharmacy-barcode.md`
- `semantic-evidence-mobile-pharmacy-product-search.md`
- `semantic-evidence-mobile-pharmacy-manual-order.md`
- `semantic-evidence-mobile-pharmacy-rx-order.md`
- `semantic-evidence-mobile-pharmacy-scan-prescription.md`
- `semantic-evidence-mobile-pharmacy-filters.md`
- `semantic-evidence-mobile-pharmacy-compare.md`
- `semantic-evidence-mobile-pharmacy-wishlist.md`
- `semantic-evidence-mobile-pharmacy-chat.md`
- `semantic-evidence-mobile-pharmacist-chat.md`
- `semantic-evidence-mobile-pharmacy-waiting.md`
- `semantic-evidence-mobile-settings-security.md`
- `semantic-evidence-mobile-settings-privacy.md`
- `semantic-evidence-mobile-settings-notifications.md`
- `semantic-evidence-mobile-settings-data.md`
- `semantic-evidence-mobile-settings-language.md`
- `semantic-evidence-mobile-settings-about.md`
- `semantic-evidence-mobile-settings-feedback.md`
- `semantic-evidence-mobile-settings-help.md`
- `semantic-evidence-mobile-settings-terms.md`
- `semantic-evidence-mobile-support-chat-real.md`
- `semantic-evidence-mobile-support-ticket.md`
- `semantic-evidence-mobile-community-hub.md`
- `semantic-evidence-mobile-community-detail.md`
- `semantic-evidence-mobile-wallet-hub.md`
- `semantic-evidence-mobile-wallet-topup.md`
- `semantic-evidence-mobile-wallet-transactions.md`
- `semantic-evidence-mobile-wallet-cards.md`
- `semantic-evidence-mobile-wallet-transfer.md`
- `semantic-evidence-mobile-offers-index.md`
- `semantic-evidence-mobile-offers-detail.md`
- `semantic-evidence-mobile-map.md`
- `semantic-evidence-mobile-pharmacy-reorder.md`
- `semantic-evidence-mobile-pharmacy-order-confirm.md`
- `semantic-evidence-mobile-returns-hub.md`
- `semantic-evidence-mobile-returns-detail.md`
- `semantic-evidence-mobile-returns-new-request.md`
- `semantic-evidence-mobile-reports-hub.md`
- `semantic-evidence-mobile-report-detail.md`
- `semantic-evidence-mobile-report-ai-analysis.md`
- `semantic-evidence-mobile-insurance.md`
- `semantic-evidence-mobile-family-invite.md`
- `semantic-evidence-mobile-family-join.md`
- `semantic-evidence-mobile-family-scan.md`
- `semantic-evidence-mobile-family-permission-request.md`
- `semantic-evidence-mobile-family-chat.md`
- `semantic-evidence-web-cart.md`
- `semantic-evidence-web-checkout-preview.md`
- `semantic-evidence-backend-homecare-compat.md`
- `semantic-evidence-provider-nursing-dashboard.md`
- `semantic-evidence-admin-master-dashboard.md`
- `semantic-evidence-admin-config-portal.md`
- `semantic-evidence-admin-security-passkey.md`
- `backend-booking-contract-inventory.txt`
- `confirmed-findings-v1.md`
- `NABD_DECISION_REQUIRED_2026-08-24.md`

## Current conclusion

No journey family is proven end-to-end production-ready on this baseline. The newly audited Mobile Pharmacy, Community, Wallet, Offers, Map, Support and Settings surfaces remain PARTIAL/FINDING until exact contracts, ownership, state transitions, locale/accessibility review and approved runtime tests exist. The most material blockers are route/payload drift, client-authoritative commerce values, hard-coded/test financial data, unimplemented actions, false-success paths, incomplete ownership/idempotency evidence, silently swallowed failures, unsafe PHI/attachment sharing, fixed legal/security claims, and unresolved product decisions. This matrix must be updated after every future source or live-contract verification.
