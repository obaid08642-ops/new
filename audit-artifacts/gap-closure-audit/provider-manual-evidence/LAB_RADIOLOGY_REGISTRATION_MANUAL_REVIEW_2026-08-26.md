# Provider LabRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/lab/LabRegistration.tsx` كاملًا، lines 1–1859، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. الملف هو wizard موحد لتسجيل مختبر/أشعة. وجود `ProviderApi` وOTP لا يثبت تحقق الاعتماد أو عدم منح الوصول التشغيلي قبل قرار خادمي موثق.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-REG-001 | 117–137 | navigator يعرّف 7 steps لكن يربط step 5 مباشرة بـ`LStep6` ويتجاوز `LStep5` الموجود؛ ثم يعيد ترقيم warning/signature | single reviewed onboarding state machine and no orphan/duplicated wizard step |
| P-REG-002 | 179–201, 577–601 | Step 1 ينشئ حسابًا ويسجل الدخول قبل KYC، وStep 3 يعيد `start/login` بدل حفظ location; fallback login يسمح بالاستمرار | pending-provider identity without operational privileges; idempotent application creation and server-owned workflow state |
| P-REG-003 | 162–175, 269–284 | screen says SCFHS required but validation does not require or verify `techOfficerScfhs` | server license validation against authorized registry and role/location scope before approval |
| P-REG-004 | 338–459 | required document cards ليست جزءًا من validation؛ picker يسمح أي file type، ثم يرفع CR/MOH دائمًا كـ`image/jpeg` وبأسماء ثابتة | mandatory typed/size-scanned document upload, malware scan, immutable evidence metadata and KYC review; preserve declared MIME/type |
| P-REG-005 | 492–528, 443–452, 1640–1678 | Lab category/accreditation/radiation safety/equipment fields إما لا ترسل أو ترسل كنص؛ RSO document upload معطل commentًا | per-provider-type compliance checklist and verified license/document links, including RSO/equipment certification; no self-attested activation |
| P-REG-006 | 569–600, 650–766 | location step only validates city/address؛ location is optional until end and home coverage/radius/fee/collectors are client-entered with no eligibility proof | address/geocode validation, service-area/policy, real staff/equipment capacity and approved home-service activation |
| P-REG-007 | 726–760, 1069–1117, 1125–1286 | onboarding lets provider freely set home fee, service prices, TAT, bundles/discounts; step-5 bundle builder is unreachable and in-step bundle creation lacks item/price validation | approved catalog/rate/discount governance with payer effectivity, capacity and audit; no client-defined publication |
| P-REG-008 | 816–824, 993–1001, 1640–1661 | test home availability, TAT and per-test/per-scan insurance flags are collected locally but not sent in the structured `step3` body | contract must persist validated service capability, TAT and home/insurance applicability per SKU |
| P-REG-009 | 1291–1523 | schedule has no day/time ordering validation; evening-only path is inconsistent with final validation which always requires morning `openTime/closeTime`; home shift type/evening fields are not exposed in this step | normalized schedule rules, timezone/time-overlap validation, facility resource capacity and effective-date approval |
| P-REG-010 | 1463–1519, 1670–1677 | provider selects insurers/plans locally; structured step2 sends only company IDs, discarding plan selection | insurer network/contract authorization must be server sourced; plans, copay and coverage cannot be self-declared |
| P-REG-011 | 1599–1695 | submission uploads documents again using `application/pdf` irrespective of actual type, calls `step3`, `step2` twice, then sends broad `full_data`; no visible idempotency/application-version guard | single atomic/idempotent application submission with server field allowlist, encryption/retention policy and audit trail |
| P-REG-012 | 1606–1611, 1833–1838 | OTP send error still opens OTP modal; agreement lives in local `agreed` while `termsAgreed` data field is unused | server-issued OTP challenge/rate limit/purpose binding, legal version acceptance, signer authority verification and no submit without delivery/verification evidence |
| P-REG-013 | 1670–1687, 1752–1808 | IBAN/account-holder, signature and signer role are user supplied; no ownership/bank validation or signer authority proof | verified bank-account onboarding, authorized representative validation, signed agreement version and payout hold until approval |
| P-REG-014 | 1810–1830 versus 1541–1546 | success text says account starts receiving orders after review, then claims catalog/prices can be updated immediately; this conflicts with the preceding approval gate | one clear pending-review lifecycle; no operational, catalog or payout entitlement before approval |

## Cross-journey conclusion

The wizard captures useful details but does not prove provider qualification. It provisions/logs in too early, skips an intended step, lets operators self-declare regulated eligibility/pricing/insurer scope, and has non-atomic upload/submission behavior. It must be replaced by a server-owned application and verification process before Lab/Radiology onboarding is production-eligible.
