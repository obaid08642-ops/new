# Provider NursingRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/nursing/NursingRegistration.tsx` كاملًا، lines 1–1042، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. تسجيل مقدم الرعاية المنزلية يقرر من يمكن إسناد PHI/زيارة منزلية وخدمات سريرية إليه؛ لا تكفي حقل/واجهة أو POST shell لإثبات اعتماده.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-NREG-001 | 147–170, 509–531 | Provider account is created/logged in at step 1 and again at coverage; fallback login advances workflow before KYC/approval | one idempotent pending-application state; no operational session, queues or PHI until verified/approved |
| P-NREG-002 | 250–336, 352–381 | Individual validation requires only SCFHS number; expiry, national ID, selected gender, license/photo files and registry verification are not enforced. Company validation does not require MOH license | registry-backed identity/SCFHS expiry/disciplinary status, role/service credential mapping, company MOH/CR verification and required evidence policy |
| P-NREG-003 | 258–334, 848–855 | `*/*` document picker; any file can be labeled JPEG/PDF; no scan/type/size/virus/expiry/ownership verification appears | secure typed uploads, malware/content scan, source registry confirmation, retention/access control and immutable document evidence |
| P-NREG-004 | 396–491, 867–877 | services and rates are selected from UI without proof of individual competency, company roster, consumables/medication authorization or approved price; final `nursing_services` sends every selected service with `price: 0` | credentialed service capability and centrally approved/effective catalog/rates; staff/skill/equipment/medication authority must govern assignment |
| P-NREG-005 | 495–605 | coverage radius and address can be client-entered, exact map selection is not validated at this step, and account/login repeats; no travel/time/dispatch capacity source | verified base/service area and capacity/travel policy, not a self-asserted radius |
| P-NREG-006 | 610–765, 702–713 | vacation date picker `onChange` is a no-op; shifts have no time validation/conflict/capacity; provider self-selects insurers and plan tiers | persisted availability/calendar with capacity and insured-network plans loaded from authoritative contracting source |
| P-NREG-007 | 717–760, 886–889 | cash-only/insurance choices are client assertions and final payload drops plan selections, retaining only insurer IDs | approved insurer/provider contract + plan/benefit source, decision/co-pay state and cash/card policy; no client-set coverage claim |
| P-NREG-008 | 801–913 | final multi-step `step3`→`step2`→upload→`step2`→submit has no atomic/idempotency/recovery semantics; `sendEmailOtp` failure still opens OTP modal | transactional application submission with idempotency key, verified purpose-bound OTP and stateful recoverable stages |
| P-NREG-009 | 879–905, 973–1029 | signer role, signature, IBAN/account holder are unverified client fields; agreement uses local `agreed` rather than persisted terms version | validated signatory/bank ownership, signed legal document/version/consent evidence, payout held until verification |
| P-NREG-010 | 920, 923, 931, 944–953 | success uses undefined `data.email`; `pricingModel` is read though schema holds `pricingModels`; payment summary has contradictory Arabic value and the cash-only/no-insurance notice conflicts with approved home-care insurance journey | fix confirmed source bugs and make post-submit state truthful: pending review, no claims of accepted service/payment model before activation |
| P-NREG-011 | 30–40, 52–90 | individual and company share one shallow model; company has no branch/team roster, nurse credentials, employment/assignment, supervisor or clinical governance flow | separate entity models and approval workflows for individual nurses versus nursing organizations |

## Cross-journey conclusion

The wizard collects useful fields but does not construct a trustworthy home-care provider. It enables identity before verification, lets UI determine service/price/insurance scope, loses insurer plan data, sends zero service prices in its operational payload, and cannot prove qualification, company staffing, geographic capacity, payer eligibility or legal/payout authority. It is a production blocker.
