# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/reviewer-handoff-message-2026-08-20.md`
- **Member SHA-256:** `7ae1c1a9daa2fed9423568a2210aff62630f3613870ac75a6b5d4db9927e3faa`
- **Line count:** 94
- **Read range:** `1-94`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: بُني تطبيق الويب باستخدام **Next.js 16.3.1 App Router** و**TypeScript strict**. الواجهة تدعم اللغات الست المطابقة لتطبيق المريض: `ar`, `en`, `ur`, `hi`, `bn`, `fil`، مع RTL للعربية والأردية فقط. النظام البصري Premium خاص بنبض بلس، يعتمد خط `
- `28: | المصادقة والجلسة | تسجيل دخول بكلمة المرور، refresh واحد مقيد، logout، وcookies `httpOnly`. لا يوجد Bearer token في المتصفح أو `localStorage`. دخول OTP غير مفعّل لأن الخلفية لا تؤسس جلسة آمنة بعد التحقق. |`
- `50: | G-HOME-001 | قائمة الرعاية المنزلية فقط؛ لا تفاصيل أو تتبع أو تقرير. | `GET /home-care/bookings/{bookingId}` مع الملكية داخل الاستعلام و`404` لغير المالك وDTO عرض محدود. |`
- `72: | [`docs/github-upload-and-web-status-2026-08-20.md`](./github-upload-and-web-status-2026-08-20.md) | حالة الرفع والتنفيذ والفجوات ونتائج التحقق. |`
- `74: | `lib/api/` و`app/api/patient/[...path]/route.ts` | BFF وallowlists والمحللات واختبارات الحماية. |`
### backend_consumers_or_contracts
- `50: | G-HOME-001 | قائمة الرعاية المنزلية فقط؛ لا تفاصيل أو تتبع أو تقرير. | `GET /home-care/bookings/{bookingId}` مع الملكية داخل الاستعلام و`404` لغير المالك وDTO عرض محدود. |`
- `63: فُحصت نسختا OpenAPI المسلّمتان محلياً دون استدعاء الخلفية أو كشف بيانات. ظهرت `GET /prescriptions/{id}` و`GET /chat/threads/{threadId}` و`POST /auth/verify-otp`، لكن كل واحدة تفتقر إلى security على مستوى العملية وresponse schema مفيد، وتعلن`
- `74: | `lib/api/` و`app/api/patient/[...path]/route.ts` | BFF وallowlists والمحللات واختبارات الحماية. |`
### auth_ownership
- `28: | المصادقة والجلسة | تسجيل دخول بكلمة المرور، refresh واحد مقيد، logout، وcookies `httpOnly`. لا يوجد Bearer token في المتصفح أو `localStorage`. دخول OTP غير مفعّل لأن الخلفية لا تؤسس جلسة آمنة بعد التحقق. |`
- `51: | G-OTP-001 | OTP غير مفعّل في الويب. | جلسة مباشرة أو `exchange_token` قصير العمر يمكن استبداله خادمياً، بلا توكن في URL أو المتصفح. |`
- `53: | G-FAMILY-001 | لا أسماء عرض موثوقة لأفراد العائلة. | DTO مقيد: `display_name`, `role`, `joined_at`. |`
- `54: | G-PRESCRIPTION-001 | توجد عملية تفاصيل في OpenAPI ولكنها بلا `security` أو schema أو اختبار ملكية بعد. | Bearer security، DTO نجاح/خطأ مقيد، و`404` لغير المالك، ثم اختبار Sandbox owner/other. |`
- `63: فُحصت نسختا OpenAPI المسلّمتان محلياً دون استدعاء الخلفية أو كشف بيانات. ظهرت `GET /prescriptions/{id}` و`GET /chat/threads/{threadId}` و`POST /auth/verify-otp`، لكن كل واحدة تفتقر إلى security على مستوى العملية وresponse schema مفيد، وتعلن`
- `78: 1. راجع BFF والجلسة وcookies وallowlists، وتأكد أن كل مسار خاص خادمي فقط ولا يسمح بالكتابة من المتصفح.`
- `82: 5. راجع OpenAPI وBackend للفجوات أعلاه. بعد كل عقد جديد، نفّذ بالترتيب: parser/allowlist في BFF، اختبار Sandbox owner/other، اختبار SSR، ثم UI قرائي أو عملي ضمن حدود العقد.`
### state_transitions
- `59: | G-OAPI-001/002 | OpenAPI الحالية بلا `servers`، والعمليات الحساسة المذكورة أعلاه بلا response schemas. | استكمال servers وsecurity annotations وDTOs وresponses/errors ثم إعادة تصدير المواصفة. |`
- `72: | [`docs/github-upload-and-web-status-2026-08-20.md`](./github-upload-and-web-status-2026-08-20.md) | حالة الرفع والتنفيذ والفجوات ونتائج التحقق. |`
- `83: 6. لا تقترح بيانات mock أو placeholder أو fallback ناجح؛ عند فشل backend أو غياب عقد يجب أن تبقى حالة error/empty/unavailable حقيقية.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `59: | G-OAPI-001/002 | OpenAPI الحالية بلا `servers`، والعمليات الحساسة المذكورة أعلاه بلا response schemas. | استكمال servers وsecurity annotations وDTOs وresponses/errors ثم إعادة تصدير المواصفة. |`
- `83: 6. لا تقترح بيانات mock أو placeholder أو fallback ناجح؛ عند فشل backend أو غياب عقد يجب أن تبقى حالة error/empty/unavailable حقيقية.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
