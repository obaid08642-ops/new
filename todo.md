# قائمة استئناف مصالحة منصة نبض

## مكتمل ومثبت

- [x] Phase 2: تقوية الإعدادات والشبكة، CORS، JWT، WebSocket، وعملاء API.
- [x] Phase 3: معالجة checkout وQR والبيانات التركيبية ومسار الطوارئ.
- [x] Phase 4: ربط مسار الصيدلية والوصفة وOCR والتتبع وإعادة الطلب بعقود backend الحية.
- [x] Phase 5: قاموس تطبيق المريض للغات AR/EN/UR/HI/BN/FIL وربط Text وAlert بالترجمة المركزية.
- [x] Phase 6: تطبيع runtime config، إغلاق BOLA الطبي fail-closed، وحجب QR غير المتعاقد عليه.
- [x] Phase 7: تقرير الجاهزية وخطة staging/E2E؛ الالتزام `9ff137f` مرفوع على فرع المصالحة.

## أعمال مصدرية مفتوحة للاستئناف

- [ ] فحص العقود الحساسة المتبقية: consent/QR verifier، موقع الطوارئ، أكواد أخطاء API، وعقد WebSocket/LiveKit.
- [ ] فحص مسارات الأشعة والملفات والتخزين والمعاملات متعددة الخطوات بحثاً عن نجاح محلي أو رد ثابت.
- [ ] مراجعة تبعيات كل حزمة وlockfiles دون تنفيذ ترقية عشوائية قد تكسر Expo/Nest/Next.
- [ ] تحديث سجل المصالحة والتقرير التفاعلي فقط بعد إثبات كل نتيجة جديدة.

## موانع لا تُغلق دون staging منفصلة

- [ ] تدوير اعتماد R2 المكشوف خارج Git ومن خلال secret manager.
- [ ] نشر فرع المصالحة في staging منفصلة مع Mongo وRedis وJWT وOrigins وstorage/payment test sinks.
- [ ] تنفيذ E2E للأدوار والملكية وOTP/2FA وWebSocket وQR/consent والحجز والصيدلية وOCR والدفع والويبهوك.
- [ ] تنفيذ UAT للتوطين الستّي وRTL/LTR وإمكانية الوصول على أجهزة فعلية.
- [ ] مراجعة أمن وخصوصية واعتماد منتج قبل الدمج أو المتاجر.

## قاعدة الحوكمة

لا يُختبر أو يُعدّل الإنتاج. لا تُنشأ بيانات أو أسرار اختبار داخل Git أو التقرير. لا تُفعّل واجهة أو عقداً حساساً بمجرد نجاح البناء؛ يلزم مصدر حي، backend، route، schema، مستهلك واجهة، ثم اختبار staging موثق.

آخر تحديث: 2026-08-16، بعد الالتزام `e521b57` ومراجعة تنفيذ الخطة.
إعداد: Manus AI

## References

لا توجد مراجع خارجية؛ هذه القائمة مبنية على سجل المصالحة ونتائج بوابات البناء والاختبار داخل المستودع المعزول.

[1]: ../audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"
[2]: ../audit-artifacts/NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة وحكم الجاهزية"
[3]: ../audit-artifacts/POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"

## References

[1]: audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"
[2]: audit-artifacts/NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة وحكم الجاهزية"
[3]: audit-artifacts/POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"

