# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE14_PROVIDER_CONTRACT_REMEDIATION_20260819.md`
- **Member SHA-256:** `108a525549d6e1b9af0d11e2ae33fcd1d1b4da3eb9cf82b78cfd08bbcd7ddb7e`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | `P14-NURSING-02` | حفظ SOAP كان يرسل `/home-care/notes` بــ`patient_id` فقط، مع أن عقد `POST /nursing/notes` يتطلب patient وbooking وprovider ownership. | احتواء الحفظ fail-closed؛ لا request ولا toast نجاح إلى أن يثبت consumer للـpatient`
- `19: | `P14-PHARM-01` | ExpiryTrackingScreen استهلك `/pharmacy/inventory/expiry` غير الموجود، ثم كان يعرض «لا أصناف قاربت على الانتهاء» ونافذة أمان محلية. | استبدال السطح بحالة fail-closed؛ لا عناصر أو status أو safety window حتى عقد inventory o`
### backend_consumers_or_contracts
- `15: | `P14-NURSING-01` | NursingDashboard استهلك `/home-care/visits` و`/home-care/visits/:id/respond`، بينما عقد الدور والملكية والحالة موجود تحت `/nursing/visits`. | توحيد GET/POST إلى `/nursing/visits` و`/nursing/visits/:id/respond`؛ الخادم ي`
- `16: | `P14-NURSING-02` | حفظ SOAP كان يرسل `/home-care/notes` بــ`patient_id` فقط، مع أن عقد `POST /nursing/notes` يتطلب patient وbooking وprovider ownership. | احتواء الحفظ fail-closed؛ لا request ولا toast نجاح إلى أن يثبت consumer للـpatient`
- `19: | `P14-PHARM-01` | ExpiryTrackingScreen استهلك `/pharmacy/inventory/expiry` غير الموجود، ثم كان يعرض «لا أصناف قاربت على الانتهاء» ونافذة أمان محلية. | استبدال السطح بحالة fail-closed؛ لا عناصر أو status أو safety window حتى عقد inventory o`
- `28: | فحص static للمسارات الراكدة المحددة | PASS — لا `/home-care/visits` أو `/home-care/notes` أو `/provider/chat/send` أو `/chats/provider` أو `/pharmacy/inventory/expiry` أو body version القديم. |`
### auth_ownership
- `10: تبدأ هذه المعالجة من المرشحات المؤكدة في Phase 13، لا من افتراض ميزات جديدة. تم إصلاح المسارات التي يثبت لها عقد Backend، واحتواء كل سطح لا يملك schema أو ownership أو controller مثبتاً. لا يعد أي سطر أدناه دليلاً على E2E أو BOLA أو موافقة `
- `15: | `P14-NURSING-01` | NursingDashboard استهلك `/home-care/visits` و`/home-care/visits/:id/respond`، بينما عقد الدور والملكية والحالة موجود تحت `/nursing/visits`. | توحيد GET/POST إلى `/nursing/visits` و`/nursing/visits/:id/respond`؛ الخادم ي`
- `16: | `P14-NURSING-02` | حفظ SOAP كان يرسل `/home-care/notes` بــ`patient_id` فقط، مع أن عقد `POST /nursing/notes` يتطلب patient وbooking وprovider ownership. | احتواء الحفظ fail-closed؛ لا request ولا toast نجاح إلى أن يثبت consumer للـpatient`
- `17: | `P14-CHAT-01` | DoctorChatTab استخدم `/chats/provider` و`/chats/:id/messages` وحمولة `text` غير متطابقة. | ربط القائمة بـ`/chats/threads` والرسائل بـ`/chats/threads/:threadId/messages` وحمولة `{ body }`؛ refresh بعد الحفظ الخادمي فقط. | F`
### state_transitions
- `14: | `P14-LEGAL-01` | `ContractModal` كان يرسل `POST /legal/accept/provider_agreement` مع body غير معتمد (`version`) رغم أن Backend يقبل key في المسار ويستمد النسخة خادمياً. | أبقي تحميل النسخة من `GET /legal/policy/provider_agreement?lang=…`،`
- `15: | `P14-NURSING-01` | NursingDashboard استهلك `/home-care/visits` و`/home-care/visits/:id/respond`، بينما عقد الدور والملكية والحالة موجود تحت `/nursing/visits`. | توحيد GET/POST إلى `/nursing/visits` و`/nursing/visits/:id/respond`؛ الخادم ي`
- `19: | `P14-PHARM-01` | ExpiryTrackingScreen استهلك `/pharmacy/inventory/expiry` غير الموجود، ثم كان يعرض «لا أصناف قاربت على الانتهاء» ونافذة أمان محلية. | استبدال السطح بحالة fail-closed؛ لا عناصر أو status أو safety window حتى عقد inventory o`
- `39: يتطلب تفعيل SOAP وPreVisitChat وExpiryTracking عقداً كاملاً يتضمن schema والدور والـBOLA وانتقالات الحالة والتدقيق والاختبار في Sandbox. تظل هذه الأسطح fail-closed، ولا يجوز تحويلها إلى success محلي أو mock data. ويظل حكم الإطلاق **NO-GO** `
### payment_insurance_relevance
- `29: | سلامة الأرشيف | PASS — `unzip -tq` نجح ولا يحتوي `node_modules` أو `dist` أو `coverage` أو `.expo`. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
