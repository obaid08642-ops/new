# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `audit-artifacts/MOBILE_P1_EXECUTION_PLAN_20260822.md`
- **Member SHA-256:** `994942511cf8758a38d3fee934f8237de37a49bb2a631da45f91b9e8f16c6fcc`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | MLOG-007 | `src/services/HttpClient.ts:16-45` | retry شامل لأخطاء الشبكة/5xx يشمل POST/PUT/PATCH/DELETE بلا مفتاح إعادة | قصر retry على GET/HEAD؛ mutation لا يُعاد إلا عبر سياسة مورد عقدية ومفتاح مستقر محفوظ بأمان | POST شبكة فاشلة: لا مح`
- `17: | MSEC-011 | `src/services/SyncManager.ts:16-77` و`src/utils/offlineQueue.ts:12-49` | queue نصي غير مشفر بلا TTL ويحتفظ بالمحتوى/المستلم | إيقاف حفظ الرسائل/المرفقات الحساسة نصياً؛ استخدام مخزن مشفر متاح أو عدم وضعها في الطابور؛ TTL وحجم أق`
- `18: | MSEC-014 | `app/(auth)/register.tsx:175-184` | كلمة المرور تمر في params إلى OTP | إنشاء `RegistrationTransactionContext` داخل الذاكرة؛ route يحمل `transactionId` فقط، أو عقد server-side transaction | serialised route لا يحتوي password؛ O`
### backend_consumers_or_contracts
- `15: | MDATA-008 | `src/services/HttpClient.ts:33-45` | mutation غير المتصل يرجع `queued:true` في مسار نجاح Axios | رفض الطلب بـ`OfflineMutationPendingError` أو إرجاع discriminated result لا يطابق DTO النجاح؛ الواجهة تعرض pending | Offline POST `
- `27: | B | ApiContractError ومنع نجاح JSON/Offline المصطنع | لا يعتمد على الباك إند الجديد | اختبارات Axios/fetch لكل فشل عقدي وشبكة |`
### auth_ownership
- `9: | MSEC-001 | `src/utils/api.ts:13-40` | قراءة/كتابة access token في `AsyncStorage` عند فشل SecureStore | استبدال `getToken` و`saveToken` بخدمة tokens تفشل بشكل آمن على iOS/Android؛ تمسح المرآة القديمة عند أول تشغيل ولا تكتب token في التخزين`
- `10: | MSEC-005 | `utils/api.ts:19-45,118-122` | عميل API بديل يعود إلى AsyncStorage لرمزي access/refresh | توحيد العميلين أو حظر العميل القديم؛ منع fallback للرموز ومنع مسارات موازية للتخزين | فحص ساكن لمنع `AsyncStorage` مع مفاتيح token واختبا`
- `11: | MSEC-016 | `src/utils/security.ts:9-49` | غلاف `secure*` يعيد البيانات إلى AsyncStorage عند فشل التخزين الآمن | إبقاء AsyncStorage للويب غير السرّي فقط؛ على الجوال إرجاع `SecureStorageUnavailableError` ومسح أي token قديم | اختبار iOS/Andr`
- `16: | MSEC-009 | `src/services/SyncManager.ts:5-29,61-65` | حفظ headers كاملة بما فيها Authorization في AsyncStorage | تجريد headers إلى allowlist قبل الحفظ؛ لا Authorization/Cookie/PHI؛ مصدر token يحقن عند إعادة التشغيل من SecureStore | اختبار`
- `17: | MSEC-011 | `src/services/SyncManager.ts:16-77` و`src/utils/offlineQueue.ts:12-49` | queue نصي غير مشفر بلا TTL ويحتفظ بالمحتوى/المستلم | إيقاف حفظ الرسائل/المرفقات الحساسة نصياً؛ استخدام مخزن مشفر متاح أو عدم وضعها في الطابور؛ TTL وحجم أق`
- `18: | MSEC-014 | `app/(auth)/register.tsx:175-184` | كلمة المرور تمر في params إلى OTP | إنشاء `RegistrationTransactionContext` داخل الذاكرة؛ route يحمل `transactionId` فقط، أو عقد server-side transaction | serialised route لا يحتوي password؛ O`
- `19: | MSEC-015 | `app/(auth)/otp.tsx:101-110` | guest conversion يرسل `Password@123` افتراضياً | إزالة fallback كلياً؛ طلب كلمة مختارة تحقق سياسة أو exchange token من الباك إند | غياب كلمة/رمز conversion يرفض قبل الشبكة؛ لا يظهر literal المحظور`
- `20: | MDATA-017 | `app/_layout.tsx:65-69` | فشل re-auth يصنع `guest_user` و`guest_token` بدور patient | استبداله بحالة `offlineUnauthenticated` بلا token ولا user، وتقييد التنقل إلى واجهات عامة وإظهار reconnect | فشل re-auth لا يرسل auth dispat`
- `26: | A | خدمة token موحدة، إزالة fallbacks، حالة offlineUnauthenticated، كلمة المرور في التسجيل/OTP | لا يعتمد على الباك إند الجديد | اختبارات الوحدة + typecheck + فحص ثابت لمفاتيح token وكلمة المرور |`
### state_transitions
- `11: | MSEC-016 | `src/utils/security.ts:9-49` | غلاف `secure*` يعيد البيانات إلى AsyncStorage عند فشل التخزين الآمن | إبقاء AsyncStorage للويب غير السرّي فقط؛ على الجوال إرجاع `SecureStorageUnavailableError` ومسح أي token قديم | اختبار iOS/Andr`
- `12: | MDATA-002 | `src/utils/api.ts:160-164` | فشل `response.json()` بعد HTTP ناجح يعاد كـ`{ok:true}` | إرجاع `ApiContractError(code='invalid_response')` أو `Result` فاشل؛ توجيه الشاشة إلى حالة خطأ لا نجاح | استجابة `200` بنص غير JSON ترفض prom`
- `13: | MLOG-007 | `src/services/HttpClient.ts:16-45` | retry شامل لأخطاء الشبكة/5xx يشمل POST/PUT/PATCH/DELETE بلا مفتاح إعادة | قصر retry على GET/HEAD؛ mutation لا يُعاد إلا عبر سياسة مورد عقدية ومفتاح مستقر محفوظ بأمان | POST شبكة فاشلة: لا مح`
- `14: | MLOG-012 | `src/services/SyncManager.ts:19-79` | إعادة تشغيل طابور mutations بصيغة عمياء بلا idempotency أو تأكيد نهائي | استبدال `SyncRequest` بـ`PendingMutation` سماحي: method/path/body آمن، `idempotencyKey`، ttl، resourcePolicy، وعدّاد`
- `15: | MDATA-008 | `src/services/HttpClient.ts:33-45` | mutation غير المتصل يرجع `queued:true` في مسار نجاح Axios | رفض الطلب بـ`OfflineMutationPendingError` أو إرجاع discriminated result لا يطابق DTO النجاح؛ الواجهة تعرض pending | Offline POST `
- `27: | B | ApiContractError ومنع نجاح JSON/Offline المصطنع | لا يعتمد على الباك إند الجديد | اختبارات Axios/fetch لكل فشل عقدي وشبكة |`
- `28: | C | طابور PendingMutation الآمن وسياسات replay | يتطلب تأكيد مصفوفة idempotency في الـOpenAPI الحية قبل تمكين كل مورد | اختبار TTL/header stripping/replay وعدم تكرار الحجوزات والدفع |`
- `29: | D | ربط mutations المتعاقد عليها فقط ومراجعة E2E Sandbox | نشر الـOpenAPI الحية وعقود mutation الفعلية | success/failure/replay لكل مورد وحساب Sandbox فقط |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: | MSEC-016 | `src/utils/security.ts:9-49` | غلاف `secure*` يعيد البيانات إلى AsyncStorage عند فشل التخزين الآمن | إبقاء AsyncStorage للويب غير السرّي فقط؛ على الجوال إرجاع `SecureStorageUnavailableError` ومسح أي token قديم | اختبار iOS/Andr`
- `12: | MDATA-002 | `src/utils/api.ts:160-164` | فشل `response.json()` بعد HTTP ناجح يعاد كـ`{ok:true}` | إرجاع `ApiContractError(code='invalid_response')` أو `Result` فاشل؛ توجيه الشاشة إلى حالة خطأ لا نجاح | استجابة `200` بنص غير JSON ترفض prom`
- `13: | MLOG-007 | `src/services/HttpClient.ts:16-45` | retry شامل لأخطاء الشبكة/5xx يشمل POST/PUT/PATCH/DELETE بلا مفتاح إعادة | قصر retry على GET/HEAD؛ mutation لا يُعاد إلا عبر سياسة مورد عقدية ومفتاح مستقر محفوظ بأمان | POST شبكة فاشلة: لا مح`
- `14: | MLOG-012 | `src/services/SyncManager.ts:19-79` | إعادة تشغيل طابور mutations بصيغة عمياء بلا idempotency أو تأكيد نهائي | استبدال `SyncRequest` بـ`PendingMutation` سماحي: method/path/body آمن، `idempotencyKey`، ttl، resourcePolicy، وعدّاد`
- `15: | MDATA-008 | `src/services/HttpClient.ts:33-45` | mutation غير المتصل يرجع `queued:true` في مسار نجاح Axios | رفض الطلب بـ`OfflineMutationPendingError` أو إرجاع discriminated result لا يطابق DTO النجاح؛ الواجهة تعرض pending | Offline POST `
- `17: | MSEC-011 | `src/services/SyncManager.ts:16-77` و`src/utils/offlineQueue.ts:12-49` | queue نصي غير مشفر بلا TTL ويحتفظ بالمحتوى/المستلم | إيقاف حفظ الرسائل/المرفقات الحساسة نصياً؛ استخدام مخزن مشفر متاح أو عدم وضعها في الطابور؛ TTL وحجم أق`
- `20: | MDATA-017 | `app/_layout.tsx:65-69` | فشل re-auth يصنع `guest_user` و`guest_token` بدور patient | استبداله بحالة `offlineUnauthenticated` بلا token ولا user، وتقييد التنقل إلى واجهات عامة وإظهار reconnect | فشل re-auth لا يرسل auth dispat`
- `26: | A | خدمة token موحدة، إزالة fallbacks، حالة offlineUnauthenticated، كلمة المرور في التسجيل/OTP | لا يعتمد على الباك إند الجديد | اختبارات الوحدة + typecheck + فحص ثابت لمفاتيح token وكلمة المرور |`
- `27: | B | ApiContractError ومنع نجاح JSON/Offline المصطنع | لا يعتمد على الباك إند الجديد | اختبارات Axios/fetch لكل فشل عقدي وشبكة |`
- `28: | C | طابور PendingMutation الآمن وسياسات replay | يتطلب تأكيد مصفوفة idempotency في الـOpenAPI الحية قبل تمكين كل مورد | اختبار TTL/header stripping/replay وعدم تكرار الحجوزات والدفع |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
