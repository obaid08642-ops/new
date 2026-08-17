# Nabdah Phase 6 Staging E2E Matrix — 2026-08-17

**Environment:** `http://57.131.133.208:8003/api/v1`

**Scope:** BOLA، payment/webhook/idempotency، WebSocket origin/impersonation، OTP/2FA/rate-limit.

**Evidence rule:** هذه النتائج ناتجة عن طلبات staging حقيقية أو تحقق source واضح. لا تُعتبر أي خانة غير منفذة مغلقة، ولا تُستخدم بيانات mock لإكمال المصفوفة.

## Summary

| Area | Result | Evidence / blocker |
|---|---|---|
| Patient login | PASS | `201`، token contract nested تحت `token.accessToken`، وclaims role=`patient` مع معرف حقيقي |
| Provider laboratory login | PASS | `201` عبر `/provider/auth/login`، وresponse احتوى access_token/provider_id/provider_type/profile |
| Admin OTP/2FA entry | BLOCKED | `/auth/login` للحساب الإداري أعاد `401`، لذلك لم تبدأ دورة OTP ولم تُخمن أي code |
| BOLA between two patients | NOT CLOSED | patient order listing نجح، لكن credential لمريض ثانٍ غير متوفر في probe؛ لم يُنفذ mutation تخميني |
| Payment intent/idempotency | FAIL/BLOCKED | intent على order pending أعاد `500` مرتين؛ لا يمكن إثبات idempotency حتى تُصلح staging payment gateway/config |
| Unmatched webhook | PARTIAL PASS | `POST /payments/webhook/moyasar` مع intent غير مطابق أعاد `200` و`{ok:false, reason:no_match}` دون دليل side effect؛ signature-valid webhook لم يُنفذ |
| WebSocket transport/origin | FAILING CONFIG | valid token وtoken معدّل وOrigin غير موثوق وصلوا إلى transport connect في النسخة المنشورة؛ source patch الآن fail-closed خارج development/test، وينتظر redeploy وإعادة الاختبار مع انتظار disconnect/auth state |

## BOLA

تم تسجيل الدخول للمريض وقراءة `/orders/mine` بنجاح، وظهرت طلبات مرتبطة بمعرف patient حقيقي. لم يتم إلغاء أي طلب في هذه الجولة. اختبار BOLA المطلوب بين مريضين يحتاج حساب patient ثانياً ومعرف order يخصه، ثم يجب التحقق من state وledger قبل وبعد مع توقع `403` وعدم وجود side effect. لا يجوز استبدال هذا الاختبار بتجربة provider أو order عشوائي.

## Payment, webhook, and idempotency

اُختير order بحالة غير `CANCELLED` وpayment status غير paid، ثم أُرسل `POST /payments/intent/pharmacy/:id` مرتين. كلا الطلبين أعادا `500 Internal server error`، لذلك لم يُنشأ transaction يمكن مقارنة معرفه، ولم تُعتبر idempotency ناجحة أو فاشلة على مستوى gateway. يلزم فحص logs وpayment adapter/config على staging قبل إعادة الطلب.

أُرسل webhook غير مطابق ببيانات intent غير موجودة، فأعاد المسار `200` مع `ok:false/reason:no_match`. هذا يثبت fail-safe للـunmatched payload فقط، ولا يثبت signature validation أو webhook idempotency أو ledger transition. لا تُرسل webhook production-like موقعة قبل توفير secret الاختبار.

## WebSocket origin and impersonation

النسخة المنشورة قبل patch سمحت transport connection مع token صالح، token معدّل، وOrigin `https://evil.example`. هذا القياس لا يعني أن token المعدل أصبح authenticated؛ gateway قد يقبل transport ثم ينفذ disconnect asynchronously. لذلك أُضيف source patch يرفض غياب `ALLOWED_ORIGINS` وwildcard في staging/production، وأصبح الاختبار التالي يجب أن ينتظر `disconnect` وغياب استقبال events، لا أن يكتفي بـ`connect`.

لا يُعتبر انتحال الهوية مغلقاً حتى يُختبر token يخص user A مع محاولات room/event تخص user B، مع إثبات أن `client.data.user.id` هو المصدر الوحيد للهوية وأن `chat:join` وcall signaling يرفضان cross-owner.

## OTP/2FA/rate limit

login patient وlaboratory نجحا. محاولة admin login أعادت `401` بدلاً من `requires_2fa`، لذلك لم تُرسل OTP ولم تُقرأ Redis keys ولم تُكرر المحاولات. يلزم أولاً تصحيح أو تأكيد بيانات اعتماد admin/مسار admin على staging، ثم تنفيذ matrix للنجاح، code خاطئ، expiry، attempts، replay، rate-limit، وidentifier normalization.

## Required next evidence

قبل إغلاق Phase 6 يجب نشر source patch الحالي، توفير patient credential ثانٍ أو order test معتمد، إصلاح payment sandbox/config، وتأكيد admin credential/OTP retrieval. بعد ذلك تُعاد فقط الاختبارات الفاشلة أو غير المنفذة مع before/after state وledger وrequest ids.

**Verdict:** Phase 6 E2E remains OPEN. No production-readiness claim is made.
