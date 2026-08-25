# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_PHASE1_RECONCILIATION_AR.md`
- **Member SHA-256:** `468d6ce370de6a86f23c483fada6195b520696d21a9d3e8168b8a28e9143d1be`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Mobile route/screen candidate files | 293 |`
- `14: | Web route files (`page.tsx`, `route.ts`, `route.tsx`) | 52 |`
- `20: الجدول الذري القابل لإعادة الإنتاج محفوظ في `WEB_V2_RECONCILIATION_ATOMIC.json` و`WEB_V2_RECONCILIATION_ATOMIC.tsv`. وهو يضم كل candidate route وAPI-call line وallowlist entry، وليس ادعاءً بأن كل سطر يمثل شاشة مستقلة.`
- `34: أي surface له route موثق في `nabd-patient-api-openapi.json` ويمكن تحويله إلى parser مقيد، server wrapper، allowlist إن كان GET، واختبار owner/stranger/unauth؛ يشمل تحسينات القراءة الحالية، وواجهات public catalog/SEO، وبعض profile/health/pre`
- `38: عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/session mutations، media purpose/owner binding، وHealth ID`
- `42: لم يظهر ملف مستقل باسم `72` أو `72 journeys` في target branch. توجد أدلة وخرائط متعددة للـjourneys والـcontract inventory، لكن لا يجوز اعتبارها جدولًا مكتملًا 72/72 قبل توليده من route inventory وMobile API candidates وربطه بمسارات OpenAPI.`
### backend_consumers_or_contracts
- `34: أي surface له route موثق في `nabd-patient-api-openapi.json` ويمكن تحويله إلى parser مقيد، server wrapper، allowlist إن كان GET، واختبار owner/stranger/unauth؛ يشمل تحسينات القراءة الحالية، وواجهات public catalog/SEO، وبعض profile/health/pre`
### auth_ownership
- `28: الموبايل ليس مرجعًا أمنيًا يُنسخ حرفيًا. القراءة المباشرة تؤكد وجود مسارات mutations في Pharmacy وHealth وConsultations وChat وFamily وInsurance وNutrition وغيرها. كما أن التقرير المرفق في main يوثق عيوبًا يجب ألا تنتقل إلى الويب: تخزين tok`
- `34: أي surface له route موثق في `nabd-patient-api-openapi.json` ويمكن تحويله إلى parser مقيد، server wrapper، allowlist إن كان GET، واختبار owner/stranger/unauth؛ يشمل تحسينات القراءة الحالية، وواجهات public catalog/SEO، وبعض profile/health/pre`
- `38: عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/session mutations، media purpose/owner binding، وHealth ID`
- `42: لم يظهر ملف مستقل باسم `72` أو `72 journeys` في target branch. توجد أدلة وخرائط متعددة للـjourneys والـcontract inventory، لكن لا يجوز اعتبارها جدولًا مكتملًا 72/72 قبل توليده من route inventory وMobile API candidates وربطه بمسارات OpenAPI.`
### state_transitions
- `38: عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/session mutations، media purpose/owner binding، وHealth ID`
- `42: لم يظهر ملف مستقل باسم `72` أو `72 journeys` في target branch. توجد أدلة وخرائط متعددة للـjourneys والـcontract inventory، لكن لا يجوز اعتبارها جدولًا مكتملًا 72/72 قبل توليده من route inventory وMobile API candidates وربطه بمسارات OpenAPI.`
### payment_insurance_relevance
- `28: الموبايل ليس مرجعًا أمنيًا يُنسخ حرفيًا. القراءة المباشرة تؤكد وجود مسارات mutations في Pharmacy وHealth وConsultations وChat وFamily وInsurance وNutrition وغيرها. كما أن التقرير المرفق في main يوثق عيوبًا يجب ألا تنتقل إلى الويب: تخزين tok`
### error_empty_loading_retry_cancel
- `28: الموبايل ليس مرجعًا أمنيًا يُنسخ حرفيًا. القراءة المباشرة تؤكد وجود مسارات mutations في Pharmacy وHealth وConsultations وChat وFamily وInsurance وNutrition وغيرها. كما أن التقرير المرفق في main يوثق عيوبًا يجب ألا تنتقل إلى الويب: تخزين tok`
- `38: عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/session mutations، media purpose/owner binding، وHealth ID`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
