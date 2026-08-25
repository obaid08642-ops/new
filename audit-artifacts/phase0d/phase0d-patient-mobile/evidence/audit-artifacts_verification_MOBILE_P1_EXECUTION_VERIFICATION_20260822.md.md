# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `audit-artifacts/verification/MOBILE_P1_EXECUTION_VERIFICATION_20260822.md`
- **Member SHA-256:** `c8f56a24af6ca203706c27f934fb1e26e286a0f903f6510c22fea571349b92d6`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: | MSEC-014 وMSEC-015 | كلمة المرور بقيت ضمن registration transaction داخل الذاكرة، وroute OTP يحمل transactionId فقط؛ أزيل conversion الافتراضي. | `099d37f` | `src/services/auth/RegistrationTransaction.test.ts` |`
- `39: لا تزال مواءمة register/OTP الموروثة مع جسور `/auth/otp/*` وsession exchange الجديدة محجوبة حتى تتوفر OpenAPI حية مطابقة وعنوان Sandbox معتمد. كذلك لا توجد queue أو replay مفعلة للحجوزات أو السلة أو الدفع أو الوصفات أو المحادثة؛ تم تعطيلها `
### backend_consumers_or_contracts
- `15: | MSEC-014 وMSEC-015 | كلمة المرور بقيت ضمن registration transaction داخل الذاكرة، وroute OTP يحمل transactionId فقط؛ أزيل conversion الافتراضي. | `099d37f` | `src/services/auth/RegistrationTransaction.test.ts` |`
- `16: | MDATA-017 | لا يُصنع `guest_user` أو `guest_token` عند الفشل؛ وأزيلت نقطة `auth/guest` من شاشة الترحيب ومدخل التطبيق بانتظار عقد منشور. | `099d37f`, `33404a4` | `app/authGuestPolicy.test.ts` |`
- `39: لا تزال مواءمة register/OTP الموروثة مع جسور `/auth/otp/*` وsession exchange الجديدة محجوبة حتى تتوفر OpenAPI حية مطابقة وعنوان Sandbox معتمد. كذلك لا توجد queue أو replay مفعلة للحجوزات أو السلة أو الدفع أو الوصفات أو المحادثة؛ تم تعطيلها `
### auth_ownership
- `9: | MSEC-001 وMSEC-016 | التخزين الآمن للـsession يفشل مغلقاً على native؛ لا fallback نصي للرموز، مع تنظيف مرآة legacy فقط. | `099d37f` | `src/utils/security.storage.test.ts` |`
- `10: | MSEC-005 | `utils/api.ts` صار يستخدم `secureGet/secureSet/secureDelete` ولا يعيد access/refresh tokens إلى AsyncStorage. | `1e5e148` | `utils/api.security.test.ts` |`
- `13: | MLOG-012 وMSEC-009 | طابور mutations السابق، الذي كان يحفظ request/body/headers ويعيد التشغيل، معطل صراحةً ولا يخزن Authorization أو PHI. | `e04c04f` | `src/services/SyncManager.offline.test.ts` |`
- `15: | MSEC-014 وMSEC-015 | كلمة المرور بقيت ضمن registration transaction داخل الذاكرة، وroute OTP يحمل transactionId فقط؛ أزيل conversion الافتراضي. | `099d37f` | `src/services/auth/RegistrationTransaction.test.ts` |`
- `16: | MDATA-017 | لا يُصنع `guest_user` أو `guest_token` عند الفشل؛ وأزيلت نقطة `auth/guest` من شاشة الترحيب ومدخل التطبيق بانتظار عقد منشور. | `099d37f`, `33404a4` | `app/authGuestPolicy.test.ts` |`
- `39: لا تزال مواءمة register/OTP الموروثة مع جسور `/auth/otp/*` وsession exchange الجديدة محجوبة حتى تتوفر OpenAPI حية مطابقة وعنوان Sandbox معتمد. كذلك لا توجد queue أو replay مفعلة للحجوزات أو السلة أو الدفع أو الوصفات أو المحادثة؛ تم تعطيلها `
- `41: > **الحكم الحالي:** لا دمج إلى `main`، ولا GO للإنتاج. يتحسن وضع P1 الدفاعي في هذا الفرع فقط؛ ويظل الحكم محجوباً حتى إصلاح بوابة Jest الموحدة، والتعاقد الحي، واختبارات Sandbox success/failure/owner/unauth/replay على حسابات Sandbox فقط.`
### state_transitions
- `11: | MDATA-002 | استجابة HTTP الناجحة غير JSON ترفض بـ`ApiContractError('invalid_response')` بدلاً من نجاح مصطنع. | `099d37f` | `src/utils/api.security.test.ts` |`
- `12: | MLOG-007 وMDATA-008 | HttpClient يعيد فقط GET/HEAD؛ mutation network failure يرفض بـ`OfflineMutationPendingError` ولا يعود queued success. | `e04c04f` | `src/services/HttpClient.offline.test.ts` |`
- `41: > **الحكم الحالي:** لا دمج إلى `main`، ولا GO للإنتاج. يتحسن وضع P1 الدفاعي في هذا الفرع فقط؛ ويظل الحكم محجوباً حتى إصلاح بوابة Jest الموحدة، والتعاقد الحي، واختبارات Sandbox success/failure/owner/unauth/replay على حسابات Sandbox فقط.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: | MDATA-002 | استجابة HTTP الناجحة غير JSON ترفض بـ`ApiContractError('invalid_response')` بدلاً من نجاح مصطنع. | `099d37f` | `src/utils/api.security.test.ts` |`
- `12: | MLOG-007 وMDATA-008 | HttpClient يعيد فقط GET/HEAD؛ mutation network failure يرفض بـ`OfflineMutationPendingError` ولا يعود queued success. | `e04c04f` | `src/services/HttpClient.offline.test.ts` |`
- `13: | MLOG-012 وMSEC-009 | طابور mutations السابق، الذي كان يحفظ request/body/headers ويعيد التشغيل، معطل صراحةً ولا يخزن Authorization أو PHI. | `e04c04f` | `src/services/SyncManager.offline.test.ts` |`
- `14: | MSEC-011 | طابور الرسائل النصي معطل؛ يمسح مفتاح legacy ويرفض حفظ content/receiver أو إعادة الإرسال. | `d43f932` | `src/utils/offlineQueue.security.test.ts` |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
