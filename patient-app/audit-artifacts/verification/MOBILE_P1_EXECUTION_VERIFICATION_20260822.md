# سجل تحقق تنفيذ إصلاحات P1 للموبايل — 2026-08-22

**النطاق:** هذا السجل يوثق تغييرات React Native/Expo الموجودة تحت `nabd_plus_patient_app/` فقط. السورس استورد من الأرشيف الموجود على `main` إلى فرع مستقل؛ لم يحدث أي دمج إلى `main`، ولم تُجرَ أي عملية نشر أو اختبار Sandbox أو اختبار إنتاجي.

> **قاعدة الأمان المنفذة:** عندما لا يملك التطبيق عقداً حياً منشوراً يحدد idempotency وTTL وشكل التأكيد النهائي، فإنه يرفض mutation أو queue بدلاً من تحويلها إلى نجاح محلي أو إعادة تشغيلها تلقائياً.

| بند التتبع | الحالة في هذا الفرع | commit المسؤول | دليل الاختبار |
|---|---|---|---|
| MSEC-001 وMSEC-016 | التخزين الآمن للـsession يفشل مغلقاً على native؛ لا fallback نصي للرموز، مع تنظيف مرآة legacy فقط. | `099d37f` | `src/utils/security.storage.test.ts` |
| MSEC-005 | `utils/api.ts` صار يستخدم `secureGet/secureSet/secureDelete` ولا يعيد access/refresh tokens إلى AsyncStorage. | `1e5e148` | `utils/api.security.test.ts` |
| MDATA-002 | استجابة HTTP الناجحة غير JSON ترفض بـ`ApiContractError('invalid_response')` بدلاً من نجاح مصطنع. | `099d37f` | `src/utils/api.security.test.ts` |
| MLOG-007 وMDATA-008 | HttpClient يعيد فقط GET/HEAD؛ mutation network failure يرفض بـ`OfflineMutationPendingError` ولا يعود queued success. | `e04c04f` | `src/services/HttpClient.offline.test.ts` |
| MLOG-012 وMSEC-009 | طابور mutations السابق، الذي كان يحفظ request/body/headers ويعيد التشغيل، معطل صراحةً ولا يخزن Authorization أو PHI. | `e04c04f` | `src/services/SyncManager.offline.test.ts` |
| MSEC-011 | طابور الرسائل النصي معطل؛ يمسح مفتاح legacy ويرفض حفظ content/receiver أو إعادة الإرسال. | `d43f932` | `src/utils/offlineQueue.security.test.ts` |
| MSEC-014 وMSEC-015 | كلمة المرور بقيت ضمن registration transaction داخل الذاكرة، وroute OTP يحمل transactionId فقط؛ أزيل conversion الافتراضي. | `099d37f` | `src/services/auth/RegistrationTransaction.test.ts` |
| MDATA-017 | لا يُصنع `guest_user` أو `guest_token` عند الفشل؛ وأزيلت نقطة `auth/guest` من شاشة الترحيب ومدخل التطبيق بانتظار عقد منشور. | `099d37f`, `33404a4` | `app/authGuestPolicy.test.ts` |
| حماية Redux persistence | لا يوجد fallback key ثابت ولا RNG قائم على `Math.random()`؛ إذا تعذر SecureStore/CSPRNG ترفض الكتابة ولا تدعي النجاح. | `8652d82` | `src/store/persistence/SecureStorageAdapter.test.ts` |

## البوابات المحلية المنفذة

| البوابة | النتيجة | الدليل المدفوع | SHA-256 |
|---|---|---|---|
| TypeScript | `npm run typecheck` انتهى بالرمز 0. | `MOBILE_P1_TYPECHECK_20260822.txt` | `112d574c3d4f4eee73efeefa7c9e83c50e62108d821c907521d91fc857284fa9` |
| انحدار P1 المستهدف | جرى تشغيل تسعة أوامر Jest معزولة؛ نجحت assertions في **12 اختباراً**. | `MOBILE_P1_TARGETED_REGRESSION_GATE_20260822.txt` | `90cd51582d93971fb2a951606d1ecbf4c0716f4db1379c6ecea0d6339e295ab4` |

توجد ملاحظة بيئية يجب ألا تُخفى: تشغيل ملفات P1 كلها في **عملية Jest واحدة** نجح من حيث assertions (9 suites و12 tests) لكنه خرج بالرمز 1 بعد رسالة Expo متأخرة من `ExpoModulesCoreJSLogger` تقول `Cannot log after tests are done`. لذلك لا يُدّعى أن تشغيل Jest المجمع نظيف. البوابة المدفوعة أعلاه تشغّل كل ملف في عملية Jest مستقلة؛ أوامرها انتهت بالرمز 0، لكن سجلها يحتفظ أيضاً بأي تحذير console ظهر بدلاً من كتمه. يلزم إصلاح fixture/توافق Jest–Expo قبل اعتبار بوابة Jest الموحدة خضراء.

## رؤوس Git وحدود الدليل

| البيان | القيمة |
|---|---|
| baseline من `main` | `1c769fbfcd6186eeaacc2e18b7c7bdbd1258dca8` |
| رأس التنفيذ قبل إيداع ملف الأدلة هذا | `33404a488d84068d3fc48d19e8aa6f29f5f0c26f` |
| الفرع | `agent/mobile-p1-fixes-20260822` |
| رابط المراجعة | https://github.com/obaid08642-ops/new/pull/new/agent/mobile-p1-fixes-20260822 |

## ما بقي محجوباً وسبب الحجب

لا تزال مواءمة register/OTP الموروثة مع جسور `/auth/otp/*` وsession exchange الجديدة محجوبة حتى تتوفر OpenAPI حية مطابقة وعنوان Sandbox معتمد. كذلك لا توجد queue أو replay مفعلة للحجوزات أو السلة أو الدفع أو الوصفات أو المحادثة؛ تم تعطيلها عمداً بدلاً من اختراع `Idempotency-Key` أو TTL أو confirmation DTO محلياً. لا يثبت هذا السجل تشغيل جهاز iOS/Android، ولا E2E، ولا mutation حقيقية ضد Sandbox، ولا أي جاهزية إنتاجية.

> **الحكم الحالي:** لا دمج إلى `main`، ولا GO للإنتاج. يتحسن وضع P1 الدفاعي في هذا الفرع فقط؛ ويظل الحكم محجوباً حتى إصلاح بوابة Jest الموحدة، والتعاقد الحي، واختبارات Sandbox success/failure/owner/unauth/replay على حسابات Sandbox فقط.
