# Nabdah QR Verifier Contract — Review Draft

**الحالة:** مسودة مراجعة فقط — fail-closed وغير مفعّلة

## الهدف والنطاق

يهدف العقد إلى التحقق من QR صادر من Nabdah أو جهة موثوقة، دون اعتبار قراءة النص أو فك الترميز دليلاً على الصلاحية. لا يجوز لأي واجهة أو endpoint منح وصول طبي لمجرد وجود QR. إلى أن يعتمد العقد، يبقى verifier غير منشور أو يعيد `QR_CONTRACT_NOT_ACTIVE`.

## payload المقترح

| الحقل | القاعدة |
|---|---|
| `v` | إصدار schema، unknown version يرفض |
| `kid` | معرف مفتاح التوقيع، لا يقبل key غير موجود في key registry |
| `jti` | UUID فريد لمنع replay |
| `iss` | issuer معتمد ومطابق للبيئة |
| `aud` | audience محدد، لا wildcard |
| `sub` | subject/resource id، لا يُستخدم منفرداً لتجاوز authorization |
| `purpose` | غرض QR مغلق مثل appointment_checkin أو document_verify |
| `iat` | وقت الإصدار UTC |
| `exp` | انتهاء قصير؛ لا default طويل |
| `nonce` | nonce عشوائي عند الحاجة لتدفق challenge |
| `resource_id` | الموعد أو الوثيقة أو المنشأة المرتبطة |
| `signature` | توقيع detached أو JWS حسب اعتماد المنصة |

يجب ألا يحتوي QR على diagnosis أو medication أو بيانات صحية خام. إذا احتاج verifier إلى بيانات إضافية، يجلبها backend بعد التحقق والـauthorization، وليس من payload قابل للنسخ.

## خطوات التحقق

يجب التحقق بالترتيب من قابلية parsing، version، issuer، audience، key id، signature، timestamps، jti/nonce replay، purpose، resource binding، ثم authorization الحالي للمستخدم. فشل أي خطوة يعيد نتيجة عامة لا تكشف سبباً حساساً للعميل، مع reason code داخلي في audit.

## منع replay

يجب حفظ `jti` أو بصمة nonce مع TTL يساوي مدة صلاحية QR أو أقل. إعادة الاستخدام يرفض حتى لو كانت signature صحيحة. عمليات verification يجب أن تكون atomic عند استهلاك one-time QR، وidempotency behavior يجب أن يحدد في العقد النهائي حسب purpose.

## الربط والملكية

QR appointment لا يصح إلا إذا كان المستخدم الحالي مشاركاً في appointment أو موظفاً مفوضاً ضمن المنشأة. QR document لا يفتح الوثيقة إلا لصاحبها أو actor له consent قائم. لا يجوز استبدال participant id من client body أو اعتبار provider role وحده كافياً.

## الاستجابة المقترحة

الاستجابة الداخلية قد تحتوي `valid`, `purpose`, `resource_type`, `resource_id`, `expires_at`, `replay_status`، لكن العميل يحصل فقط على أقل نتيجة لازمة. عند الفشل العام يستخدم `QR_INVALID_OR_UNAVAILABLE`، ولا يفرق بين key غير موجود أو resource غير موجود لتقليل enumeration.

## Audit

يسجل verifier `request_id`, `jti_hash`, `issuer`, `kid`, `purpose`, `resource_id`, `actor_id`, `result`, `reason_code`, timestamps، والبيئة. لا تُسجل قيمة QR الخام أو signature الكاملة أو بيانات صحية.

## Fail-closed acceptance criteria

لا يوجد endpoint تفعيل قبل اعتماد key registry، rotation، TTL، replay store، issuer/audience، ownership mapping، وسياسة audit. أي signature غير صالحة أو version غير معتمد أو clock skew خارج الحد أو resource غير مرتبط يعيد رفضاً. لا يُسمح بإضافة `allowUnsigned`, `skipExpiry`, أو fallback key في production.

**قرار المراجعة:** DRAFT — NOT ACTIVE — لا تغييرات تشغيلية.
