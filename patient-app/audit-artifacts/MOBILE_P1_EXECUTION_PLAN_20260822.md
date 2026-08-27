# خطة إصلاح عيوب P1 لتطبيق نبض للمريض

**الغرض:** خطة تنفيذية مستندة إلى سورس `nabd_plus_patient_app.zip` الموجود في `main` وإلى الدليل اليدوي المثبت. لا تدّعي هذه الوثيقة أن أي إصلاح موبايل قد نُفذ أو نُشر.

> **قاعدة تنفيذ:** لا يُعاد أي mutation تلقائياً إلا إذا كان العقد الحي يطلب `Idempotency-Key` وتكون العملية قابلة لإعادة التشغيل، ولا تحول حالة عدم الاتصال أو فشل التحليل إلى نجاح مجال أو جلسة مرضى.

| المعرّف | المسار والخط المثبت | العيب | الإصلاح البرمجي المطلوب | اختبار الانحدار المطلوب |
|---|---|---|---|---|
| MSEC-001 | `src/utils/api.ts:13-40` | قراءة/كتابة access token في `AsyncStorage` عند فشل SecureStore | استبدال `getToken` و`saveToken` بخدمة tokens تفشل بشكل آمن على iOS/Android؛ تمسح المرآة القديمة عند أول تشغيل ولا تكتب token في التخزين النصي | محاكاة فشل SecureStore؛ إثبات عدم استدعاء `AsyncStorage.setItem` لمفاتيح token ومسح المفاتيح القديمة |
| MSEC-005 | `utils/api.ts:19-45,118-122` | عميل API بديل يعود إلى AsyncStorage لرمزي access/refresh | توحيد العميلين أو حظر العميل القديم؛ منع fallback للرموز ومنع مسارات موازية للتخزين | فحص ساكن لمنع `AsyncStorage` مع مفاتيح token واختبار refresh بعد فشل SecureStore |
| MSEC-016 | `src/utils/security.ts:9-49` | غلاف `secure*` يعيد البيانات إلى AsyncStorage عند فشل التخزين الآمن | إبقاء AsyncStorage للويب غير السرّي فقط؛ على الجوال إرجاع `SecureStorageUnavailableError` ومسح أي token قديم | اختبار iOS/Android: فشل `get/set/delete` لا يقرأ/يكتب المرآة النصية |
| MDATA-002 | `src/utils/api.ts:160-164` | فشل `response.json()` بعد HTTP ناجح يعاد كـ`{ok:true}` | إرجاع `ApiContractError(code='invalid_response')` أو `Result` فاشل؛ توجيه الشاشة إلى حالة خطأ لا نجاح | استجابة `200` بنص غير JSON ترفض promise ولا تعرض toast نجاح |
| MLOG-007 | `src/services/HttpClient.ts:16-45` | retry شامل لأخطاء الشبكة/5xx يشمل POST/PUT/PATCH/DELETE بلا مفتاح إعادة | قصر retry على GET/HEAD؛ mutation لا يُعاد إلا عبر سياسة مورد عقدية ومفتاح مستقر محفوظ بأمان | POST شبكة فاشلة: لا محاولة ثانية؛ GET: محاولة محدودة؛ mutation متعاقد: نفس المفتاح فقط |
| MLOG-012 | `src/services/SyncManager.ts:19-79` | إعادة تشغيل طابور mutations بصيغة عمياء بلا idempotency أو تأكيد نهائي | استبدال `SyncRequest` بـ`PendingMutation` سماحي: method/path/body آمن، `idempotencyKey`، ttl، resourcePolicy، وعدّاد محدود؛ التحقق من النتيجة قبل الإزالة | replay بنفس المفتاح يعاد مرة واحدة؛ `409/duplicate` يعامل تأكيداً فقط إذا DTO يثبت المورد؛ انتهاء TTL يحذف ويظهر فشل |
| MDATA-008 | `src/services/HttpClient.ts:33-45` | mutation غير المتصل يرجع `queued:true` في مسار نجاح Axios | رفض الطلب بـ`OfflineMutationPendingError` أو إرجاع discriminated result لا يطابق DTO النجاح؛ الواجهة تعرض pending | Offline POST لا يصل `then(success)`؛ تظهر pending ولا تتغير بيانات الطلب/الحجز محلياً |
| MSEC-009 | `src/services/SyncManager.ts:5-29,61-65` | حفظ headers كاملة بما فيها Authorization في AsyncStorage | تجريد headers إلى allowlist قبل الحفظ؛ لا Authorization/Cookie/PHI؛ مصدر token يحقن عند إعادة التشغيل من SecureStore | اختبار serialisation يمنع `authorization` و`cookie` وحقول PHI الحساسة |
| MSEC-011 | `src/services/SyncManager.ts:16-77` و`src/utils/offlineQueue.ts:12-49` | queue نصي غير مشفر بلا TTL ويحتفظ بالمحتوى/المستلم | إيقاف حفظ الرسائل/المرفقات الحساسة نصياً؛ استخدام مخزن مشفر متاح أو عدم وضعها في الطابور؛ TTL وحجم أقصى ومحو عند logout | اختبار انتهاء TTL، logout يمحو، ورفض queue للمرفق/محتوى طبي/headers |
| MSEC-014 | `app/(auth)/register.tsx:175-184` | كلمة المرور تمر في params إلى OTP | إنشاء `RegistrationTransactionContext` داخل الذاكرة؛ route يحمل `transactionId` فقط، أو عقد server-side transaction | serialised route لا يحتوي password؛ OTP بلا transaction صالح يرفض ويعود للتسجيل |
| MSEC-015 | `app/(auth)/otp.tsx:101-110` | guest conversion يرسل `Password@123` افتراضياً | إزالة fallback كلياً؛ طلب كلمة مختارة تحقق سياسة أو exchange token من الباك إند | غياب كلمة/رمز conversion يرفض قبل الشبكة؛ لا يظهر literal المحظور في الشجرة |
| MDATA-017 | `app/_layout.tsx:65-69` | فشل re-auth يصنع `guest_user` و`guest_token` بدور patient | استبداله بحالة `offlineUnauthenticated` بلا token ولا user، وتقييد التنقل إلى واجهات عامة وإظهار reconnect | فشل re-auth لا يرسل auth dispatch ولا يحمل bearer؛ يمنع فتح المسارات المحمية |

