# Provider PharmacyRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/pharmacy/PharmacyRegistration.tsx` كاملًا، lines 1–955، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. هذا التدقيق يقارن onboarding بقاعدة المنتج المعتمدة: طلب المريض يُبث جغرافيًا، وتقدم الصيدليات عروضًا، ويختار المريض عرضًا ثم تكون سياسة Cash/Card/COD/Insurance خاضعة لعقد وقرار خادميين.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-PREG-001 | 146–170 | إنشاء حساب وتسجيل الدخول يحدثان قبل KYC/ترخيص/اعتماد الصيدلية، مع fallback login يسمح بالانتقال | pending application identity with no operational/order/PHI access; server state and idempotent onboarding |
| P-PREG-002 | 192–201 | Head Pharmacist required بالاسم فقط، رغم ادعاء SCFHS؛ لا يوجد license number أو verification | licensed pharmacist record, registry verification, employer/branch relationship and auditable renewal/expiry policy |
| P-PREG-003 | 226–312 | required documents لا تدخل validation؛ أي file type يقبل ثم يرفع CR/MOH/SFDA بوصف `image/jpeg` ثابت | mandatory typed/scanned document intake, provenance/retention/verification and correct MIME handling |
| P-PREG-004 | 337–447, 421–433 | خريطة delivery ثابتة في الرياض (`24.7136,46.6753`) ولا تربط `data.location`؛ لكن final submit يشترط lat/lng | confirmed functional blocker: implement authenticated location capture/geocode; branch geofence and source-of-truth delivery area before broadcast eligibility |
| P-PREG-005 | 368–444 | provider يختار own/app drivers والرادياس بنفسه، ويعرض broadcast كنص فقط؛ لا يوجد verified driver capacity/shift/geo dispatch proof | server-authoritative pharmacy/branch geo eligibility, courier capacity/service window and offer dispatch contract |
| P-PREG-006 | 453–547 | hours accepts arbitrary shift combinations بلا order/timezone/holiday validation؛ vacation picker has `onChange={() => {}}` and undefined `hasNightShift` field | validated availability calendar/effective schedule/holiday closure and truthful pharmacy availability |
| P-PREG-007 | 551–590 | Rx/OTC/categories are self-attested product categories only; no prescription validation, controlled-drug rule, stock/lot/expiry/cold-chain/catalog authority | pharmaceutical catalog/inventory/Rx/controlled medicine contracts and audit; category checkbox is not fulfillment capability |
| P-PREG-008 | 593–687, 741–758 | delivery fee/minimum/express/insurance are provider-entered; plan selections are discarded when submit sends only company IDs; `accepts_cash:true` forced and no card/COD policy | approved rate/fee effective-dating; insurer-network plan authority; explicit Cash/Card/COD policy consistent with pharmacy offer-selection payment flow |
| P-PREG-009 | 690–710 vs 805–823 | UI says profile/fees/categories require admin approval, but no server approval reference/state shown; validate omits license/bank/docs/schedule quality | server approval queue, reviewer decision, no activation/publication before approval, and strict application validation |
| P-PREG-010 | 727–802 | submission calls Step3 then uploads documents, then Step2 twice and submit; no visible transaction/idempotency/application revision | atomic/idempotent server-owned application submit, staged upload references and audit trail |
| P-PREG-011 | 761–794 | uploaded files are forced `application/pdf` independent of actual source; bank account/signer/signature are user supplied without ownership/authority proof | typed secure upload, bank ownership validation, authorized signatory verification and payout hold until approval |
| P-PREG-012 | 825–840, 926–934 | OTP modal opens even if send fails; local `agreed` not `termsAgreed`; email fallback references `data.email` which is not in the declared model | purpose-bound OTP delivery verification/rate limit, versioned legal acceptance, and typed verified contact field; remove invalid fallback |
| P-PREG-013 | 842–844 | success screen receives nonexistent `data.email`, not manager email | confirmed data-model/UI defect; use verified `managerEmail` and pending-approval status, not a false success state |

## Cross-journey conclusion

This wizard cannot establish a trustworthy pharmacy participant for the marketplace. In particular, it does not prove branch location, pharmacist entitlement, delivery capacity, medicine inventory/Rx controls, insurer network, or permissible payment/COD policy. It must be replaced by a server-owned approval and operational-capability model before any pharmacy can participate in broadcast/offers or receive patient data.
