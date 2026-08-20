# منصة نبض — Phase 14: معالجة عقود Provider المؤكدة

**التاريخ:** 19 أغسطس 2026  
**الفرع الحاكم:** `manus/on-live-reconciliation`  
**رأس الأساس قبل التزام هذه الدفعة:** `7483dddc849cc736c42c7fae01568333b7766812`  
**الحالة:** **FIX source-level / FAIL-CLOSED where no contract exists**. لا يوجد نشر أو تفعيل تشغيلي في هذه الدفعة.

## نطاق الدفعة

تبدأ هذه المعالجة من المرشحات المؤكدة في Phase 13، لا من افتراض ميزات جديدة. تم إصلاح المسارات التي يثبت لها عقد Backend، واحتواء كل سطح لا يملك schema أو ownership أو controller مثبتاً. لا يعد أي سطر أدناه دليلاً على E2E أو BOLA أو موافقة قانونية أو تفعيل سريري.

| المعرف | المشكلة المثبتة | المعالجة | النتيجة |
|---|---|---|---|
| `P14-LEGAL-01` | `ContractModal` كان يرسل `POST /legal/accept/provider_agreement` مع body غير معتمد (`version`) رغم أن Backend يقبل key في المسار ويستمد النسخة خادمياً. | أبقي تحميل النسخة من `GET /legal/policy/provider_agreement?lang=…`، وحوّل القبول إلى `POST /legal/accept/provider_agreement` بلا body؛ يبقى الزر disabled بلا نسخة قانونية ولا يظهر success إلا بعد رد الخادم. | FIX |
| `P14-NURSING-01` | NursingDashboard استهلك `/home-care/visits` و`/home-care/visits/:id/respond`، بينما عقد الدور والملكية والحالة موجود تحت `/nursing/visits`. | توحيد GET/POST إلى `/nursing/visits` و`/nursing/visits/:id/respond`؛ الخادم يفرض ownership وانتقال `NEW_REQUEST → CONFIRMED`. | FIX source-level |
| `P14-NURSING-02` | حفظ SOAP كان يرسل `/home-care/notes` بــ`patient_id` فقط، مع أن عقد `POST /nursing/notes` يتطلب patient وbooking وprovider ownership. | احتواء الحفظ fail-closed؛ لا request ولا toast نجاح إلى أن يثبت consumer للـpatient/booking المملوكين. | FAIL-CLOSED |
| `P14-CHAT-01` | DoctorChatTab استخدم `/chats/provider` و`/chats/:id/messages` وحمولة `text` غير متطابقة. | ربط القائمة بـ`/chats/threads` والرسائل بـ`/chats/threads/:threadId/messages` وحمولة `{ body }`؛ refresh بعد الحفظ الخادمي فقط. | FIX source-level |
| `P14-CHAT-02` | PreVisitChat أرسل إلى `/provider/chat/send` بلا Controller أو thread/participant contract. | استبدال السطح بحالة fail-closed صريحة؛ لا رسائل أو مرفقات أو إرسال محلي. | FAIL-CLOSED |
| `P14-PHARM-01` | ExpiryTrackingScreen استهلك `/pharmacy/inventory/expiry` غير الموجود، ثم كان يعرض «لا أصناف قاربت على الانتهاء» ونافذة أمان محلية. | استبدال السطح بحالة fail-closed؛ لا عناصر أو status أو safety window حتى عقد inventory owned/audited موثق. | FAIL-CLOSED |

## بوابات الانحدار والبناء

| البوابة | النتيجة |
|---|---|
| `CI=1 npx tsc --noEmit` | PASS |
| `CI=1 npm test -- --runInBand` | PASS — suite واحدة، 30 اختباراً، بما فيها قانون الاتفاقية، مسارات التمريض، دردشة الطبيب، احتواء expiry وSOAP. |
| `CI=1 npx expo export --platform web` | PASS |
| فحص static للمسارات الراكدة المحددة | PASS — لا `/home-care/visits` أو `/home-care/notes` أو `/provider/chat/send` أو `/chats/provider` أو `/pharmacy/inventory/expiry` أو body version القديم. |
| سلامة الأرشيف | PASS — `unzip -tq` نجح ولا يحتوي `node_modules` أو `dist` أو `coverage` أو `.expo`. |

## الأرشيف الناتج

| الأرشيف | SHA-256 |
|---|---|
| `NabdProvider-provider.zip` | `a89fe6379ad2587a8eeff75c1e0a08368fefc3cbe6c935750996c2bc35188c40` |

## الحدود والمرحلة التالية

يتطلب تفعيل SOAP وPreVisitChat وExpiryTracking عقداً كاملاً يتضمن schema والدور والـBOLA وانتقالات الحالة والتدقيق والاختبار في Sandbox. تظل هذه الأسطح fail-closed، ولا يجوز تحويلها إلى success محلي أو mock data. ويظل حكم الإطلاق **NO-GO** إلى أن تكتمل الدفعات المصدرية الباقية ثم Phase 15 وحزم المراجع وPhase 16 بإذن نشر منفصل.