## ترتيب الدفعات

| الدفعة | محتوى التنفيذ | شرط البدء | بوابة الخروج |
|---|---|---|---|
| A | خدمة token موحدة، إزالة fallbacks، حالة offlineUnauthenticated، كلمة المرور في التسجيل/OTP | لا يعتمد على الباك إند الجديد | اختبارات الوحدة + typecheck + فحص ثابت لمفاتيح token وكلمة المرور |
| B | ApiContractError ومنع نجاح JSON/Offline المصطنع | لا يعتمد على الباك إند الجديد | اختبارات Axios/fetch لكل فشل عقدي وشبكة |
| C | طابور PendingMutation الآمن وسياسات replay | يتطلب تأكيد مصفوفة idempotency في الـOpenAPI الحية قبل تمكين كل مورد | اختبار TTL/header stripping/replay وعدم تكرار الحجوزات والدفع |
| D | ربط mutations المتعاقد عليها فقط ومراجعة E2E Sandbox | نشر الـOpenAPI الحية وعقود mutation الفعلية | success/failure/replay لكل مورد وحساب Sandbox فقط |

## شرط قرار التنفيذ

يمكن تنفيذ الدفعتين A وB فوراً لأنهما دفاعيتان ولا تخترعان عقداً. أما تمكين replay أو queue لعمليات الحجوزات/السلة/الدفع/الوصفات فيبقى محجوباً حتى تُنشر الـOpenAPI الحية وتحدد لكل عملية TTL ومفتاح idempotency وشكل التأكيد النهائي.
