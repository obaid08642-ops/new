# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-gap-log.md`
- **Member SHA-256:** `c707d68c14d06ca6594480b8732422a211169a8a74d903f318866201425f43af`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: | G-I18N-001 | اللغة | فرض RTL في الجذر بلا اعتماد على locale. | كسر LTR ومشكلات وصولية. | `dir/lang` لكل document/route + tests للغتين. | عالية | مفتوح |`
- `8: | G-DATA-002 | التشخيص | catch يعيد `data: []` عند فشل APIs. | error يظهر كعدم وجود عناصر. | Error state مع retry/trace؛ empty فقط بعد 200 حقيقي. | عالية | مفتوح |`
- `14: | G-CORS-001 | النشر | الإنتاج يحتاج `ALLOWED_ORIGINS`; نمط credential/token للويب غير محسوم. | فشل login/refresh أو تعريض tokens. | تأكيد domain/auth mode/CORS قبل المرحلة 4. | حرجة | مفتوح |`
- `15: | G-FILE-001 | الملفات | شكل upload وS3/signed URL ومحددات MIME لم تثبت بعد. | خطر base64/FU أو تسرب وثائق. | عقد رفع صريح، scan/status، signed read، اختبارات authorization. | حرجة | مفتوح |`
- `18: | G-SEO-001 | الاكتشاف | frontend template SPA؛ الصفحات العامة تحتاج HTML قابل فهرسة وقيود صحية. | عدم تحقق SEO/AEO أو تسرب خاص. | SSR/route policy قبل نشر عام؛ private routes `noindex`. | حرجة | مفتوح |`
- `20: | G-MOBILE-001 | تطبيق المريض | `app/orders/index.tsx` كان يستدعي `/care/appointments/mine` غير الموجود؛ العقد الفعلي هو `GET /care/appointments`. | قد تفشل بطاقة/قائمة مواعيد الطلبات. | صحح إلى ثابت route موثق مع Jest/typecheck وSandbox مت`
- `21: | G-MOBILE-002 | تطبيق المريض | `app/map/index.tsx` كان يستدعي `/user/insurance` غير الموجود؛ العقد الفعلي هو `GET /users/me/insurance`. | قد تفشل قراءة التأمين في الخريطة/التوجيه. | صحح إلى ثابت route موثق مع Jest/typecheck وSandbox متباعد`
- `23: | G-OAPI-002 | توثيق الخلفية | DTOs وresponses غير مكتملة لعمليات حساسة ظاهرة مثل login/refresh. كما تصف المواصفة كل معاملات `GET /care/doctors` الاستكشافية على أنها مطلوبة، بينما نجح تحقق Sandbox القرائي من المسار نفسه دون إرسالها؛ لا يمكن`
- `28: | G-HOME-001 | الرعاية المنزلية | يوفر OpenAPI قائمة `GET /home-care/bookings/my`، لكنه لا يعرّف `GET /home-care/bookings/{id}` للمريض، رغم وجود أوامر مزود الخدمة المشتقة من معرف الحجز. | لا يمكن إنشاء شاشة تفاصيل آمنة أو اختبار BOLA حي لها`
- `31: | G-SEO-002 | تصنيف كتالوج عام | تحقق API العام لمسار `GET /medicines` أعاد عناصر غير دوائية ظاهرة، مثل مستلزمات أطفال ونظارات ومنتجات عناية، إلى جانب عناصر دوائية؛ لا يوجد في العقد الحالي حقل نشر أو نوع كيان موثوق يميز الدواء. | وسم عناصر `
### backend_consumers_or_contracts
- `13: | G-API-001 | التكامل | لا يوجد ملف OpenAPI/عقود تسليم مستقل حتى الآن. | استنتاجات قد تختلف عن بيئة الإنتاج. | مقارنة controllers + ملف API + اختبار staging قبل connect. | حرجة | مفتوح |`
- `14: | G-CORS-001 | النشر | الإنتاج يحتاج `ALLOWED_ORIGINS`; نمط credential/token للويب غير محسوم. | فشل login/refresh أو تعريض tokens. | تأكيد domain/auth mode/CORS قبل المرحلة 4. | حرجة | مفتوح |`
- `16: | G-RTC-001 | لحظي | namespaces/room tokens لـSocket/LiveKit لم تثبت للويب. | زر اتصال غير وظيفي أو وصول غير مصرح. | feature gate إلى أن يثبت العقد وE2E. | عالية | مفتوح |`
- `20: | G-MOBILE-001 | تطبيق المريض | `app/orders/index.tsx` كان يستدعي `/care/appointments/mine` غير الموجود؛ العقد الفعلي هو `GET /care/appointments`. | قد تفشل بطاقة/قائمة مواعيد الطلبات. | صحح إلى ثابت route موثق مع Jest/typecheck وSandbox مت`
- `21: | G-MOBILE-002 | تطبيق المريض | `app/map/index.tsx` كان يستدعي `/user/insurance` غير الموجود؛ العقد الفعلي هو `GET /users/me/insurance`. | قد تفشل قراءة التأمين في الخريطة/التوجيه. | صحح إلى ثابت route موثق مع Jest/typecheck وSandbox متباعد`
- `28: | G-HOME-001 | الرعاية المنزلية | يوفر OpenAPI قائمة `GET /home-care/bookings/my`، لكنه لا يعرّف `GET /home-care/bookings/{id}` للمريض، رغم وجود أوامر مزود الخدمة المشتقة من معرف الحجز. | لا يمكن إنشاء شاشة تفاصيل آمنة أو اختبار BOLA حي لها`
- `29: | G-OTP-001 | المصادقة OTP | `POST /auth/verify-otp` يتحقق من الرمز ويعيد `{ ok: true }` فقط، ولا يعيد access/refresh token أو تفويضاً قصير العمر لتأسيس cookie جلسة الويب. | واجهة «دخول بـOTP» قد توحي للمريض بدخول ناجح بينما لا يمكن إنشاء ج`
### auth_ownership
- `5: | G-AUTH-001 | الجلسة | fallback guest محلي بعد فشل الاستعادة ورمز `guest_token` مصدرّي. | إخفاء غياب الهوية الحقيقية. | لا نقل؛ guest فقط إذا أعاد الخادم جلسة guest صريحة، وإلا offline/error. | حرجة | مفتوح |`
- `14: | G-CORS-001 | النشر | الإنتاج يحتاج `ALLOWED_ORIGINS`; نمط credential/token للويب غير محسوم. | فشل login/refresh أو تعريض tokens. | تأكيد domain/auth mode/CORS قبل المرحلة 4. | حرجة | مفتوح |`
- `15: | G-FILE-001 | الملفات | شكل upload وS3/signed URL ومحددات MIME لم تثبت بعد. | خطر base64/FU أو تسرب وثائق. | عقد رفع صريح، scan/status، signed read، اختبارات authorization. | حرجة | مفتوح |`
- `16: | G-RTC-001 | لحظي | namespaces/room tokens لـSocket/LiveKit لم تثبت للويب. | زر اتصال غير وظيفي أو وصول غير مصرح. | feature gate إلى أن يثبت العقد وE2E. | عالية | مفتوح |`
- `22: | G-OAPI-001 | توثيق الخلفية | المواصفة بلا `servers` وبلا security global/operation annotations كافية للحماية. | لا يمكن توليد/مراجعة عميل آمن من OpenAPI وحدها. | توثيق base URLs وbearer requirements وإعادة تصدير المواصفة. | عالية | مفتوح `
- `23: | G-OAPI-002 | توثيق الخلفية | DTOs وresponses غير مكتملة لعمليات حساسة ظاهرة مثل login/refresh. كما تصف المواصفة كل معاملات `GET /care/doctors` الاستكشافية على أنها مطلوبة، بينما نجح تحقق Sandbox القرائي من المسار نفسه دون إرسالها؛ لا يمكن`
- `29: | G-OTP-001 | المصادقة OTP | `POST /auth/verify-otp` يتحقق من الرمز ويعيد `{ ok: true }` فقط، ولا يعيد access/refresh token أو تفويضاً قصير العمر لتأسيس cookie جلسة الويب. | واجهة «دخول بـOTP» قد توحي للمريض بدخول ناجح بينما لا يمكن إنشاء ج`
- `30: | G-FAMILY-001 | إدارة العائلة | تحقق Sandbox لقائمة الأعضاء يعيد `user_id` و`role` و`permissions` و`joined_at` فقط، دون اسم معروض صالح للواجهة. | عرض user ID أو قائمة أعضاء غير مفهومة للمريض؛ كما لا ينبغي عرض permissions الخام. | الويب يخف`
### state_transitions
- `5: | G-AUTH-001 | الجلسة | fallback guest محلي بعد فشل الاستعادة ورمز `guest_token` مصدرّي. | إخفاء غياب الهوية الحقيقية. | لا نقل؛ guest فقط إذا أعاد الخادم جلسة guest صريحة، وإلا offline/error. | حرجة | مفتوح |`
- `7: | G-DATA-001 | الصيدلية | تصنيفات fallback وأسعار افتراضية صفرية في العرض. | بيانات كتالوج/مالية مضللة. | skeleton/empty/error فقط إلى أن تصل بيانات حقيقية. | حرجة | مفتوح |`
- `8: | G-DATA-002 | التشخيص | catch يعيد `data: []` عند فشل APIs. | error يظهر كعدم وجود عناصر. | Error state مع retry/trace؛ empty فقط بعد 200 حقيقي. | عالية | مفتوح |`
- `11: | G-ERROR-001 | متعدد | 24 catch صامتة مرشحة في مصدر المريض. | فشل غير قابل للفهم أو التشخيص. | لا ينقل؛ error taxonomy + observability في الويب. | عالية | مفتوح |`
- `15: | G-FILE-001 | الملفات | شكل upload وS3/signed URL ومحددات MIME لم تثبت بعد. | خطر base64/FU أو تسرب وثائق. | عقد رفع صريح، scan/status، signed read، اختبارات authorization. | حرجة | مفتوح |`
- `24: | G-DATA-004 | بيانات الاكتشاف | واجهة التخصصات العامة الحية أعادت تخصصات، لكن العينة الظاهرة كانت بعدّ مزودين `0`. أكد اختبار Sandbox اللاحق أن مساري `GET /care/specialties` و`GET /care/doctors` يعيدان سجلات غير فارغة إجمالاً، من دون طباعة`
### payment_insurance_relevance
- `11: | G-ERROR-001 | متعدد | 24 catch صامتة مرشحة في مصدر المريض. | فشل غير قابل للفهم أو التشخيص. | لا ينقل؛ error taxonomy + observability في الويب. | عالية | مفتوح |`
- `21: | G-MOBILE-002 | تطبيق المريض | `app/map/index.tsx` كان يستدعي `/user/insurance` غير الموجود؛ العقد الفعلي هو `GET /users/me/insurance`. | قد تفشل قراءة التأمين في الخريطة/التوجيه. | صحح إلى ثابت route موثق مع Jest/typecheck وSandbox متباعد`
### error_empty_loading_retry_cancel
- `5: | G-AUTH-001 | الجلسة | fallback guest محلي بعد فشل الاستعادة ورمز `guest_token` مصدرّي. | إخفاء غياب الهوية الحقيقية. | لا نقل؛ guest فقط إذا أعاد الخادم جلسة guest صريحة، وإلا offline/error. | حرجة | مفتوح |`
- `7: | G-DATA-001 | الصيدلية | تصنيفات fallback وأسعار افتراضية صفرية في العرض. | بيانات كتالوج/مالية مضللة. | skeleton/empty/error فقط إلى أن تصل بيانات حقيقية. | حرجة | مفتوح |`
- `8: | G-DATA-002 | التشخيص | catch يعيد `data: []` عند فشل APIs. | error يظهر كعدم وجود عناصر. | Error state مع retry/trace؛ empty فقط بعد 200 حقيقي. | عالية | مفتوح |`
- `11: | G-ERROR-001 | متعدد | 24 catch صامتة مرشحة في مصدر المريض. | فشل غير قابل للفهم أو التشخيص. | لا ينقل؛ error taxonomy + observability في الويب. | عالية | مفتوح |`
- `24: | G-DATA-004 | بيانات الاكتشاف | واجهة التخصصات العامة الحية أعادت تخصصات، لكن العينة الظاهرة كانت بعدّ مزودين `0`. أكد اختبار Sandbox اللاحق أن مساري `GET /care/specialties` و`GET /care/doctors` يعيدان سجلات غير فارغة إجمالاً، من دون طباعة`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
