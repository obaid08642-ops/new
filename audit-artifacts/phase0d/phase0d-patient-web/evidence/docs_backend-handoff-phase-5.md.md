# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/backend-handoff-phase-5.md`
- **Member SHA-256:** `43e35b68f19d54d15e3497fce6706ebc168e7f4395f44b68bd0719e2876b751c`
- **Line count:** 194
- **Read range:** `1-194`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: أضيفوا عملية مريض قرائية صريحة: `GET /home-care/bookings/{bookingId}`. يجب أن يستنتج الخادم المريض من JWT، ويطبق شرط ملكية في الاستعلام نفسه، ويعيد `404` عند عدم وجود الحجز أو عدم ملكيته. لا تقبلوا `patientId` أو `userId` من query أو body ل`
- `27: | Path parameter | `bookingId` بصيغة المعرّف الرسمي فقط | تمرير معرّف مريض أو مزود أو مهمة في URI |`
- `29: | التفويض | `booking.patient_id = currentUser.id` في backend | تحقق واجهة أو إرجاع مورد مريض آخر ثم إخفاؤه |`
- `33: **معيار القبول.** يسجل حساب Sandbox المالك ويقرأ حجزه بـ`200`، بينما الحساب الآخر يحصل على `404` لنفس `bookingId`. يثبت اختبار SSR أن HTML لا يضم المعرف أو الموقع أو أي ملاحظة أو رابط تقرير أو توكن.`
- `41: | جلسة كاملة مباشرة | نفس بنية `POST /auth/login`: `accessToken` و`refreshToken` وبيانات device اللازمة | تدوير/إبطال الرمز بعد استخدام واحد، حد معدل، صلاحية قصيرة، وتحقق ملكية القناة |`
- `118: | الخصوصية | القائمة لا تعيد route action أو delivery metadata أو device token إلى DTO العرض | رابط داخلي/خارجي قابل للتنفيذ أو بيانات تسليم push |`
- `180: | قائمة عامة | `GET /public/catalogue?entity_type=medicine&locale=ar&page=…` لا يعيد إلا `is_published=true` | إرجاع عناصر مختلطة ثم الاعتماد على الويب لتخمين النوع |`
- `190: قبل تفعيل رفع وثيقة أو نتيجة أو محادثة أو مكالمة، يلزم توثيق endpoint منح upload ومحددات MIME والحجم وفحص الحالة وعمر URL الموقّع وقاعدة ملكية القراءة. وللمكالمات أو الاتصال اللحظي، يلزم إصدار room token قصير العمر مربوط بالمريض والمشارك وا`
### backend_consumers_or_contracts
- `23: أضيفوا عملية مريض قرائية صريحة: `GET /home-care/bookings/{bookingId}`. يجب أن يستنتج الخادم المريض من JWT، ويطبق شرط ملكية في الاستعلام نفسه، ويعيد `404` عند عدم وجود الحجز أو عدم ملكيته. لا تقبلوا `patientId` أو `userId` من query أو body ل`
- `37: يحافظ `POST /auth/verify-otp` على الغرض الأمني للتحقق، لكنه يجب ألا يعيد `{ ok: true }` وحدها لرحلة دخول. اختاروا أحد العقدين التاليين فقط، ووثقوا الاختيار في OpenAPI:`
- `41: | جلسة كاملة مباشرة | نفس بنية `POST /auth/login`: `accessToken` و`refreshToken` وبيانات device اللازمة | تدوير/إبطال الرمز بعد استخدام واحد، حد معدل، صلاحية قصيرة، وتحقق ملكية القناة |`
### auth_ownership
- `10: | حرجة | G-OTP-001 | لا يمكن إنشاء جلسة ويب بعد تحقق OTP | تعطيل دخول OTP؛ دخول كلمة المرور فقط |`
- `23: أضيفوا عملية مريض قرائية صريحة: `GET /home-care/bookings/{bookingId}`. يجب أن يستنتج الخادم المريض من JWT، ويطبق شرط ملكية في الاستعلام نفسه، ويعيد `404` عند عدم وجود الحجز أو عدم ملكيته. لا تقبلوا `patientId` أو `userId` من query أو body ل`
- `31: | OpenAPI | Bearer security وDTO نجاح/خطأ كاملان | تعريف مسار بلا responses أو security |`
- `35: ## G-OTP-001 — تأسيس جلسة بعد تحقق OTP`
- `37: يحافظ `POST /auth/verify-otp` على الغرض الأمني للتحقق، لكنه يجب ألا يعيد `{ ok: true }` وحدها لرحلة دخول. اختاروا أحد العقدين التاليين فقط، ووثقوا الاختيار في OpenAPI:`
- `41: | جلسة كاملة مباشرة | نفس بنية `POST /auth/login`: `accessToken` و`refreshToken` وبيانات device اللازمة | تدوير/إبطال الرمز بعد استخدام واحد، حد معدل، صلاحية قصيرة، وتحقق ملكية القناة |`
- `42: | رمز تبديل قصير العمر | `exchange_token` أحادي الاستخدام مع `expires_at` | endpoint تبديل خادمي فقط يعيد حزمة الجلسة؛ لا يقبل client-side token في URL |`
- `44: يجب أن تعرف استجابات الفشل `400` أو `422` للمدخلات غير الصالحة، و`401` أو `403` للرمز غير الصالح أو المنتهي، و`429` لحد المعدل، دون إخبار العميل ما إذا كان رقم الهاتف أو البريد مسجلاً. لا يضع Web App أي توكن في `localStorage` أو query strin`
- `60: لا يعيد DTO: `user_id`، البريد أو الهاتف، tokens، مسارات تخزين خام، بيانات اعتماد، سجل جلسات، أو حقول admin/provider. إن كانت صورة الحساب خاصة، فلتكن `avatar_url` مؤقتة وموقعة ومحدودة العمر، أو اجعلوا القيمة `null` بدلاً من رابط عام ثابت.`
- `64: ينبغي أن يحل DTO مقيد محل `user_id` و`permissions` الخام. يكفي للصفحة القرائية الحالية الاسم المعروض والدور وتاريخ الانضمام عند إتاحته.`
- `69: role: "owner" | "member" | "dependent";`
- `82: | التفويض | `prescription.patient_id = currentUser.id` في الاستعلام الخادمي | تمرير `patientId` أو الاعتماد على إخفاء الواجهة |`
### state_transitions
- `28: | DTO العرض | `service_name` أو رمز خدمة منشور، `status`، وموعد مجدول موحد المنطقة الزمنية عند توفره | موقع المريض، رقم هاتفه، ملاحظات سريرية، مرفقات، إحداثيات، سعر أو حقول مزود داخلية |`
- `86: | OpenAPI | Bearer security، نمط المعرف، success/error DTOs، وحدود الحقول المعروضة | مسار غير موثق أو DTO تخزين داخلي |`
- `100: | الحدود | لا إرسال ولا تسليم ولا تعليم قراءة ولا إنشاء thread أو مكالمة حتى تثبت عمليات mutation وtoken/RTC | زر أو mutation شكلي أو client-side state بديل |`
- `107: أظهر تحقق Sandbox أن بعض العناصر تعيد مفاتيح مثل `notif.service.confirmed.title` داخل حقول `title` و`body`، وهي ليست نصاً صالحاً للعرض للمريض. لا ينبغي للويب تمرير مفاتيح خلفية غير موثقة مباشرة إلى محرك ترجمة الواجهة، ولا عرضها كنص خام. اخت`
- `145: **معيار القبول.** يختبر Sandbox أن كل تخصص منشور يعيد عدداً صحيحاً غير سالب، وأن أي تخصص بعدد أكبر من صفر ينتج قائمة أطباء منشورة عند الفلترة نفسها. يبقى الويب على empty state ولا يعرض العَدّ حتى تسليم العقد وتحقق هذا المعيار.`
### payment_insurance_relevance
- `117: | النص | لا يحتوي placeholder غير محلول أو معرف تعقب/مورد لا يملك المريض تصريحاً برؤيته | `notif.*` داخل `title`/`body`، مسار action أو JSON payload في النص |`
### error_empty_loading_retry_cancel
- `86: | OpenAPI | Bearer security، نمط المعرف، success/error DTOs، وحدود الحقول المعروضة | مسار غير موثق أو DTO تخزين داخلي |`
- `145: **معيار القبول.** يختبر Sandbox أن كل تخصص منشور يعيد عدداً صحيحاً غير سالب، وأن أي تخصص بعدد أكبر من صفر ينتج قائمة أطباء منشورة عند الفلترة نفسها. يبقى الويب على empty state ولا يعرض العَدّ حتى تسليم العقد وتحقق هذا المعيار.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