- [x] إصلاح عدم تطابق شاشة FacilityDashboard مع عقد `HospitalStaffModule`: استبدال `/provider/features/staff` بـ`/hospital/staff`، وتمرير `staff_role`، واستخدام `id` العائد من backend بدلاً من `NBD-` المحلي؛ بوابة المزوّد 3/3 وتصدير iOS ناجحان.
- [x] مراجعة مسارات facility/staff التي ظهرت في الجرد: توحدت القائمة والمؤشرات وشاشات الاعتماد مع `/hospital/staff`، وأزيلت نجاحات العرض المحلي؛ تبقى اختبارات staging للملكية والصلاحيات.
- [x] حجب endpoint الموروث `provider/features/staff` بعد إثبات أن المستهلك الوحيد انتقل إلى `hospital/staff`، ومنع مسار إنشاء موظفين لا يطبق ملكية المالك بنفس عقد HospitalStaffModule؛ backend 26/211 والمزوّد 3/3 وتصدير iOS ناجحة.
- [x] تدقيق شامل للخطة الحاكمة مقابل السجل والالتزامات والملفات والبوابات، وتصنيف كل بند منفذاً أو جزئياً أو غير منفذ مع سبب وإجراء لاحق؛ المصفوفة في `EXECUTION_COMPLETION_MATRIX_20260816.md`.
- [x] مطابقة الموانع التشغيلية والعقود التي تحتاج staging مع خطة E2E وعدم عدّها مكتملة قبل اختبارها؛ جميع IDs مصنفة غير منفذة قبولياً حتى توفير staging.
- [x] استبدال مستهلكات `/provider/facility/subaccounts` غير المعرفة بعقد `/hospital/staff` في مؤشرات المنشأة وشاشات الاعتماد؛ بوابة provider 3/3 وتصدير iOS ناجحان.
- [x] إزالة `lastLogin: 'اليوم'` و`NBD-*`/`NBD-F000` المصطنعة من عرض الموظفين؛ يعرض consumer حقول backend أو عبارة إدارة الخادم.
- [x] ربط حذف موظف المنشأة بـ`DELETE /hospital/staff/:id` مع تحقق الملكية وحالة نجاح من الخادم بدلاً من toast محلي.
- [x] حجب بطاقة QR الشكلية وأزرار الحفظ/المشاركة التي تعلن نجاحاً محلياً بلا عقد credential/QR معتمد.

## Gatekeeper remediation — 2026-08-17

