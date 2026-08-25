# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE6_STAGING_E2E_MATRIX_20260817.md`
- **Member SHA-256:** `4e56afdd0bd6609b4a67b5ea6bad604b96302c3a6d93063086e668e7f04e1d7e`
- **Line count:** 50
- **Read range:** `1-50`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Patient login | PASS | `201`، token contract nested تحت `token.accessToken`، وclaims role=`patient` مع معرف حقيقي |`
- `14: | Provider laboratory login | PASS | `201` عبر `/provider/auth/login`، وresponse احتوى access_token/provider_id/provider_type/profile |`
- `15: | Admin OTP/2FA entry | BLOCKED | `/auth/login` للحساب الإداري أعاد `401`، لذلك لم تبدأ دورة OTP ولم تُخمن أي code |`
- `27: اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فا`
- `39: login patient وlaboratory نجحا. محاولة admin login أعادت `401` بدلاً من `requires_2fa`، لذلك لم تُرسل OTP ولم تُقرأ Redis keys ولم تُكرر المحاولات. يلزم أولاً تصحيح أو تأكيد بيانات اعتماد admin/مسار admin على staging، ثم تنفيذ matrix للنجاح`
- `50: بعد إلغاء staging، أُعيد توجيه probe إلى `https://api.nabd.plus/api/v1`. لم يُرسل أي login أو mutation بنجاح: اتصال TLS انتهى بمهلة 30 ثانية، ثم انتهى فحص HTTPS health بمهلة 20 ثانية، وفحص HTTP البديل بمهلة 15 ثانية. DNS resolution يعمل ويع`
### backend_consumers_or_contracts
- `3: **Environment:** `http://57.131.133.208:8003/api/v1``
- `5: **Scope:** BOLA، payment/webhook/idempotency، WebSocket origin/impersonation، OTP/2FA/rate-limit.`
- `14: | Provider laboratory login | PASS | `201` عبر `/provider/auth/login`، وresponse احتوى access_token/provider_id/provider_type/profile |`
- `15: | Admin OTP/2FA entry | BLOCKED | `/auth/login` للحساب الإداري أعاد `401`، لذلك لم تبدأ دورة OTP ولم تُخمن أي code |`
- `19: | WebSocket transport/origin | FAILING CONFIG | valid token وtoken معدّل وOrigin غير موثوق وصلوا إلى transport connect في النسخة المنشورة؛ source patch الآن fail-closed خارج development/test، وينتظر redeploy وإعادة الاختبار مع انتظار discon`
- `23: تم تسجيل الدخول للمريض وقراءة `/orders/mine` بنجاح، وظهرت طلبات مرتبطة بمعرف patient حقيقي. لم يتم إلغاء أي طلب في هذه الجولة. اختبار BOLA المطلوب بين مريضين يحتاج حساب patient ثانياً ومعرف order يخصه، ثم يجب التحقق من state وledger قبل وبع`
- `27: اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فا`
- `31: ## WebSocket origin and impersonation`
- `50: بعد إلغاء staging، أُعيد توجيه probe إلى `https://api.nabd.plus/api/v1`. لم يُرسل أي login أو mutation بنجاح: اتصال TLS انتهى بمهلة 30 ثانية، ثم انتهى فحص HTTPS health بمهلة 20 ثانية، وفحص HTTP البديل بمهلة 15 ثانية. DNS resolution يعمل ويع`
### auth_ownership
- `5: **Scope:** BOLA، payment/webhook/idempotency، WebSocket origin/impersonation، OTP/2FA/rate-limit.`
- `13: | Patient login | PASS | `201`، token contract nested تحت `token.accessToken`، وclaims role=`patient` مع معرف حقيقي |`
- `14: | Provider laboratory login | PASS | `201` عبر `/provider/auth/login`، وresponse احتوى access_token/provider_id/provider_type/profile |`
- `15: | Admin OTP/2FA entry | BLOCKED | `/auth/login` للحساب الإداري أعاد `401`، لذلك لم تبدأ دورة OTP ولم تُخمن أي code |`
- `19: | WebSocket transport/origin | FAILING CONFIG | valid token وtoken معدّل وOrigin غير موثوق وصلوا إلى transport connect في النسخة المنشورة؛ source patch الآن fail-closed خارج development/test، وينتظر redeploy وإعادة الاختبار مع انتظار discon`
- `33: النسخة المنشورة قبل patch سمحت transport connection مع token صالح، token معدّل، وOrigin `https://evil.example`. هذا القياس لا يعني أن token المعدل أصبح authenticated؛ gateway قد يقبل transport ثم ينفذ disconnect asynchronously. لذلك أُضيف s`
- `35: لا يُعتبر انتحال الهوية مغلقاً حتى يُختبر token يخص user A مع محاولات room/event تخص user B، مع إثبات أن `client.data.user.id` هو المصدر الوحيد للهوية وأن `chat:join` وcall signaling يرفضان cross-owner.`
- `37: ## OTP/2FA/rate limit`
- `39: login patient وlaboratory نجحا. محاولة admin login أعادت `401` بدلاً من `requires_2fa`، لذلك لم تُرسل OTP ولم تُقرأ Redis keys ولم تُكرر المحاولات. يلزم أولاً تصحيح أو تأكيد بيانات اعتماد admin/مسار admin على staging، ثم تنفيذ matrix للنجاح`
- `43: قبل إغلاق Phase 6 يجب نشر source patch الحالي، توفير patient credential ثانٍ أو order test معتمد، إصلاح payment sandbox/config، وتأكيد admin credential/OTP retrieval. بعد ذلك تُعاد فقط الاختبارات الفاشلة أو غير المنفذة مع before/after state`
- `50: بعد إلغاء staging، أُعيد توجيه probe إلى `https://api.nabd.plus/api/v1`. لم يُرسل أي login أو mutation بنجاح: اتصال TLS انتهى بمهلة 30 ثانية، ثم انتهى فحص HTTPS health بمهلة 20 ثانية، وفحص HTTP البديل بمهلة 15 ثانية. DNS resolution يعمل ويع`
### state_transitions
- `17: | Payment intent/idempotency | FAIL/BLOCKED | intent على order pending أعاد `500` مرتين؛ لا يمكن إثبات idempotency حتى تُصلح staging payment gateway/config |`
- `19: | WebSocket transport/origin | FAILING CONFIG | valid token وtoken معدّل وOrigin غير موثوق وصلوا إلى transport connect في النسخة المنشورة؛ source patch الآن fail-closed خارج development/test، وينتظر redeploy وإعادة الاختبار مع انتظار discon`
- `23: تم تسجيل الدخول للمريض وقراءة `/orders/mine` بنجاح، وظهرت طلبات مرتبطة بمعرف patient حقيقي. لم يتم إلغاء أي طلب في هذه الجولة. اختبار BOLA المطلوب بين مريضين يحتاج حساب patient ثانياً ومعرف order يخصه، ثم يجب التحقق من state وledger قبل وبع`
- `27: اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فا`
- `43: قبل إغلاق Phase 6 يجب نشر source patch الحالي، توفير patient credential ثانٍ أو order test معتمد، إصلاح payment sandbox/config، وتأكيد admin credential/OTP retrieval. بعد ذلك تُعاد فقط الاختبارات الفاشلة أو غير المنفذة مع before/after state`
### payment_insurance_relevance
- `5: **Scope:** BOLA، payment/webhook/idempotency، WebSocket origin/impersonation، OTP/2FA/rate-limit.`
- `17: | Payment intent/idempotency | FAIL/BLOCKED | intent على order pending أعاد `500` مرتين؛ لا يمكن إثبات idempotency حتى تُصلح staging payment gateway/config |`
- `18: | Unmatched webhook | PARTIAL PASS | `POST /payments/webhook/moyasar` مع intent غير مطابق أعاد `200` و`{ok:false, reason:no_match}` دون دليل side effect؛ signature-valid webhook لم يُنفذ |`
- `25: ## Payment, webhook, and idempotency`
- `27: اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فا`
- `29: أُرسل webhook غير مطابق ببيانات intent غير موجودة، فأعاد المسار `200` مع `ok:false/reason:no_match`. هذا يثبت fail-safe للـunmatched payload فقط، ولا يثبت signature validation أو webhook idempotency أو ledger transition. لا تُرسل webhook pr`
- `33: النسخة المنشورة قبل patch سمحت transport connection مع token صالح، token معدّل، وOrigin `https://evil.example`. هذا القياس لا يعني أن token المعدل أصبح authenticated؛ gateway قد يقبل transport ثم ينفذ disconnect asynchronously. لذلك أُضيف s`
- `43: قبل إغلاق Phase 6 يجب نشر source patch الحالي، توفير patient credential ثانٍ أو order test معتمد، إصلاح payment sandbox/config، وتأكيد admin credential/OTP retrieval. بعد ذلك تُعاد فقط الاختبارات الفاشلة أو غير المنفذة مع before/after state`
- `50: بعد إلغاء staging، أُعيد توجيه probe إلى `https://api.nabd.plus/api/v1`. لم يُرسل أي login أو mutation بنجاح: اتصال TLS انتهى بمهلة 30 ثانية، ثم انتهى فحص HTTPS health بمهلة 20 ثانية، وفحص HTTP البديل بمهلة 15 ثانية. DNS resolution يعمل ويع`
### error_empty_loading_retry_cancel
- `17: | Payment intent/idempotency | FAIL/BLOCKED | intent على order pending أعاد `500` مرتين؛ لا يمكن إثبات idempotency حتى تُصلح staging payment gateway/config |`
- `27: اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فا`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
