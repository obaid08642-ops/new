# Nabd Plus Phase 0 findings register — v1

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`  
Scope: source audit only; no remediation.

## Confirmed source findings

| ID | Severity | Finding | Direct evidence | Required acceptance condition |
|---|---|---|---|---|
| F-001 | P1 | Patient Web catch-all exports POST/PUT/PATCH/DELETE but effective patient allowlist accepts GET only; mutation capability is therefore absent at this boundary. | `app/api/patient/[...path]/route.ts`; `lib/api/patient-allowlist.ts:46–48` | Decide and document read-only launch or implement each mutation as an explicit contract-tested BFF route; never widen catch-all implicitly. |
| F-002 | P1 | Mobile entry and tabs use `@ts-nocheck`, disabling type safety at auth/navigation roots. | `nabd_plus_patient_app/app/index.tsx:1`; `app/(tabs)/_layout.tsx:1` | Remove or narrowly justify with tracked debt, with typecheck passing for these roots. |
| F-003 | P1 | Mobile `EmailAuthProvider.login` returns access and refresh tokens to the AuthResult caller and supplies fallback identity/role values. | `src/services/auth/providers/EmailAuthProvider.ts:16–34` | Confirm native session contract; remove misleading identity defaults and prove secure storage/propagation and logout revocation. |
| F-004 | P1 | Provider ContractModal falls back to hard-coded legal copy and closes after acceptance failure. | `NabdProvider-provider/src/components/ContractModal.tsx:59–88,113–122` | Legal copy must be server-approved/versioned; acceptance failure must block closure and expose retry. |
| F-005 | P1 | Provider DoctorDashboard has client fallbacks for queue/stats and uses legacy-looking job routes; insurance UI exposes patient/policy information. | `DoctorDashboard.tsx:189–419` | Bind to verified provider contracts, fail visibly on unavailable data, enforce role/ownership/PHI minimization and audit. |
| F-006 | P1 | Provider Nursing surfaces silently convert queue errors to empty state, use fixed distance/fallbacks and include SOS/refund claims needing contract proof. | `NursingDashboard.tsx:80–160,226–232,356–678`; `NursingFieldOps.tsx` | Surface errors distinctly, use server GPS/SOS/refund contracts, and test provider/stranger/unauth/state transitions. |
| F-007 | P1 | Patient Home-care service detail has no provider/address/slot/quote/payment/insurance-cash booking continuation. | `app/[locale]/home-care/services/[serviceId]/page.tsx:11–18` | Provide a complete server-backed journey or mark the capability blocked; no success placeholder. |
| F-008 | P1 | Patient medicine detail has no price/stock/prescription upload/cart/purchase continuation and is deliberately noindex because public entity contract is unreliable. | `app/[locale]/medicines/[medicineId]/page.tsx:16–36,40–64` | Approve public DTO/indexing contract and build real pharmacy continuation before enabling commerce/indexing. |
| F-009 | P1 | Patient prescriptions page is read-only: no detail, upload, renewal/reorder or pharmacy purchase CTA. | `app/[locale]/prescriptions/page.tsx:13–43` | Define prescription lifecycle and connect to verified upload/review/cart/order contracts. |
| F-010 | P1 | Patient Chat thread is read-only in the page and hides message bodies/attachments; send/upload/realtime behavior is not present there. | `app/[locale]/chat/[threadId]/page.tsx:11–12` | Decide supported chat scope and implement/test secure send/upload/realtime if required; verify PHI redaction end-to-end. |
| F-011 | P2 | Patient notification settings are read-only in the page; emergency is visually locked and no update mutation exists. | `app/[locale]/notifications/settings/page.tsx:18–31` | Define supported settings and provide contract-backed update or explicit blocked state. |
| F-012 | P2 | Family page is read-only; add/invite/remove/edit/member-switch actions are absent. | `app/[locale]/family/page.tsx:15–44` | Define family ownership/consent model and implement only approved actions. |
| F-013 | P2 | Insurance page is read-only; claim submission, eligibility/preauthorization and checkout insurance selection are absent. | `app/[locale]/insurance/page.tsx:14–38` | Define insurance decision flow and contracts for each service/payment branch. |
| F-014 | P2 | Diagnostics Labs and Radiology pages are catalog-only in the read source; there is no booking CTA; Radiology detail is explicitly blocked. | `diagnostics/labs/page.tsx:12–26`; `diagnostics/radiology/page.tsx:13–21` | Verify service detail/slot/quote/booking contracts, then enable only tested paths. |
| F-015 | P2 | Medicine detail links back to `/medicine-catalog` while the list source is `/medicines`, requiring route reconciliation. | `medicines/page.tsx:44`; `medicines/[medicineId]/page.tsx:61` | Establish one canonical route and test all locale links/redirects. |

## Verification gaps (not findings yet)

These require source/contract/runtime evidence before classification: all six-locale translation completeness; accessibility labels and keyboard behavior; cache-control and PHI exposure in every helper; exact Backend ownership responses; migration/database evidence; outbox/event delivery; live payment provider settlement/refund; sandbox replay; Docker/CI; and visual parity against every Mobile screen.

## Product decisions required

The owner must decide launch scope for read-only versus commerce; pharmacy prescription acceptance and split-order rules; cash/insurance/payment/refund/expiry; home-care provider versus queue model; chat/realtime scope; family consent; notification update scope; indexing/noindex policy; and whether agent-native payment protocols (x402/MPP/UCP/ACP) are in the launch contract.

## Rule

A finding is not closed by a passing build or by a UI placeholder. Closure requires code evidence, contract evidence, security/ownership tests, state/error tests, locale/accessibility review, and live or approved sandbox evidence where the behavior is transactional.
