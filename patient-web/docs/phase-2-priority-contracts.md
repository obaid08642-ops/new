# عقود المريض ذات الأولوية — ناتج تدقيق المصدر

> هذه قائمة مرجعية مستخرجة من controllers المصدرية، وليست بديلاً عن ملف OpenAPI/Swagger أو اختبار بيئة API الحية. جميع المسارات أدناه تقع تحت `/api/v1` بحسب bootstrap الخلفية.

| المجال | المسارات/التحولات المتحققة | أثر مباشر على Web App المريض |
|---|---|---|
| الجلسة والهوية | تسجيل/OTP/تجديد session من مصدر الهاتف؛ access+refresh token؛ rotation متسلسل؛ انتهاء مطلق 14 يوماً في `SessionManager`; revoke عند الرفض أو payload خاطئ. | HTTP-only cookie/BFF أو آلية token متفق عليها مع الخلفية؛ لا localStorage للـrefresh token؛ شاشة انتهاء جلسة واضحة وإبطال لجميع الاستعلامات الخاصة. |
| بيانات المريض | `GET/PATCH /users/me/profile`، notification/privacy/security settings، sessions، revoke session، addresses، wishlist. | shell خاص ومخزن state typed، لا بيانات حساب محلية بديلة، وإدارة أجهزة/جلسات منفصلة. |
| الملف الصحي | `GET/PATCH /medical-profile` وتحولات chronic diseases/allergies/surgeries/long-term medications؛ `GET /medical-profile/passport-token`. | نماذج مقسمة مع server validation، QR قصير الأجل غير قابل للفهرسة ولا يوضع في URL. |
| الصحة | vitals list/chart/recent/latest/summary/score CRUD؛ sleep؛ reminders create/update/log/refill/snooze/cancel/delete؛ reports/prescriptions/emergency contacts/chronic/trends. | dashboard ومدخلات صحية بحالات loading/error/success صريحة، ومزامنة بعد mutation؛ التذكير يتطلب قدرة إشعار ويب متفقاً عليها أو يعرض القناة المتاحة فعلياً. |
| العائلة | group create/invite/join/leave/members؛ relation/permission؛ member records/health؛ calendar؛ permission request/respond. كلها تحمي JWT و`NoGuestsGuard`. | لا تبديل شخص من الواجهة وحدها؛ كل access يعتمد نتائج تفويض الخادم، والضيف لا يدخل هذه الطرق. |
| الأطباء والاكتشاف | `GET /care/doctors` يدعم specialty/service type/available today/q/city/facility/degree/insurance/geolocation/sort/pagination؛ details، slots، facilities، specialties، smart search. | filter params من URL العامة فقط دون PHI؛ صفحات public للكيانات المنشورة فقط؛ لا قائمة تأمين ثابتة أو فرز زائف على العميل. |
| الاستشارات | `POST/GET /care/appointments`، details، waitlist، cancel، reschedule، check-in، summary. التحولات الخاصة بالطبيب/admin محمية أدوارياً. | المريض يرى وينفذ فقط create/list/detail/cancel/reschedule/check-in/summary وفق response؛ لا أزرار حالة مقدم الخدمة. |
| الطلبات | patient create/mine/reorder/reorder-partial/cancel/approve-or-reject basket/detail/tracking/pdf؛ roles تفصل الصيدلية والتوصيل والإدارة. | checkout وتاريخ وتتبع وحالة سلة المراجعة حقيقية؛ إخفاء إجراءات مزود الخدمة من واجهة المريض. |
| المختبر والأشعة | catalogs عامة؛ services/details/categories/modality؛ bookings للمريض، cancel/reschedule/tracking/documents/insurance/reports؛ filters server-side للبحث والزيارة المنزلية والتقييم والقرب والسعر. | كل filter mapping إلى backend؛ نتائج/مستندات خاصة `noindex`؛ حالة عدم توفر واضحة لا قائمة فارغة متخفية. |

## قرارات معمارية تنتظر تأكيد البيئة

1. **نمط المصادقة للويب:** يجب أن يثبت ملف API ما إذا كانت الواجهة ستستخدم `Authorization: Bearer` مباشرة مع refresh آمن، أم BFF ينقل refresh إلى cookie محمي. لن أخمّن هذا القرار.
2. **عنوان API والـCORS:** الخلفية تتطلب `ALLOWED_ORIGINS` في الإنتاج. يسجل عنوان Web App الإنتاجي وقنوات التطوير والـcredentials قبل اختبار اتصال حي.
3. **الملفات:** سلوك رفع مستندات الوصفات/التأمين والتقارير يحتاج شكل upload النهائي وقيود الحجم/MIME ومسار التخزين؛ لا يوضع base64 في UI كحل بديل.
4. **لحظية الصوت/الفيديو:** يثبت namespace/token/authorization لـSocket.IO وLiveKit قبل بناء waiting room أو call route. لا تعرض زر مكالمة يعمل شكلياً فقط.
