# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/github-upload-and-web-status-2026-08-20.md`
- **Member SHA-256:** `146a02cb96ebef5872b9ab3cc2daf029402e0e64a84e8010b44312b808e272ca`
- **Line count:** 78
- **Read range:** `1-78`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: بُني تطبيق مريض بـ**Next.js 16.3.1 App Router** وTypeScript strict، واتصاله بالمنظومة الحية يمر عبر BFF خادمي. تُحفظ جلسة المريض في cookies من نوع `httpOnly`، ولا تُرسل توكنات Bearer إلى المتصفح أو `localStorage`. لا تستخدم أي رحلة إنتاجية `
- `57: | G-HOME-001 | الرعاية المنزلية قائمة فقط بلا تفاصيل أو تتبع أو تقارير. | `GET /home-care/bookings/{bookingId}` مع استنتاج المريض من JWT و`404` لغير المالك وDTO عرض محدود. |`
- `67: | G-FILE-001 | لا رفع وثائق أو تقارير أو OCR. | عقد منح upload، MIME/size، URL موقّع قصير العمر، وملكية القراءة والحذف. |`
### backend_consumers_or_contracts
- `57: | G-HOME-001 | الرعاية المنزلية قائمة فقط بلا تفاصيل أو تتبع أو تقارير. | `GET /home-care/bookings/{bookingId}` مع استنتاج المريض من JWT و`404` لغير المالك وDTO عرض محدود. |`
### auth_ownership
- `23: بُني تطبيق مريض بـ**Next.js 16.3.1 App Router** وTypeScript strict، واتصاله بالمنظومة الحية يمر عبر BFF خادمي. تُحفظ جلسة المريض في cookies من نوع `httpOnly`، ولا تُرسل توكنات Bearer إلى المتصفح أو `localStorage`. لا تستخدم أي رحلة إنتاجية `
- `27: | البنية والأمن | BFF خادمي، جلسة JWT مع refresh واحد مقيد، allowlist لمسارات BFF، وحماية من BOLA/IDOR في الرحلات ذات معرّف مورد حيث أتاح العقد اختبار الملكية. |`
- `58: | G-OTP-001 | الدخول بكلمة المرور متاح؛ دخول OTP غير مفعّل. | جلسة مباشرة بعد OTP أو `exchange_token` قصير العمر لاستبداله خادمياً، بلا توكن في URL أو المتصفح. |`
- `60: | G-FAMILY-001 | قائمة العائلة لا تعرض IDs أو صلاحيات خام، لكنها لا تملك أسماء عرض موثوقة. | DTO أعضاء بعناصر `display_name` و`role` و`joined_at` فقط. |`
- `62: | G-CHAT-001 وG-RTC-001 | قائمة المحادثات وصفية فقط؛ لا رسائل ولا مرفقات ولا إرسال ولا مكالمات. | عقود تفاصيل/رسائل مع عضوية خادمية وpaging، ثم عقود realtime/room token قصيرة العمر للمكالمات. |`
- `71: المسار الصحيح هو تسليم الخلفية لأحد العقود الحرجة، ثم تنفيذ دورة محكومة: محلل DTO في BFF، allowlist للحقول، اختبار Sandbox للمالك مقابل غير المالك، اختبار SSR لمنع التسرب، ثم واجهة Premium تعمل ببيانات حقيقية فقط. ترتيب التسليم المقترح هو: `
### state_transitions
- `77: - [حالة مزامنة GitHub السابقة](./github-sync-status-2026-08-20.md)`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
