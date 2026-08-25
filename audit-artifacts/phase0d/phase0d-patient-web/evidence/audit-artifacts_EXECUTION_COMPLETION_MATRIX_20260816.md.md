# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/EXECUTION_COMPLETION_MATRIX_20260816.md`
- **Member SHA-256:** `23941c59c99711e629b62effd998883e330cfc8975d49368696793eb6f706f0d`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: | Phase 1.5 — idempotency | **منفذ جزئياً** | الالتزام `d81e6a7`، 26 suites/211 tests، قفل Redis ومفتاح scoped | الحماية ما زالت محدودة بالـroute الذي فُحص؛ refunds/wallet/billing/pharmacy mutations تحتاج مراجعة endpoint-by-endpoint.`
- `31: | Phase 3 — checkout/QR/labs/emergency | **منفذ مصدرّياً، جزئي عقدياً** | الالتزام `9c8c927`، إزالة القيم التركيبية وQR الطبي المباشر | QR verifier/consent، route/location، payment contract وE2E لم تُنفذ.`
- `32: | Phase 4 — pharmacy | **منفذ مصدرّياً، جزئي تشغيلياً** | الالتزام `96cea2b`، checkout/tracking/OCR/bids/reorder | dispatch، inventory، bid acceptance، payment/webhook، delivery وBOLA بحسابين لم تُختبر.`
- `34: | Phase 6 — sensitive contracts | **منفذ حمايةً، غير منفذ كميزات** | الالتزام `a5594f1`، runtime config وmedical-profile fail-closed وQR provider blocked | consent، QR verifier، emergency route/location، error-code registry وschema versioni`
- `36: | استئناف ما بعد Phase 7 | **منفذ مصدرّياً في النطاق المفحوص** | الالتزامان `052ca60` و`e521b57`، توحيد FacilityDashboard وحجب route الموروث، provider 3/3 وiOS export | بقية إثباتات الملكية والصلاحيات تحتاج staging.`
- `44: | المختبر والحجز | `E2E-LAB-01..04` | **غير منفذة على staging** | لا provider account/booking/sample بيانات اختبار وحساب مريض B لإثبات BOLA.`
- `48: | التوطين وإمكانية الوصول | `E2E-I18N-01..03`, `E2E-A11Y-01` | **غير منفذة قبولياً** | لا screenshots لكل لغة ولا iOS/Android UAT أو screen-reader checklist.`
- `58: | emergency route/location | **غير منفذ كعقد** | عدم رسم polyline/ETA؛ اعتماد location consent/retention/schema/service أولاً.`
- `61: | facility staff | **منفذ مصدرّياً في النطاق المفحوص** | تم إصلاح route/list/create/delete وحجب QR/الحفظ/المشاركة الشكلية؛ يلزم E2E ملكية مالك المنشأة.`
- `73: [1]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"`
### backend_consumers_or_contracts
- `12: > نجاح `build` أو اختبارات Jest/Expo المحلية يثبت سلامة المصدر ضمن حدود الاختبار، لكنه لا يثبت اتصال Mongo/Redis/SMTP/SMS/payment/storage، ولا يثبت الملكية بين حسابين، ولا يثبت الأجهزة أو WebSocket أو GPS أو push.`
- `28: | Phase 1 — SEC-01..05 | **منفذ ومثبت محلياً** | الالتزام `88946e1`، OTP/seed/BOLA، backend 25 suites/207 tests في البوابة المرحلية | تشغيل FastAPI/Redis/SMTP/SMS وتدوير R2 خارج Git لم تُثبت.`
- `29: | Phase 1.5 — idempotency | **منفذ جزئياً** | الالتزام `d81e6a7`، 26 suites/211 tests، قفل Redis ومفتاح scoped | الحماية ما زالت محدودة بالـroute الذي فُحص؛ refunds/wallet/billing/pharmacy mutations تحتاج مراجعة endpoint-by-endpoint.`
- `30: | Phase 2 — config/network | **منفذ ومثبت محلياً** | الالتزام `ecb14eb`، CFG-01..07، backend/patient/provider/admin gates | صحة متغيرات staging واتصال REST/WebSocket من origins لم تُختبر.`
- `31: | Phase 3 — checkout/QR/labs/emergency | **منفذ مصدرّياً، جزئي عقدياً** | الالتزام `9c8c927`، إزالة القيم التركيبية وQR الطبي المباشر | QR verifier/consent، route/location، payment contract وE2E لم تُنفذ.`
- `33: | Phase 5 — i18n | **منفذ بنيوياً، جزئي قبولياً** | الالتزام `b88c218`، 1,445 مدخلاً بست لغات، LocalizedText/Alert | مراجعة مترجم طبي، RTL/LTR، overflow، accessibility، API/backend errors والأجهزة الفعلية لم تُغلق.`
- `43: | التهيئة والشبكة | `E2E-CFG-01..03` | **غير منفذة على staging** | لا manifest بيئي مستقل ولا اختبار origins/Socket متصل.`
- `47: | WebSocket | `E2E-WS-01..02` | **غير منفذة على staging** | لم يُثبت handshake من origin مصرح أو رفض impersonation باتصال حي.`
- `65: لم يتم الاتصال بالإنتاج، ولم تُزرع حسابات أو OTP أو payment sandbox، ولم تُنفذ عملية شراء أو استرداد أو webhook أو push أو GPS أو QR scan أو WebSocket حي. كما لم يُدمج الفرع في `main` ولم تُرفع نسخة إلى متجر.`
### auth_ownership
- `28: | Phase 1 — SEC-01..05 | **منفذ ومثبت محلياً** | الالتزام `88946e1`، OTP/seed/BOLA، backend 25 suites/207 tests في البوابة المرحلية | تشغيل FastAPI/Redis/SMTP/SMS وتدوير R2 خارج Git لم تُثبت.`
- `30: | Phase 2 — config/network | **منفذ ومثبت محلياً** | الالتزام `ecb14eb`، CFG-01..07، backend/patient/provider/admin gates | صحة متغيرات staging واتصال REST/WebSocket من origins لم تُختبر.`
- `42: | الهوية و2FA | `E2E-AUTH-01..03` | **غير منفذة على staging** | لا حسابات staging/OTP test sink وأدلة HAR/Redis منقحة.`
- `46: | المزوّد والإدارة | `E2E-PROV-01..04`, `E2E-ADMIN-01` | **غير منفذة على staging** | الاختبارات المحلية لا تثبت provider onboarding أو browser flow أو device push.`
- `65: لم يتم الاتصال بالإنتاج، ولم تُزرع حسابات أو OTP أو payment sandbox، ولم تُنفذ عملية شراء أو استرداد أو webhook أو push أو GPS أو QR scan أو WebSocket حي. كما لم يُدمج الفرع في `main` ولم تُرفع نسخة إلى متجر.`
### state_transitions
- `29: | Phase 1.5 — idempotency | **منفذ جزئياً** | الالتزام `d81e6a7`، 26 suites/211 tests، قفل Redis ومفتاح scoped | الحماية ما زالت محدودة بالـroute الذي فُحص؛ refunds/wallet/billing/pharmacy mutations تحتاج مراجعة endpoint-by-endpoint.`
- `33: | Phase 5 — i18n | **منفذ بنيوياً، جزئي قبولياً** | الالتزام `b88c218`، 1,445 مدخلاً بست لغات، LocalizedText/Alert | مراجعة مترجم طبي، RTL/LTR، overflow، accessibility، API/backend errors والأجهزة الفعلية لم تُغلق.`
- `34: | Phase 6 — sensitive contracts | **منفذ حمايةً، غير منفذ كميزات** | الالتزام `a5594f1`، runtime config وmedical-profile fail-closed وQR provider blocked | consent، QR verifier، emergency route/location، error-code registry وschema versioni`
- `59: | error-code registry | **غير منفذ** | عدم ادعاء اكتمال التوطين الديناميكي؛ اعتماد codes ثابتة وHTTP transitions وi18n keys.`
### payment_insurance_relevance
- `12: > نجاح `build` أو اختبارات Jest/Expo المحلية يثبت سلامة المصدر ضمن حدود الاختبار، لكنه لا يثبت اتصال Mongo/Redis/SMTP/SMS/payment/storage، ولا يثبت الملكية بين حسابين، ولا يثبت الأجهزة أو WebSocket أو GPS أو push.`
- `29: | Phase 1.5 — idempotency | **منفذ جزئياً** | الالتزام `d81e6a7`، 26 suites/211 tests، قفل Redis ومفتاح scoped | الحماية ما زالت محدودة بالـroute الذي فُحص؛ refunds/wallet/billing/pharmacy mutations تحتاج مراجعة endpoint-by-endpoint.`
- `31: | Phase 3 — checkout/QR/labs/emergency | **منفذ مصدرّياً، جزئي عقدياً** | الالتزام `9c8c927`، إزالة القيم التركيبية وQR الطبي المباشر | QR verifier/consent، route/location، payment contract وE2E لم تُنفذ.`
- `32: | Phase 4 — pharmacy | **منفذ مصدرّياً، جزئي تشغيلياً** | الالتزام `96cea2b`، checkout/tracking/OCR/bids/reorder | dispatch، inventory، bid acceptance، payment/webhook، delivery وBOLA بحسابين لم تُختبر.`
- `45: | الصيدلية والتوصيل | `E2E-PHARM-01..07` | **غير منفذة على staging** | لا مخزون/صيدلي/dispatch/payment sandbox/webhook sequence معزول.`
- `60: | storage/OCR/payment/webhook | **جزئي** | المصدر يرسل للمسارات الموجودة، لكن الحجم/النوع/الموافقة والتسوية والويبهوك تحتاج staging.`
- `65: لم يتم الاتصال بالإنتاج، ولم تُزرع حسابات أو OTP أو payment sandbox، ولم تُنفذ عملية شراء أو استرداد أو webhook أو push أو GPS أو QR scan أو WebSocket حي. كما لم يُدمج الفرع في `main` ولم تُرفع نسخة إلى متجر.`
### error_empty_loading_retry_cancel
- `33: | Phase 5 — i18n | **منفذ بنيوياً، جزئي قبولياً** | الالتزام `b88c218`، 1,445 مدخلاً بست لغات، LocalizedText/Alert | مراجعة مترجم طبي، RTL/LTR، overflow، accessibility، API/backend errors والأجهزة الفعلية لم تُغلق.`
- `34: | Phase 6 — sensitive contracts | **منفذ حمايةً، غير منفذ كميزات** | الالتزام `a5594f1`، runtime config وmedical-profile fail-closed وQR provider blocked | consent، QR verifier، emergency route/location، error-code registry وschema versioni`
- `59: | error-code registry | **غير منفذ** | عدم ادعاء اكتمال التوطين الديناميكي؛ اعتماد codes ثابتة وHTTP transitions وi18n keys.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
