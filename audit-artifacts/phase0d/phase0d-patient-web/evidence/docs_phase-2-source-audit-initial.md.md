# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-2-source-audit-initial.md`
- **Member SHA-256:** `4438be18f0b0fda7546e0a4980333a58d091c8d5f5590b296ad10344e1fc7b91`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: تم استنساخ الفرع `main` من مستودع المستخدم وفك أرشيف تطبيق المريض وأرشيف الخلفية إلى مساحة تدقيق منفصلة بعد فحص مسارات الأرشيف. يحتوي تطبيق المريض على Expo Router وReact Native/Expo SDK 57، والـBackend على NestJS. لم تُشغّل أي شفرة مستخدم أ`
- `12: | شجرة مسارات المريض | تم إحصاء **249 route file** فعلياً داخل `app/`، موزعة على المصادقة، التبويبات، الصيدلية، التشخيص، الحجوزات، الأسرة، الصحة، التأمين، التغذية، الحمل، الصحة النفسية، الذكاء الاصطناعي، المحفظة، التقارير، الدعم والطوارئ. |`
- `15: | المصادقة | المصدر يؤكد register/login/guest/OTP/reset/social/refresh، وحماية JWT، وrate limiting، ودورة refresh ذات queue ومدة قصوى للجلسة على الهاتف. |`
- `27: | `G-I18N-001` | جذر التطبيق يستدعي `I18nManager.forceRTL(true)` بلا شرط لغة. | قد يكسر الإنجليزية/LTR وتناسق الويب متعدد اللغات. | الويب يبني direction من locale على مستوى الوثيقة والroute، مع اختبار RTL/LTR. |`
- `31: | `G-DATA-003` | مدخل الاستشارات يحتوي قائمة شركات/فئات تأمين ثابتة وfallback route بمعرف `d1` عند غياب المعرف. | بيانات تأمين/معرف طبيب غير موثقة؛ خطر توجيه خاطئ. | الويب يستخدم `/insurance/companies` وما يثبته العقد؛ لا معرفات أو قوائم ثا`
- `38: | المصادقة | `POST /auth/register`، `login`، `send-otp`، `verify-otp`، `reset-password`، `social-login`، `refresh`، وإجراءات جلسات/consent. |`
- `41: | الطلبات | create/mine/reorder/cancel/tracking/owner-checked details/basket approval، مع تفويض منفصل للصيدلية والإدارة والتوصيل. |`
- `42: | المختبر والأشعة | catalog عام، تفاصيل، bookings للمريض، إلغاء، tracking، documents وinsurance؛ وتوجد فلاتر فعلية في controller للبحث والسعر والقرب والتوفر المنزلي. |`
- `46: يستكمل التدقيق بمقارنة route-by-route مع استدعاءات API وحالات التحميل/الفراغ/الخطأ وguards الخلفية، ثم تُنشأ مصفوفة التكافؤ وسجل العقود المفقودة. عند تزويد ملف API الكامل، يضاف كدليل مستقل ويطابق بالـcontrollers والمصدر بدلاً من استبدالهما.`
- `61: شغّل محلل ساكن مخصص على **551 ملفاً** قابلاً للقراءة في المصدر، بينها **250 ملف route** تحت `app/` و**120 ملفاً** يحوي استدعاءات API مباشرة. لم يشغّل المحلل أي شفرة تطبيق أو اتصالاً بالخلفية؛ اقتصر على قراءة النصوص واستخراج علامات المراجعة.`
- `69: | فرض RTL | 1 | يسجل كـ`G-I18N-001` ويستبدل بقرار locale لكل route/document. |`
### backend_consumers_or_contracts
- `13: | بنية التنقل | الجذر يضم Redux وApp/Socket/Cart/Diagnostics/Consultations providers وOffline Banner وNotification Handler؛ التبويبات الرئيسة هي المنزل والاستشارات والصيدلية والتشخيص والخدمات والصحة. |`
- `14: | عنوان الخلفية | عميل الهاتف يكوّن قاعدة API من `EXPO_PUBLIC_API_URL` أو `https://api.nabd.plus/api/v1`. الخلفية تضبط `api` كـglobal prefix وURI version `v1`، ما يثبت مسار `/api/v1`. |`
- `20: استخراج `apiFetch()` من تطبيق المريض أظهر استدعاءات تحت المجالات: `auth` و`users` و`medical-profile` و`health` و`family` و`medicines` و`cart` و`orders` و`care` و`labs` و`radiology` و`home-care` و`insurance` و`wallet` و`notifications` و`supp`
- `26: | `G-AUTH-001` | `app/_layout.tsx` ينشئ local guest shell عند تعذر إعادة المصادقة ويضع `token: 'guest_token'`. | نجاح أو هوية محلية غير حقيقية عند غياب الخلفية. | لا ينقل للويب؛ يعتمد guest UI فقط على استجابة `/auth/guest` حقيقية أو يظهر حا`
- `29: | `G-DATA-002` | شاشة التشخيص تحول فشل `/labs/*` و`/radiology/services` و`/providers` إلى `{ data: [] }`. | إخفاء فشل العقد كأنه empty state حقيقي. | فصل error عن empty في الويب وفتح gap إذا كانت الاستجابة/العقد غير متاح. |`
- `31: | `G-DATA-003` | مدخل الاستشارات يحتوي قائمة شركات/فئات تأمين ثابتة وfallback route بمعرف `d1` عند غياب المعرف. | بيانات تأمين/معرف طبيب غير موثقة؛ خطر توجيه خاطئ. | الويب يستخدم `/insurance/companies` وما يثبته العقد؛ لا معرفات أو قوائم ثا`
- `32: | `G-ERROR-001` | توجد catch صامتة أو تحويل إلى قوائم فارغة في عدة شاشات، منها wallet/settings/insurance/pharmacy. | عدم وضوح الأعطال للمريض وصعوبة تتبع التكامل. | تدقيق كل موضع وتصنيف ما إذا كان cache مقبولاً، empty state، أو gap يجب إصلاح`
- `38: | المصادقة | `POST /auth/register`، `login`، `send-otp`، `verify-otp`، `reset-password`، `social-login`، `refresh`، وإجراءات جلسات/consent. |`
### auth_ownership
- `15: | المصادقة | المصدر يؤكد register/login/guest/OTP/reset/social/refresh، وحماية JWT، وrate limiting، ودورة refresh ذات queue ومدة قصوى للجلسة على الهاتف. |`
- `26: | `G-AUTH-001` | `app/_layout.tsx` ينشئ local guest shell عند تعذر إعادة المصادقة ويضع `token: 'guest_token'`. | نجاح أو هوية محلية غير حقيقية عند غياب الخلفية. | لا ينقل للويب؛ يعتمد guest UI فقط على استجابة `/auth/guest` حقيقية أو يظهر حا`
- `38: | المصادقة | `POST /auth/register`، `login`، `send-otp`، `verify-otp`، `reset-password`، `social-login`، `refresh`، وإجراءات جلسات/consent. |`
- `39: | ملف المريض | `GET/PATCH /users/me/profile`، إعدادات الإشعار والخصوصية والأمان، sessions، wishlist، وإدارة العناوين في controller منفصل. |`
- `40: | الملف الطبي | `GET/PATCH /medical-profile` وتحولات الأمراض المزمنة والحساسيات والعمليات والأدوية الطويلة، وhealth-passport token. |`
- `41: | الطلبات | create/mine/reorder/cancel/tracking/owner-checked details/basket approval، مع تفويض منفصل للصيدلية والإدارة والتوصيل. |`
### state_transitions
- `29: | `G-DATA-002` | شاشة التشخيص تحول فشل `/labs/*` و`/radiology/services` و`/providers` إلى `{ data: [] }`. | إخفاء فشل العقد كأنه empty state حقيقي. | فصل error عن empty في الويب وفتح gap إذا كانت الاستجابة/العقد غير متاح. |`
- `32: | `G-ERROR-001` | توجد catch صامتة أو تحويل إلى قوائم فارغة في عدة شاشات، منها wallet/settings/insurance/pharmacy. | عدم وضوح الأعطال للمريض وصعوبة تتبع التكامل. | تدقيق كل موضع وتصنيف ما إذا كان cache مقبولاً، empty state، أو gap يجب إصلاح`
- `41: | الطلبات | create/mine/reorder/cancel/tracking/owner-checked details/basket approval، مع تفويض منفصل للصيدلية والإدارة والتوصيل. |`
- `67: | `catch {}` صامت | 24 | يصنّف كل موضع إلى cache مسموح أو حالة خطأ مفقودة أو فجوة عقد؛ الويب يميّز error وempty وoffline. |`
### payment_insurance_relevance
- `20: استخراج `apiFetch()` من تطبيق المريض أظهر استدعاءات تحت المجالات: `auth` و`users` و`medical-profile` و`health` و`family` و`medicines` و`cart` و`orders` و`care` و`labs` و`radiology` و`home-care` و`insurance` و`wallet` و`notifications` و`supp`
- `30: | `G-FLOW-001` | فلاتر التشخيص الأساسية محلية حالياً، بينما controller الخلفي يدعم فلاتر مثل search/home/highest_rated/nearest/lowest_price. | تفاوت نتائج ومقياس غير حقيقي للمريض. | الويب يربط الفلاتر إلى query parameters المدعومة؛ المتبقي `
- `31: | `G-DATA-003` | مدخل الاستشارات يحتوي قائمة شركات/فئات تأمين ثابتة وfallback route بمعرف `d1` عند غياب المعرف. | بيانات تأمين/معرف طبيب غير موثقة؛ خطر توجيه خاطئ. | الويب يستخدم `/insurance/companies` وما يثبته العقد؛ لا معرفات أو قوائم ثا`
- `32: | `G-ERROR-001` | توجد catch صامتة أو تحويل إلى قوائم فارغة في عدة شاشات، منها wallet/settings/insurance/pharmacy. | عدم وضوح الأعطال للمريض وصعوبة تتبع التكامل. | تدقيق كل موضع وتصنيف ما إذا كان cache مقبولاً، empty state، أو gap يجب إصلاح`
- `42: | المختبر والأشعة | catalog عام، تفاصيل، bookings للمريض، إلغاء، tracking، documents وinsurance؛ وتوجد فلاتر فعلية في controller للبحث والسعر والقرب والتوفر المنزلي. |`
### error_empty_loading_retry_cancel
- `13: | بنية التنقل | الجذر يضم Redux وApp/Socket/Cart/Diagnostics/Consultations providers وOffline Banner وNotification Handler؛ التبويبات الرئيسة هي المنزل والاستشارات والصيدلية والتشخيص والخدمات والصحة. |`
- `29: | `G-DATA-002` | شاشة التشخيص تحول فشل `/labs/*` و`/radiology/services` و`/providers` إلى `{ data: [] }`. | إخفاء فشل العقد كأنه empty state حقيقي. | فصل error عن empty في الويب وفتح gap إذا كانت الاستجابة/العقد غير متاح. |`
- `32: | `G-ERROR-001` | توجد catch صامتة أو تحويل إلى قوائم فارغة في عدة شاشات، منها wallet/settings/insurance/pharmacy. | عدم وضوح الأعطال للمريض وصعوبة تتبع التكامل. | تدقيق كل موضع وتصنيف ما إذا كان cache مقبولاً، empty state، أو gap يجب إصلاح`
- `41: | الطلبات | create/mine/reorder/cancel/tracking/owner-checked details/basket approval، مع تفويض منفصل للصيدلية والإدارة والتوصيل. |`
- `67: | `catch {}` صامت | 24 | يصنّف كل موضع إلى cache مسموح أو حالة خطأ مفقودة أو فجوة عقد؛ الويب يميّز error وempty وoffline. |`
- `68: | تحويل catch إلى قائمة بيانات فارغة | 1 | يسجل كـ`G-DATA-002` ويمنع إخفاء عطل API كأنه غياب نتائج. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
