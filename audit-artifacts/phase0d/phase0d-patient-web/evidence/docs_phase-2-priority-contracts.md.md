# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-2-priority-contracts.md`
- **Member SHA-256:** `10339d15cea2afe62139cfbe7caa7fce90027e8737c399236333ae53906c4100`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: | الصحة | vitals list/chart/recent/latest/summary/score CRUD؛ sleep؛ reminders create/update/log/refill/snooze/cancel/delete؛ reports/prescriptions/emergency contacts/chronic/trends. | dashboard ومدخلات صحية بحالات loading/error/success صري`
- `13: | الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛`
- `14: | الطلبات | patient create/mine/reorder/reorder-partial/cancel/approve-or-reject basket/detail/tracking/pdf؛ roles تفصل الصيدلية والتوصيل والإدارة. | checkout وتاريخ وتتبع وحالة سلة المراجعة حقيقية؛ إخفاء إجراءات مزود الخدمة من واجهة المريض`
- `15: | المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى ba`
- `21: 3. **الملفات:** سلوك رفع مستندات الوصفات/التأمين والتقارير يحتاج شكل upload النهائي وقيود الحجم/MIME ومسار التخزين؛ لا يوضع base64 في UI كحل بديل.`
- `22: 4. **لحظية الصوت/الفيديو:** يثبت namespace/token/authorization لـSocket.IO وLiveKit قبل بناء waiting room أو call route. لا تعرض زر مكالمة يعمل شكلياً فقط.`
### backend_consumers_or_contracts
- `3: > هذه قائمة مرجعية مستخرجة من controllers المصدرية، وليست بديلاً عن ملف OpenAPI/Swagger أو اختبار بيئة API الحية. جميع المسارات أدناه تقع تحت `/api/v1` بحسب bootstrap الخلفية.`
- `12: | الأطباء والاكتشاف | `GET /care/doctors` يدعم specialty/service type/available today/q/city/facility/degree/insurance/geolocation/sort/pagination؛ details، slots، facilities، specialties، smart search. | filter params من URL العامة فقط دون`
- `13: | الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛`
- `15: | المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى ba`
- `22: 4. **لحظية الصوت/الفيديو:** يثبت namespace/token/authorization لـSocket.IO وLiveKit قبل بناء waiting room أو call route. لا تعرض زر مكالمة يعمل شكلياً فقط.`
### auth_ownership
- `7: | الجلسة والهوية | تسجيل/OTP/تجديد session من مصدر الهاتف؛ access+refresh token؛ rotation متسلسل؛ انتهاء مطلق 14 يوماً في `SessionManager`; revoke عند الرفض أو payload خاطئ. | HTTP-only cookie/BFF أو آلية token متفق عليها مع الخلفية؛ لا loc`
- `8: | بيانات المريض | `GET/PATCH /users/me/profile`، notification/privacy/security settings، sessions، revoke session، addresses، wishlist. | shell خاص ومخزن state typed، لا بيانات حساب محلية بديلة، وإدارة أجهزة/جلسات منفصلة. |`
- `9: | الملف الصحي | `GET/PATCH /medical-profile` وتحولات chronic diseases/allergies/surgeries/long-term medications؛ `GET /medical-profile/passport-token`. | نماذج مقسمة مع server validation، QR قصير الأجل غير قابل للفهرسة ولا يوضع في URL. |`
- `11: | العائلة | group create/invite/join/leave/members؛ relation/permission؛ member records/health؛ calendar؛ permission request/respond. كلها تحمي JWT و`NoGuestsGuard`. | لا تبديل شخص من الواجهة وحدها؛ كل access يعتمد نتائج تفويض الخادم، والضي`
- `13: | الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛`
- `14: | الطلبات | patient create/mine/reorder/reorder-partial/cancel/approve-or-reject basket/detail/tracking/pdf؛ roles تفصل الصيدلية والتوصيل والإدارة. | checkout وتاريخ وتتبع وحالة سلة المراجعة حقيقية؛ إخفاء إجراءات مزود الخدمة من واجهة المريض`
- `19: 1. **نمط المصادقة للويب:** يجب أن يثبت ملف API ما إذا كانت الواجهة ستستخدم `Authorization: Bearer` مباشرة مع refresh آمن، أم BFF ينقل refresh إلى cookie محمي. لن أخمّن هذا القرار.`
- `22: 4. **لحظية الصوت/الفيديو:** يثبت namespace/token/authorization لـSocket.IO وLiveKit قبل بناء waiting room أو call route. لا تعرض زر مكالمة يعمل شكلياً فقط.`
### state_transitions
- `8: | بيانات المريض | `GET/PATCH /users/me/profile`، notification/privacy/security settings، sessions، revoke session، addresses، wishlist. | shell خاص ومخزن state typed، لا بيانات حساب محلية بديلة، وإدارة أجهزة/جلسات منفصلة. |`
- `10: | الصحة | vitals list/chart/recent/latest/summary/score CRUD؛ sleep؛ reminders create/update/log/refill/snooze/cancel/delete؛ reports/prescriptions/emergency contacts/chronic/trends. | dashboard ومدخلات صحية بحالات loading/error/success صري`
- `13: | الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛`
- `14: | الطلبات | patient create/mine/reorder/reorder-partial/cancel/approve-or-reject basket/detail/tracking/pdf؛ roles تفصل الصيدلية والتوصيل والإدارة. | checkout وتاريخ وتتبع وحالة سلة المراجعة حقيقية؛ إخفاء إجراءات مزود الخدمة من واجهة المريض`
- `15: | المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى ba`
### payment_insurance_relevance
- `7: | الجلسة والهوية | تسجيل/OTP/تجديد session من مصدر الهاتف؛ access+refresh token؛ rotation متسلسل؛ انتهاء مطلق 14 يوماً في `SessionManager`; revoke عند الرفض أو payload خاطئ. | HTTP-only cookie/BFF أو آلية token متفق عليها مع الخلفية؛ لا loc`
- `12: | الأطباء والاكتشاف | `GET /care/doctors` يدعم specialty/service type/available today/q/city/facility/degree/insurance/geolocation/sort/pagination؛ details، slots، facilities، specialties، smart search. | filter params من URL العامة فقط دون`
- `15: | المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى ba`
### error_empty_loading_retry_cancel
- `10: | الصحة | vitals list/chart/recent/latest/summary/score CRUD؛ sleep؛ reminders create/update/log/refill/snooze/cancel/delete؛ reports/prescriptions/emergency contacts/chronic/trends. | dashboard ومدخلات صحية بحالات loading/error/success صري`
- `13: | الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛`
- `14: | الطلبات | patient create/mine/reorder/reorder-partial/cancel/approve-or-reject basket/detail/tracking/pdf؛ roles تفصل الصيدلية والتوصيل والإدارة. | checkout وتاريخ وتتبع وحالة سلة المراجعة حقيقية؛ إخفاء إجراءات مزود الخدمة من واجهة المريض`
- `15: | المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى ba`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