- [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.
- [x] P1: توحيد دور provider/provider_type في حارس JWT وخدمات Labs وHome Care وHospital Staff، وإضافة أدوار Radiology التشغيلية.
- [x] P1: إصلاح `HospitalService` ومخططات الهوية المرتبطة لاستخدام UUID/string في مسارات staff وonboardDoctor والتجميع.
- [x] P2: جعل Jest يضبط JWT_SECRET في setup وتشغيل المجموعة المحلية: 215/215 ناجحة.
- [x] P2: حصر فوالب localhost في app.module.ts وredis.service.ts خارج production فقط.
- [ ] إعادة تشغيل مصفوفة staging E2E للأدوار والملكية بعد رفع الإصلاحات، ولا تُعد 23/25 السابقة إثباتاً نهائياً.
- [ ] تدوير اعتماد R2 وإعادة بناء صورة FastAPI وإغلاق عقود consent/QR/location/error-codes قبل حكم الإنتاج.

## Gatekeeper staging findings — 2026-08-17

- [ ] إعادة نشر backend المصحح إلى staging قبل إعادة التحقق؛ `labs/provider/inbox` و`labs/samples` أعادا 403 رغم نجاح provider login، ما يرجح أن الإصلاح غير منشور أو أن عقد JWT في staging مختلف.
- [ ] معالجة/تفسير `GET /hospital/staff` على staging؛ provider login نجح لكن endpoint أعاد 500، ويجب جمع stack trace من staging بعد نشر UUID fix.
- [ ] استخدام العقد الفعلي لمسار nursing: `/nursing/visits?provider_id=...`؛ محاولة المسار غير الموجود `/home-care/provider/bookings` أعادت 404 ولا تُعد فشل صلاحية.
- [ ] تنفيذ BOLA mutation حقيقي على staging بعد توفير/تحديد order قابل للإلغاء، مع actor المريض وactor غير المالك، وتوثيق عدم حدوث refund أو transition للرافض.

## Full-plan resumption — 2026-08-17

- [ ] إعادة جرد الخطة الأساسية وقراءة كل سجلات التنفيذ والقبول والمصفوفة ومطابقة كل بند مع دليل مصدر أو اختبار.
- [ ] فصل البنود المنفذة مصدرّياً عن البنود الجزئية والبنود المتوقفة على staging أو أسرار/اعتماد خارجي.
- [ ] استكمال الإصلاحات المصدرية المفتوحة في consent/QR/location/error-codes/WebSocket/LiveKit والتخزين والدفع وFastAPI بعد فحص العقود الفعلية.
- [ ] إعادة تدقيق تطبيق المريض وتطبيق المزود ولوحة الإدارة للبيانات الوهمية والـplaceholders والـroutes والأزرار والترجمة الستية.
- [ ] بناء واختبار الحزم الأربع كاملة بعد كل دفعة، وتسجيل النتائج لا الاكتفاء بنتيجة backend Gatekeeper.
- [ ] استكمال staging/E2E لجميع الأدوار والملكية وOTP/2FA والحجز والصيدلية وOCR والدفع والويبهوك وWebSocket وQR/consent.
- [ ] تحديث التقرير الجامع وسجل البيانات الوهمية والعقود والعيوب وخطة الإصلاح بعد كل نتيجة جديدة، ثم رفع commits إلى الفرع فقط.

## Full-plan source remediation batch — 2026-08-17

- [x] إزالة `fake_key` و`fake_secret` من LiveKitWebhookGuard وجعل غياب إعداد LiveKit fail-closed.
- [x] تقوية DeviceTrust challenge/verify بإلزام Redis، مطابقة مالك challenge، وإزالة إشارات placeholder وfallback production.
- [x] إضافة provider ownership وrole checks إلى simulated provider features، ومنع `FILE-${Date.now()}` وpublish بلا report.
- [x] إصلاح حدود RefundService عند 24/4 ساعة لتثبيت العقد الزمني.
- [x] إضافة 3 اختبارات سلبية لـprovider/features؛ النتيجة النهائية 27 suites / 218 tests.
- [x] إعادة بناء `nabdah-backend.zip` دون node_modules أو dist أو pycache مع اختبار سلامة ZIP.

## Client typecheck defects found in Phase 4 — 2026-08-17

- [ ] Patient: إصلاح استخدام `getCalendars` غير الموجود في react-native-localize داخل `src/utils/dates.ts` مع الحفاظ على timezone/calendar contract.
- [ ] Provider: إصلاح cast غير الآمن للـreadonly insurance catalog في `src/api/catalogs.ts` دون تغيير بيانات شركات التأمين أو إنشاء بيانات وهمية.
- [ ] إعادة تشغيل typecheck واختبارات وتصدير patient/provider بعد الإصلاحين، ثم تحديث أرشيفي التطبيقين.

## Phase 4 client validation — 2026-08-17

- [x] Patient: استبدال `getCalendars` بـ`getCalendar` وفق API المثبت.
- [x] Provider: تصحيح readonly insurance catalog cast.
- [x] Patient: typecheck ناجح، 7 suites / 23 tests ناجحة، وExpo iOS export ناجح.
- [x] Provider: typecheck ناجح، 1 suite / 3 tests ناجحة، وExpo iOS export ناجح.
- [x] Admin: production Next build ناجح بعد تنظيف `.next`، مع توليد 34 صفحة.
- [x] إعادة بناء أرشيفي patient/provider واختبار ZIP دون node_modules أو dist.

## Product, communications, UX and discovery track — 2026-08-17

- [ ] تدقيق وتوحيد automatic system light/dark mode مع إمكانية التغيير اليدوي في patient/provider/admin، والتحقق من كل شاشة ومقاس واتجاه.
- [ ] تدقيق اللغة التلقائية من إعداد الجهاز، التبديل اليدوي، RTL/LTR، واكتمال اللغات الست في النصوص والأخطاء والإشعارات.
- [ ] تنفيذ التحقق المتخصص للاتصالات: chat، voice، video، signaling، persistence، ownership، reconnect، push، deep links، والقنوات الصوتية.
- [ ] بناء Communications Implementation Matrix من frontend إلى backend إلى realtime/database/storage ثم العودة إلى state UI.
- [ ] تدقيق صفحات الويب وSEO/GEO/AEO والـstructured data والروابط الديناميكية للدواء والطبيب والتحليل والأشعة والتمريض والمنشأة.
- [ ] بحث تنافسي موثق ومقارنة مجالات الاستشارة والدواء والتحاليل والأشعة والتمريض والحمل والدورة والتغذية وAI.
- [ ] تقييم الأداء والتوسع تحت الضغط، وتحديد ما يمكن إثباته محلياً وما يحتاج load test وبنية staging/production.
- [ ] دراسة وتنفيذ agentic commerce وMCP/merchant discovery فقط عبر عقود آمنة وبيانات صحية ودوائية موثوقة، دون ادعاء ترتيب بحث مضمون.
- [ ] تنفيذ الإصلاحات الآمنة المكتشفة، ثم بناء/اختبار/commit/push إلى manus/on-live-reconciliation فقط.
- [ ] عدم إغلاق بنود staging/E2E الأصلية أو إعلان الجاهزية قبل إعادة النشر والتحقق الحي.

## Communications security findings — 2026-08-17

- [ ] LiveKit: فرض ownership/participant authorization على join/end/reject/metrics/getSession، ومنع رفض أو قراءة جلسة مستخدم آخر.
- [ ] LiveKit: تقييد admin rooms/analytics/participants/mute/remove بـadmin role والتحقق من room ownership أو صلاحية الإدارة.
- [ ] LiveKit: توحيد contract بين `session_id` و`room_name`؛ initiate يعيد session id بينما join يبحث أحياناً عن room_name مباشرة.
- [ ] LiveKit: إزالة fallback `wss://live.nabd.plus` من التطبيق إذا لم يكن endpoint مُعرّفاً بعقد/بيئة موثوقة، وإصلاح fallback الاسم الثابت وspeaker icon.
- [ ] Communications: إكمال trace chat/push/audio/reconnect/background/terminated-app قبل الحكم النهائي.

## SEO/GEO source findings — 2026-08-17

- [ ] تحسين structured data للدواء بإضافة وصف/صورة وoffers فقط عند وجود سعر حقيقي، وavailability مبنية على availability_status لا على قيمة مخترعة.
- [ ] إضافة schema مناسب للمنشأة (`MedicalClinic`/`Hospital` بحسب النوع) والخدمة الطبية مع address/telephone عندما تكون بيانات حقيقية.
- [ ] إضافة `og:locale:alternate` وhreflang/alternate links فقط للغات التي يملك العقد لها محتوى موثوق، مع عدم إعلان ترجمة غير موجودة.
- [ ] مراجعة sitemap وllms.txt وrobots ضد canonical/base URL الفعلي ونطاق API، ثم اختبار XML وstructured data.

## Product track completed source fixes — 2026-08-17

- [x] Patient: automatic system theme default مع override يدوي محفوظ، وdevice language default ضمن AR/EN/UR/HI/BN/FIL.
- [x] Patient LanguageManager: مواءمة التهيئة مع لغة الجهاز وعدم إعادة فرض العربية عند غياب preference محفوظ.
- [x] Provider: system/light/dark mode مع override يدوي محفوظ وعدم الكتابة فوقه عند تغير OS؛ device language default ضمن AR/EN المتاحين.
- [x] Provider: إصلاح مرجع `radar-alarm.mp3` المفقود باستخدام asset حقيقي موجود، مع إبقاء sonic branding المتخصص مفتوحاً.
- [x] Backend chat gateway: membership authorization، aliases للأحداث، REST-only persistence، وفان-أوت للرسائل المحفوظة؛ typecheck و28 suite/221 test ناجحة.
- [x] SEO structured data: وصف/صورة وعروض/توافر للدواء عند بيانات حقيقية، schema للمنشأة، وعروض للخدمات عند سعر حقيقي؛ SEO test وtypecheck ناجحان.

## Push blocker — 2026-08-17

- [x] إعادة تهيئة GitHub CLI/remote ورفع commit `6de0178` إلى `manus/on-live-reconciliation`; remote head تحقق من مطابقته.

## Build regressions found after product-track push — 2026-08-17

- [ ] Patient Expo export: فصل `react-native-maps` native-only imports عن web bundling عبر platform-specific Map implementation، دون تعطيل Android/iOS.
- [ ] Admin Next build: إزالة/تصحيح import `Html/Head/Body/Main/NextScript` خارج pages/_document، وتحديد المستهلك غير المباشر في `/admin/ai-control` و`/admin/payouts`.
- [ ] إعادة تشغيل backend build، patient export، admin build، وجميع الاختبارات بعد الإصلاحين.


## Final validation build repair — 2026-08-17

- [x] Admin: التحقق من أن خطأ `<Html> should not be imported outside of pages/_document` كان ناتجاً عن تشغيل Next build مع `NODE_ENV` غير قياسي؛ `NODE_ENV=production npm run build` نجح وولّد 34 صفحة، ولم توجد imports لـ`next/document` خارج `src/pages/_document.tsx`.
- [x] Patient: استبدال imports المباشرة لـ`react-native-maps` في خمس شاشات بطبقة `src/components/MapPrimitives` native/web، مع إبقاء `react-native-maps` الحقيقي على iOS/Android.
- [x] Patient: إضافة `DatabaseProvider.native.ts` و`DatabaseProvider.web.ts` لمنع تحميل `expo-sqlite`/`wa-sqlite.wasm` في web export، دون seed أو mock data ودون تغيير driver الأصلي للمنصات native.
- [x] Patient: `NODE_ENV=production npm run export:web` نجح بعد الإصلاحات، وولّد web/iOS/Android bundles؛ التحقق المحلي استخدم package-lock مؤقتاً مع registry عام بسبب resolved mirror داخلي غير قابل للوصول، ثم استُعيد lock الأصلي.
- [x] مزامنة هذه التغييرات مع أرشيف patient في الفرع، إعادة بناء ZIP النظيف، ثم تشغيل typecheck/tests النهائي قبل commit/push.


## Focused communications verification — 2026-08-17

- [x] فحص مركز كامل لمسارات chat/realtime بين patient/provider، الملكية، persistence، read state، reconnect، والمرفقات إن كانت مدعومة.
- [x] فحص مركز لمسارات voice/video وLiveKit أو signaling الفعلي، حالات الاتصال، lifecycle، permissions، ownership، وعدم وجود محاكاة محلية.
- [x] فحص push notifications للمريض والمزوّد والإدارة، device tokens، targeting، deep links، lifecycle، retry، channels، ومنع التكرار.
- [x] فحص audio events وcall ringtones وnotification channels والـassets والتوقف/التكرار والتغليف على Android/iOS.
- [x] تنفيذ الإصلاحات المصدرية الآمنة التي تثبت الحاجة إليها، دون إعادة بناء capability موجودة أو إضافة mock/static data.
- [x] تشغيل typecheck/lint/build/tests المركزة وتحديث مصفوفة Communications Implementation Matrix في تقرير Markdown.
- [ ] إبقاء ما يحتاج staging أو credentials أو أجهزة حقيقية مفتوحاً، ثم commit/push على `manus/on-live-reconciliation` فقط.


## Gatekeeper FIX2 provider-role normalization — 2026-08-17

- [x] فحص JwtAuthGuard و`@Roles` وكل وحدات provider-facing لتحديد اختلاف `role` و`provider_type` وaliases (`lab`/`laboratory` وغيرها).
- [x] تنفيذ تطبيع مركزي للأدوار الفعالة بحيث تُطابق guards قيمة `role` و`provider_type` مع الحفاظ على رفض الحسابات غير المصرح بها.
- [x] التحقق من labs وradiology وnursing وhospital وpharmacy وعدم كسر الأدوار الإدارية أو patient.
- [x] تشغيل backend build واختبارات 218/218 أو العدد الفعلي الكامل في النسخة الحالية، ثم توثيق نتيجة الاختبار.
- [x] تحديث التقرير، إعادة بناء الأرشيف المتأثر إن لزم، commit وpush على `manus/on-live-reconciliation` فقط.


## Gatekeeper follow-up — secondary fixes and remaining contracts — 2026-08-17

- [x] فحص وإصلاح `join_thread` للتحقق من عضوية المستخدم قبل `socket.join` ومنع تسريب typing/new_message.
- [x] فحص وإصلاح `markNoShow` ليستخدم appointment business `id` UUID بدلاً من `_id`.
- [x] فحص وإصلاح `ping-patient` ليتحقق من موعد/حجز فعلي يربط المزود بالمريض قبل إرسال push.
- [x] إضافة اختبارات ownership/negative cases للإصلاحات الثلاثة، دون mock نجاح زائف.
- [ ] تدقيق عقود consent وQR verifier وسياسة موقع الطوارئ وerror-code registry، وتوثيق ما يمكن بناؤه وما يحتاج اعتماداً قبل التفعيل.
- [x] تشغيل build والاختبارات الكاملة وتحديث التقرير الجامع ومصفوفة E2E.
- [x] commit وpush على `manus/on-live-reconciliation` ثم إبلاغ Gatekeeper بالـcommit لإعادة staging E2E.


## P0 ChatGateway boot regression — 2026-08-17

- [x] فصل `ChatService` في `chat.service.ts` وإزالة الاستيراد الدائري بين `chat.gateway.ts` و`chat.module.ts`.
- [x] تغيير رفض `join_thread` إلى ACK صريح `{ error: 'not_participant' }` دون إسقاط الاستثناء للعميل.
- [x] إضافة اختبار boot كامل للتطبيق باستخدام `app.init()` يكتشف فشل Nest dependency injection.
- [x] تشغيل build وboot test وJest الكامل، إعادة بناء أرشيف backend، وتحديث التقرير.
- [x] رفع إصلاح P0 على `manus/on-live-reconciliation` قبل بدء دفعات العقود وE2E المتبقية.


## Approved fail-closed contracts and staging E2E — 2026-08-17

- [x] إعداد وثيقة مراجعة مستقلة لعقد consent: grant/revoke/scope، الإصدار، expiry، actor، audit trail، وfail-closed defaults.
- [x] إعداد وثيقة مراجعة مستقلة لعقد QR verifier: payload، signature، expiry، nonce/replay، binding، وfail-closed behavior.
- [x] إعداد وثيقة مراجعة مستقلة لسياسة emergency location: أقل بيانات، consent، precision، retention، access log، ورفض الإذن.
- [x] إعداد وثيقة مراجعة مستقلة لسجل error-code registry: taxonomy، stable codes، localization، HTTP mapping، وcorrelation.
- [x] بناء طبقة backend توثيقية غير مفعلة لهذه العقود، مع منع أي endpoint أو UI من الاعتماد عليها قبل approval.
- [ ] إعداد وتشغيل E2E staging لـBOLA بين مريضين مع state/ledger before-after.
- [ ] إعداد وتشغيل E2E staging للدفع وwebhook وidempotency في refunds/wallet/billing/pharmacy.
- [ ] إعداد وتشغيل E2E staging لـWebSocket origin وtoken impersonation وroom membership — source patch أُنجز، إعادة التحقق الحي بعد redeploy مطلوبة.
- [ ] إعداد وتشغيل مصفوفة OTP/2FA وrate-limit تشمل success/failure/expiry/attempts/Redis key.
- [ ] تحديث التقرير الجامع، اختبار backend، commit وpush ثم تسليم نتائج E2E والقيود.


## WebSocket staging finding — 2026-08-17

- [ ] إصلاح fallback في websocket CORS: production لا يجوز أن يعيد `origin: true` عند غياب `ALLOWED_ORIGINS`؛ يجب fail-closed أو رفض صريح حتى تُضبط القائمة.
- [ ] تحسين اختبار WebSocket لتمييز transport connect عن authenticated session: token المنتهك قد يتصل لحظياً قبل أن ينفذ gateway disconnect، ويجب إثبات disconnect/عدم استقبال events.
- [ ] إعادة تحقق حي لـvalid token وinvalid token وtrusted/untrusted Origin بعد نشر الإصلاح.


## Production sandbox E2E closure — 2026-08-17

- [x] تثبيت أن كل الحسابات والطلبات المستخدمة sandbox وأن كل mutation موثق وقابل للتنظيف قبل الاختبار على الإنتاج.
- [ ] إنشاء order sandbox من patient.sandbox وتسجيل الحالة والـledger قبل/بعد، ثم اختبار cancel/track/update من patient2.sandbox مع توقع 403/404.
- [ ] تشخيص 500 في payment intent عبر logs المعتمدة، وإصلاح السبب فقط إذا كان المصدر/الإعداد sandbox آمناً، ثم اختبار payment/webhook signature/idempotency/refund sandbox.
- [ ] إعادة اختبار WebSocket على الإنتاج مع انتظار disconnect الفعلي للـtoken المعدل وOrigin غير الموثوق وعدم استقبال events.
- [ ] تنفيذ مصفوفة admin OTP/2FA وrate-limit دون تخمين codes أو تجاوز حدود المحاولات.
- [ ] تحديث وثائق العقود الأربعة ورفع التعديلات بعد نجاح build/tests، مع إبقائها fail-closed وغير مفعلة.


## Production reachability blocker — 2026-08-17

- [ ] استعادة وصول HTTPS/HTTP إلى `api.nabd.plus` من بيئة الاختبار أو توفير قناة تشخيص معتمدة؛ DNS يعمل لكن TLS وHTTP ينتهيان بمهلة قبل login.
- [ ] بعد نشر `dac6f3c` فقط: إعادة اختبار BOLA/payment/WebSocket/OTP على production sandbox؛ لم تُنفذ mutations المالية في الجولة الحالية.


## Production origin-direct retry — 2026-08-17

- [ ] التحقق من `/health/liveness` عبر TLS و`--resolve api.nabd.plus:443:57.131.133.208` قبل أي login أو mutation.
- [ ] تحديث كل probes الإنتاج لتستخدم origin المباشر مع Host/SNI الصحيحين، ثم تنفيذ order sandbox وBOLA بين المريضين.
- [ ] إعادة payment/WebSocket/OTP probes عبر origin المباشر وتحديث evidence والقيود.


## Production BOLA P0 — 2026-08-17

- [x] إصلاح مسار `POST /orders/:id/cancel` ليشترط ملكية المريض أو pharmacy assignment أو admin، وألا يعتمد على role وحده.
- [x] مراجعة `GET /orders/:id` وعمليات التتبع/التعديل للتأكد من participant/owner authorization وعدم كشف order لمريض آخر.
- [x] إضافة اختبار BOLA بين patient1/patient2 يغطي read/track/cancel/update ويثبت state وpayment/ledger before-after.
- [x] توثيق order sandbox `91047ef2-ad36-422a-a184-629693e7c729`: قبل `ESCALATED_TO_ADMIN/pending`، وبعد إلغاء patient2 أصبح `CANCELLED/pending`؛ لا تُنفذ mutations مالية قبل إصلاح P0.


## Master project reference — 2026-08-17

- [x] إعداد مرجع Markdown واحد يشرح المعمارية، backend/database، Patient App، Provider App، Admin Dashboard، الشاشات، الميزات، المسارات، السيناريوهات، الصلاحيات، الاختبارات، والحالة التشغيلية.
- [x] مراجعة اتساق المرجع مع manifests المصدرية والتقارير، ثم رفعه على `manus/on-live-reconciliation`.

- [x] Report PDF: فرض ownership في `GET /orders/:id/report.pdf`، إصلاح استيراد `pdfkit` runtime-safe، إضافة handling لأخطاء stream، وإضافة اختبارات رفض BOLA ونجاح المالك؛ اختبارات OrdersService 9/9 وبناء backend ناجح محلياً.
- [ ] إعادة نشر commit PDF على الإنتاج والتحقق الحي: المالك 200/PDF صالح والمريض الآخر 403، دون لمس بيانات غير sandbox.
- [ ] تشخيص payment intent 500 في الإنتاج عبر سجلات الخادم ثم إصلاحه واختبار sandbox/idempotency/webhook.
