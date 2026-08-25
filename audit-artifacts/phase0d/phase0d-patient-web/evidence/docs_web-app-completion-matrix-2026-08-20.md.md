# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/web-app-completion-matrix-2026-08-20.md`
- **Member SHA-256:** `dee79725526755701585eef85e9f6ac2554b582db54881b5d9ff0b85378e3c21`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: | تسجيل الدخول والجلسة | `/{locale}/login` | مكتملة؛ أخطاء حقيقية وتحميل وصولي. | `POST /auth/login`، refresh BFF، logout. | BFF واختبارات cookie/refresh؛ لا LocalStorage. | OTP/Onboarding مقفلان في G-OTP-001. |`
- `15: | الأدوية | `/medicines`, `/medicines/[id]` | مكتملة قراءة فقط وبحث مقيد. | كتالوج الخلفية. | SSR يمنع السعر/السلة؛ Sandbox قراءة. | لا سلة/checkout/إعادة صرف؛ identifier يحتاج توحيد (G-MED-001). |`
- `17: | التشخيص | `/diagnostics`, `/diagnostics/[domain]/[bookingId]` | مكتملة قراءة محدودة. | حجوزات مختبر/أشعة. | Sandbox وSSR؛ التقارير محجوبة. | لا رفع/إلغاء/تعديل أو تقارير. |`
- `18: | الرعاية المنزلية | `/home-care` | قائمة Premium مكتملة. | `GET /home-care/bookings/my`. | Sandbox وSSR للقائمة. | تفاصيل/تتبع/حضور/تقارير مقفلة في G-HOME-001. |`
- `31: | التفويض | كل route بمعرف مورد يحتاج تحقق ملكية backend، واختبار owner مقابل other عند توفر مورد. |`
### backend_consumers_or_contracts
- `10: | تسجيل الدخول والجلسة | `/{locale}/login` | مكتملة؛ أخطاء حقيقية وتحميل وصولي. | `POST /auth/login`، refresh BFF، logout. | BFF واختبارات cookie/refresh؛ لا LocalStorage. | OTP/Onboarding مقفلان في G-OTP-001. |`
- `12: | الطلبات | `/orders`, `/orders/[id]` | مكتملة قراءة فقط وتفاصيل Premium. | قائمة/تفاصيل الطلب عبر BFF. | Sandbox ملكية + SSR منع التسرب. | لا إعادة طلب أو دفع أو تتبع بلا عقد. |`
- `13: | المواعيد | `/appointments`, `/appointments/[id]` | مكتملة قراءة فقط. | قائمة/تفاصيل مواعيد BFF. | Sandbox ملكية + SSR. | لا حجز/إلغاء/تعديل؛ حقول انتظار ثابتة محجوبة (G-APPT-001). |`
- `14: | الملف والتأمين | `/profile` | مكتملة بالحقول المسموح بها فقط. | profile/medical-profile/insurance. | SSR allowlists وSandbox ذاتي النطاق. | هوية وتفاصيل تأمين مقفلة في G-PROFILE-001. |`
- `18: | الرعاية المنزلية | `/home-care` | قائمة Premium مكتملة. | `GET /home-care/bookings/my`. | Sandbox وSSR للقائمة. | تفاصيل/تتبع/حضور/تقارير مقفلة في G-HOME-001. |`
- `20: | الإشعارات | `/notifications` | قائمة قرائية Premium. | قائمة وعدد غير مقروء. | SSR يمنع الحمولة وروابطها. | لا تعليم قراءة/إعدادات/جهاز؛ النص المحلي يحتاج G-NOTIFICATION-001. |`
### auth_ownership
- `5: يُبنى الويب من ثلاث طبقات: **واجهة Next.js** للعرض والوصولية، و**BFF خادمي** يحمل جلسة المريض في cookies `httpOnly` ويتصل بـOpenAPI، و**Backend الإنتاجي** الذي يبقى المصدر الوحيد لبيانات المريض. لا توجد بيانات demo أو fallback ناجح أو تخزين`
- `10: | تسجيل الدخول والجلسة | `/{locale}/login` | مكتملة؛ أخطاء حقيقية وتحميل وصولي. | `POST /auth/login`، refresh BFF، logout. | BFF واختبارات cookie/refresh؛ لا LocalStorage. | OTP/Onboarding مقفلان في G-OTP-001. |`
- `11: | لوحة المريض | `/{locale}/dashboard` | مكتملة؛ روابط للرحلات المعتمدة فقط. | session BFF. | جلسة مطلوبة، لا هوية أو توكن في HTML. | لا تظهر بطاقة لميزة غير موثقة. |`
- `30: | BFF | لا Bearer token في المتصفح، ولا استدعاء API من عميل الصفحة الخاصة؛ تستخدم الصفحة خادم Next فقط. |`
- `31: | التفويض | كل route بمعرف مورد يحتاج تحقق ملكية backend، واختبار owner مقابل other عند توفر مورد. |`
- `39: الأولوية القادمة ليست اختراع شاشة جديدة؛ بل إغلاق العقود الخلفية التي تفتح رحلات كاملة بصورة آمنة: **OTP، تفاصيل الرعاية المنزلية، تفاصيل الوصفات، تفاصيل المحادثة/المرفقات/المكالمات، DTO هوية الملف، وتصنيف نشر الأدوية**. بعد كل عقد جديد، يض`
### state_transitions
- `33: | حالات UX | loading وempty وforbidden وupstream failure منفصلة؛ لا تحويل فشل الشبكة إلى قائمة فارغة. |`
### payment_insurance_relevance
- `14: | الملف والتأمين | `/profile` | مكتملة بالحقول المسموح بها فقط. | profile/medical-profile/insurance. | SSR allowlists وSandbox ذاتي النطاق. | هوية وتفاصيل تأمين مقفلة في G-PROFILE-001. |`
### error_empty_loading_retry_cancel
- `33: | حالات UX | loading وempty وforbidden وupstream failure منفصلة؛ لا تحويل فشل الشبكة إلى قائمة فارغة. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
