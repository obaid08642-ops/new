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
- [x] إعداد وتشغيل مصفوفة OTP/2FA وrate-limit: success 201، failure 400، attempts 5/6 أعادت 429، single-use 400، expiry 400؛ Redis key لم يُكشف أو يُحفظ في السجل.
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
- [x] تنفيذ مصفوفة admin OTP/2FA وrate-limit بحساب sandbox فقط ودون تجاوز الحدود؛ success/single-use/expiry/429 موثقة بنتائج الإنتاج.
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

- [x] Production observation 2026-08-17: عبر origin المباشر، `patient2.sandbox` يحصل على 403 عند تنزيل report.pdf للطلب `91047ef2-ad36-422a-a184-629693e7c729`، بينما `patient.sandbox` على النشر الحالي ما زال يحصل على 500؛ هذا يؤكد أن ownership منشور لكن إصلاح runtime الجديد في commit `f6fa8a8` يحتاج نشره.
- [x] Production payment repro 2026-08-17: `POST /payments/intent/pharmacy/91047ef2-ad36-422a-a184-629693e7c729` أعاد 500 generic، ثم أكد stack trace أن Moyasar يرفض live account؛ الطلب sandbox-only ولم تُنشأ mutation مالية مؤكدة. إصلاح الحساب نفسه خارج الكود.
- [ ] عدم اعتبار order الملغى اختباراً مالياً صالحاً؛ يجب إنشاء/تحديد order sandbox قابل للدفع قبل payment/webhook/idempotency، ثم تنظيفه أو توثيق حالته وفق قواعد الإنتاج.

- [x] Moyasar production confirmed: `Entity not activated to use live account`; لا mock ولا bypass ولا اختبار دفع حي حتى يفعّل المالك الحساب تجارياً.
- [x] تحسين PaymentsService لمعالجة أخطاء adapter: تسجيل التفاصيل داخلياً فقط، وإرجاع 502 بعقد `payment_gateway_unavailable` ورسالة عربية آمنة «الدفع غير متاح حالياً» دون كشف نص Moyasar الخام؛ full backend regression 30 suites/234 tests وbuild ناجحان محلياً.
- [x] إضافة اختبار regression لمسار 502 الآمن، مع إبقاء webhook signature وidempotency وWebSocket وOTP/2FA ضمن الاختبارات غير المالية؛ suite payments 6/6 ناجحة.

- [x] Webhook signature matrix محلياً: Moyasar/PAYTabs/SMS قبول التوقيع الصحيح ورفض الخاطئ/غياب secret؛ suite `webhooks` ناجحة.
- [x] Idempotency interceptor محلياً: cache hit، اختلاف payload، concurrent lock، وعزل المستخدم/المسار؛ 12/12 اختباراً في webhook + idempotency ناجحة.
- [ ] التحقق الحي من webhook وidempotency للعمليات المالية يبقى مؤجلاً حتى تفعيل Moyasar وتوفير order sandbox قابل للدفع؛ لا يُغلق بالاختبار المحلي وحده.

- [x] Production OTP/2FA negative/rate-limit: `admin.sandbox` login أعاد `requires_2fa=true`؛ أربع رموز خاطئة أعادت 400 ثم المحاولتان 5/6 أعادتا 429 مع `retry_after=60`. لم يُستخدم رمز صحيح.
- [x] Production Socket.IO identity probe عبر polling وorigin موثوق: token المريض sandbox قبل الاتصال وأعاد packets/events، بينما token غير صالح أعاد server disconnect packet `41`؛ لم تُرسل رسائل أو mutations.
- [x] Production WebSocket CORS allowlist probe: `admin.nabd.plus` و`provider.nabd.plus` أعادا ACAO مطابقاً، بينما `evil.example` و`patient.nabd.plus` لم يعيدا ACAO؛ direct websocket client المحلي تعذر بسبب resolver، لذلك اعتمدت handshake/polling protocol لا حكماً على transport websocket نفسه.
- [x] OTP/2FA success وexpiry أُغلقت لاحقاً عبر دورة login مرتبطة: success 201، single-use 400، expiry 400، مع rate-limit 429 موثق أدناه.

- [x] 2FA success: أُجري لاحقاً بالرمز المرتبط 733061 على `POST /auth/login/verify-2fa` واستُلم access token؛ الرمز والتوكن لم يُحفظا في المستودع.
- [x] 2FA single-use: إعادة إرسال الرمز نفسه بعد النجاح أعادت HTTP 400 `OTP expired or not requested`.
- [x] 2FA expiry: الرمز المستقل 600535 تُرك أكثر من 6 دقائق ثم رُفض HTTP 400 دون access token.

- [x] 2FA retry عبر origin المباشر فقط اكتمل لاحقاً بدورة login مرتبطة؛ success 201 ثم single-use 400، دون خلط Cloudflare أو حفظ التوكن.
- [x] بعد نجاح المسار طُلب رمز expiry مستقل 600535، وانتُظر أكثر من 6 دقائق قبل التحقق، فكانت النتيجة 400.

- [x] 2FA origin diagnostics 2026-08-17: `curl -v --resolve ...` اتصل TCP بـ`57.131.133.208:443` ثم توقف عند TLS بعد ClientHello (`SSL connection timeout`)، مع response headers/body فارغين؛ الطلب لم يصل إلى HTTP ولم يُثبت استهلاك الرمز 232883. الدليل محفوظ خارج المستودع في `/tmp/admin-2fa-timeout.curl-v`.

- [x] 2FA retry بعد إصلاح PMTUD/MSS: origin المباشر عمل، ثم أُجريت دورة login مرتبطة صحيحة بالرمز 733061 ونجحت مع single-use؛ الرمز 235690 غير المرتبط بقي مرفوضاً كما يجب.
- [x] قياس MTU لم يعد مطلوباً: لم يتكرر TLS timeout بعد إصلاح MSS، ووصلت طلبات 2FA عبر origin المباشر إلى التطبيق بنجاح.

- [x] 2FA retry 235690 عبر origin المباشر وصل إلى التطبيق مرتين بنجاح (HTTP 400، لا timeout)، لكن كلتا المحاولتين أعادتا `OTP expired or not requested`; لم يصدر access token ولم يُثبت استهلاك الرمز، لذلك لا تُعتبر هذه نتيجة single-use.
- [x] يلزم بدء `POST /auth/login` لحساب admin.sandbox ثم إصدار OTP مرتبط بدورة login نفسها؛ نُفّذت الدورة الصحيحة لاحقاً ونجحت، وأثبتت أن الرمز غير المرتبط يعيد `OTP expired or not requested`.

- [x] بدء دورة login جديدة لـ`admin.sandbox` عبر origin المباشر، ثم التوقف عند `requires_2fa` وانتظار OTP المرتبط بهذه الدورة؛ correlation `a88a1dc8-49a3-427e-b746-c2a87aed187b`.

- [x] 2FA success 2026-08-17: دورة login المرتبطة أعادت HTTP 201 و`user.role=admin` مع access/refresh/device tokens؛ التوكنات لم تُطبع ولم تُحفظ في المستودع. correlation `a6062023-9cf9-4959-a878-fd3ca94b62b5`.
- [x] 2FA single-use 2026-08-17: إعادة استخدام الرمز نفسه فوراً أعادت HTTP 400 `OTP expired or not requested`، correlation `b5676306-1c0b-4c81-a845-e7d38bfcbcbe`؛ أثبتت أن الرمز استُهلك.
- [x] 2FA expiry: الرمز المستقل 600535 تُرك أكثر من 6 دقائق، ثم أعاد verify-2fa HTTP 400 `OTP expired or not requested` دون access token؛ correlation `c4e1de4f-2a59-42ee-89bb-63d15133b3fe`.

- [x] 2FA expiry النهائي: عدم استخدام رمز الجلسة المستقلة قبل مرور 6 دقائق، ثم إرسال verify-2fa مرة واحدة عبر origin المباشر والتأكد من HTTP 400 دون access token؛ correlation `c4e1de4f-2a59-42ee-89bb-63d15133b3fe`.

## Device validation campaign — 2026-08-17

- [x] جرد Android SDK/emulators وJava/Gradle/Expo/EAS وFirebase CLI والاعتمادات المتاحة؛ غياب Android SDK/adb/Gradle وEAS auth وFirebase/GCP موثق في `DEVICE_VALIDATION_INVENTORY_20260817.md`.
- [ ] بناء APK اختبار للمريض موصول بـ`https://api.nabd.plus`؛ prebuild وJS export نجحا، لكن APK لم يُنتج بسبب غياب Android SDK/adb وEAS auth.
- [ ] بناء APK اختبار للمزودين موصول بالإنتاج؛ prebuild نجح، لكن APK لم يُنتج بسبب غياب Android SDK/adb وEAS auth.
- [ ] تجهيز مسار iOS عبر EAS/TestFlight؛ prebuild نجح، ومانع IPA/TestFlight موثق: لا macOS/Xcode/Apple Developer وEAS غير authenticated.
- [ ] تنفيذ مصفوفة المحاكيات: لم تبدأ لأن Android SDK/adb/emulator غير متاحة؛ جرد routes وقائمة الهاتف الحقيقي وتجهيز الأدلة البديلة موثق، دون اختلاق screenshots/logs.
- [x] محاولة/توثيق Firebase Test Lab Robo/scripted: التشغيل محجوب بسبب غياب GCP/Firebase CLI/credentials، والتفصيل في `DEVICE_FARM_BLOCKER_20260817.md`; الاختبار الفعلي ما زال مفتوحاً.
- [x] إنتاج `REAL_DEVICE_CHECKLIST.md` بالعربية للهاتفين الحقيقيين، مع push/calls/LiveKit/GPS/RTL.
- [x] إنتاج تقرير جاهزية الأجهزة وعيوب/موانع مرقمة وأدلة config/prebuild/build attempts/logs داخل `audit-artifacts`، إضافة إلى `REAL_DEVICE_CHECKLIST.md` وscreen/route inventory؛ screenshots/videos من emulator/device farm مؤجلة حتى توفير البيئة.

## Full production E2E traceability campaign — 2026-08-17

- [x] جرد routes/screens/actions في patient/provider وربطها بعقود backend وroles والحالات في `FULL_PRODUCTION_E2E_TRACEABILITY_20260817.md` و`FULL_E2E_BACKEND_ROUTE_CONTRACTS_20260817.md`; live result لكل سيناريو ما زال Pending حتى تنفيذه.
- [x] إنشاء مصفوفة سيناريوهات كاملة تشمل pharmacy delivery/pickup/reject/reorder/stock، clinic/home/online consultations، labs، radiology، nursing/home care، hospitals/staff، profile/family/addresses/wallet/notifications، وSOS/QR fail-closed؛ نتائج التشغيل ما زالت تُملأ تدريجياً.
- [ ] تنفيذ دورات حياة كاملة على production بحسابات sandbox فقط، مع request/response status وIDs وbefore/after evidence.
- [ ] اختبار payment 502 كحالة محظورة متوقعة، وترك ما بعد الدفع معلّقاً حتى تفعيل Moyasar.
- [ ] اختبار ownership/BOLA بين patient1/patient2 لكل mutation وقراءة حساسة، وfail-closed لـSOS/QR/العقود غير المعتمدة.
- [ ] إصلاح أي عيب مصدرّي مكتشف عبر inspect → implement → build → test → commit → push، ثم تحديث جدول audit-artifacts النهائي.

- [x] CONSULT-CONTRACT-002 source fix: `AppointmentsService` يطابق provider profile/user/account identities fail-closed في list/read/transition/cancel/finish؛ regression ناجح وfull backend **30 suites/235 tests** وbuild ناجحان. [ ] نشر patch وإعادة التحقق الحي doctor GET/start/complete.
- [x] Clinic live lifecycle partial: create cash 201 وauto-confirm، patient check-in 200، patient2 read/cancel 403، owner cleanup cancel 200؛ doctor-side transitions كانت محجوبة بـCONSULT-CONTRACT-002، وتحتاج إعادة التحقق بعد النشر.

- [x] ORDERS-ROUTE-001 source fix: `/orders/pharmacy/queue` نُقل قبل `GET :id` لمنع wildcard shadowing؛ combined full gate **30 suites/235 tests** وbuild ناجحان، commit `b6bbe70` مرفوع. [ ] live recheck بعد النشر.

- [x] LAB-CONTRACT-001 source fix: `LabsService.transition` يستخدم `getEffectiveRoles(user)`؛ labs regression **8/8**، full backend **30 suites/236 tests** وbuild ناجحان. [ ] push/live recheck لمسار generic state transition.
- [x] Lab facility lifecycle partial/live: create 201، patient/provider read 200، inbox 200، sample register 201، analyzing/result_ready 200، report 201، patient final read 200/REPORTED؛ generic state transition blocked بـLAB-CONTRACT-001، وcompatible-providers أعاد 0.

- [x] LAB-ACCESS-002 source fix: reschedule/emergency تتطلب patient owner أو assigned provider/admin، GPS يتطلب assigned provider/admin، tracking يتطلب patient/assigned provider/admin؛ labs **11/11**، full backend **30/239**، build ناجح. [ ] deploy/live BOLA recheck.

- [x] Radiology live lifecycle (sandbox): create 201، patient read 200، patient2 read 404، mine 200، provider queue/accept/allocate/finalize 200/200/200/201، patient final report 200؛ evidence `/tmp/e2e-radiology-lifecycle.ndjson`، booking `be7b0b06-73bc-4cdd-8a7c-1dba320da4c7`.
- [x] RAD-ACCESS-001 source fix: provider queue/wallet/catalog/inventory/mutations محمية بـJwtAuthGuard + effective radiology/admin roles؛ queue يعزل assigned center، finalize/allocate/respond تتحقق من assignment، catalog mutation admin-only، inventory لا يقبل provider_id من body/query. Regression 3/3، full backend 31 suites/242 tests، tsc/build ناجحان. [ ] deploy/live negative recheck.
- [ ] Radiology remaining lifecycle variants: home-visit, reject/reassign, reschedule, insurance approval/partial/cash opt-in، report review/approval، cancel/no-show، notifications before/after.
- [ ] Radiology live provider negative recheck after deployment: patient queue/wallet/catalog/inventory/mutation must be 403; foreign provider mutation must be 403; owner provider workflow must remain 2xx.

- [x] Nursing source hardening: `NursingController` الآن يفرض patient/provider ownership على notes/visits/tracking وجميع state mutations، لا يقبل provider_id لتوسيع القراءة، ويثبت state_history من الحالة السابقة؛ `HomeCareTrackingController` صار JWT-protected ويربط geofence بالحجز وموقع المريض المخزن ويزيل fallback ObjectIds للمستلزمات. Regression nursing 6/6، full backend 33 suites/248 tests، tsc/build ناجحان.
- [x] Nursing live preflight: `/nursing/catalog` 200 ببيانات حقيقية، و`/unified-bookings/nursing-broadcast` بـservice_id حي أعاد `201` مع `providers: []` و`booking: null`؛ لا توجد زيارة sandbox قابلة للتنفيذ دون مزود حي، ولم تُنشأ بيانات وهمية أو mutation بديلة.
- [ ] Nursing live lifecycle remains pending provider availability: create/accept/transit/arrive/start-care/complete/tracking/notes/supplies/cancel/no-show/emergency/notifications and cross-account BOLA.
- [ ] Deploy/recheck nursing negative contracts after source publication; do not call legacy unauthenticated supply endpoint in production before deployment because its pre-fix fallback would create orphan records.

- [x] Hospital/staff source remediation: branches/departments/staff/appointments/wallet resolve UUID user ids through real User._id, reject non-facility actors, scope appointment status mutations to doctors affiliated with the hospital, validate status, and pass CurrentUser through controller. Regression 3/3; full backend 34 suites/251 tests; tsc/build successful.
- [x] Hospital live read matrix before deployment: sandbox hospital returned 500 on branches/departments/staff/appointments/wallet, while invitations/inbox returned 200 empty; patient token was rejected (401 invalid token). The 500s are consistent with the source ObjectId(UUID) defect and remain a deployment-recheck item.
- [ ] Hospital live recheck after deployment: branches/departments/staff/appointments/wallet must no longer 500; non-facility patient/provider must be denied; staff/appointment mutations require hospital role and same-facility scope.

- [x] Shared services live read matrix: notifications 200 with real delivery statuses; wallet balance/transactions/spending/cards 200 with real empty/zero data; family no-group responses 404/200 as contract.
- [x] Family sandbox lifecycle: patient1 created group 201, generated invite 201, patient2 joined 201, members 200, unauthorized member-records 403, owner removed patient2 200. Found false 404 after successful permission update because service treated empty UpdateResult metadata as failure; source fixed to fail only on explicit matchedCount/nMatched=0, with regression coverage. Full backend 34 suites/253 tests, tsc/build successful.
- [ ] Shared services remaining: rerun family grant/relation/calendar/permission-request after deploy, wallet topup/payment-gateway-dependent flows, notification read/register-token/admin delivery stats, cross-account wallet/card/topup BOLA, and verify notification creation after each service lifecycle.

- [x] Notifications BOLA remediation: `markRead` no longer updates arbitrary notification ids; it scopes by user_id/role/all and returns `notification_not_found` when no matching record. Regression 2/2; full backend 35 suites/255 tests; tsc/build successful.
- [ ] Deploy/live recheck notification foreign read: patient2 must not mark patient1-only notification; owner/role/all reads must continue working.

- [x] Wallet safe negative matrix on production sandbox: unknown topup read `404 topup_not_found`, unknown card delete returned `200` with empty cards (no-op), insufficient transfer returned `400 insufficient_balance`; no payment intent/card/real transfer was created.
- [ ] Wallet financial closure remains pending Moyasar activation: real sandbox topup intent/confirm/webhook/refund/idempotency, cross-account topup/card BOLA after deploy, and ledger before/after evidence.

- [x] BookingOps shared BOLA hardening: invoice/payment reads use patient/provider/admin scope; markPayment rejects non-provider, requires assigned provider or admin and explicit update payload; list/get attachments now verify booking access before returning metadata. Regression 4/4; full backend 36 suites/259 tests; tsc/build successful.
- [ ] Deploy/live recheck BookingOps: foreign invoice/payment/attachments must 404/403; assigned provider/admin mutations remain allowed; test attachments only with real sandbox booking and no base64 leakage.

- [x] UnifiedBookings access contract: `getOne` now throws `404 booking_not_found` for missing/foreign records instead of returning HTTP 200 with null; owned records remain readable. Regression 2/2; full backend 37 suites/261 tests; tsc/build successful.
- [ ] Deploy/live recheck unified-bookings foreign read on an existing sandbox booking; current production probe returned 200 with empty body for the stale radiology id, while booking-flow status/timeline routes returned 404 and require deployment/version reconciliation.

- [x] Unified live reconciliation probe: `/unified-bookings/mine` 200 returned a real lab booking; owner getOne returned 200 with data; foreign patient2 returned 200 with empty body on production pre-deploy. This is documented as an open operational contract/BOLA recheck, not a pass.

- [x] BookingFlow provider visibility: status/timeline/retry entity lookup now supports assigned provider/provider_type ownership while retaining patient/admin scopes; unassigned provider remains fail-closed. Admin resolve accepts admin/super_admin only. Regression 2/2; full backend 38 suites/263 tests; tsc/build successful.
- [ ] Deploy/live recheck BookingFlow provider status/timeline on an existing assigned sandbox booking; current production status/timeline routes returned 404 due version/route reconciliation.

- [x] HomeCareCompat remediation: booking creation now requires patient + active catalog service_id and uses catalog price only; patient-supplied provider_id/price/name fallback removed. Nursing queue and availability require nursing provider/admin; transitions enforce assigned access and valid state graph; GPS/care plans/inventory require booking/assignment and no orphan fallback ack. Regression 3/3; full backend 39 suites/266 tests; tsc/build successful.
- [ ] Deploy/live recheck legacy `/home-care/*` paths: patient queue/availability/transition/GPS/care-plan/inventory must be denied; valid patient booking must use catalog price and provider assignment; provider lifecycle remains blocked until a matching sandbox nurse exists.

- [x] NursingController final hardening: assigned-provider access to notes, coordinate validation before geofence, valid ARRIVED→CARE_IN_PROGRESS and CARE_IN_PROGRESS→COMPLETED transitions, emergency requires reason/valid state and records refund as `pending_finance_review` instead of claiming refunded, wallet requires nursing provider/admin and derives amounts from real fields without legacy `150` fallback. Regression NursingController 6/6; full backend 39 suites/269 tests; tsc/build successful.
- [ ] Deploy/live recheck NursingController legacy paths and wallet ledger; verify no synthetic earnings, no patient wallet access, valid transition history, and emergency notification does not claim refund before finance settlement.

- [ ] Provider App full audit: inventory كل الشاشات والمسارات والأزرار والـAPI consumers، مع ربط كل إجراء بعقد backend حقيقي وعدم وجود mock/placeholder.
- [ ] Provider intake E2E لكل نوع مزود متاح sandbox: login/2FA إن وجد، availability، inbox/queue، استقبال الطلب، قبول، رفض، إعادة توجيه، claim/assignment، بدء الخدمة، التتبع، الإتمام، التقرير، الإلغاء/no-show، الإشعارات، والمحفظة.
- [ ] Provider isolation matrix: مزود مختبر/أشعة/صيدلية/تمريض/مستشفى/طبيب لا يرى ولا يعدّل طلب مزود آخر؛ patient لا يصل إلى provider queue أو provider mutations؛ admin-only operations تبقى محصورة.
- [ ] Provider contract matrix: role/provider_type normalization، status transitions، duplicate accept/race/idempotency، stale request، no-provider/escalation، payment-blocked states، offline/retry، deep links/notifications، وbefore/after evidence لكل mutation.
- [ ] Provider UI validation: mobile/web provider screens، loading/empty/error states، RTL/LTR واللغات، dark/light theme، responsive layouts، accessibility، وأي زر غير موصول بالـbackend يُسجّل ويُصلح أو يبقى fail-closed.
- [ ] Provider E2E deployment recheck بعد نشر `a0d4652`: لا تُعتبر النتائج المصدرية أو الاختبارات المحلية بديلاً عن استقبال طلب حقيقي بحسابات sandbox فقط.

- [x] Provider App source completeness: remediation snapshot كان يحتوي شاشة واحدة فقط؛ استُعيدت البنية الكاملة المطابقة لـExpo SDK54/API الإنتاج، فأصبح المصدر 66 ملفاً تشمل auth/doctor/facility/lab/nursing/pharmacy/radiology/ambulance/shared screens، services، context، contracts، notifications، وLiveKit.
- [x] Provider App build contract: أضيف `app.json` صالح مع Android/iOS identifiers وautomatic theme وproduction API، وأضيف peer dependency `livekit-client` المطلوبة لـ`@livekit/react-native`; TypeScript يمر، Jest contract tests 3/3 يمر، وAndroid Expo prebuild يمر في نسخة مؤقتة مع package `com.nabd.plus.provider` وpermissions location/notifications.
- [x] Provider App placeholder remediation: أزيلت `test_patient` وpatient/report/referral fallback ids، أزيلت أسعار `150` الوهمية من intake mappings، وأزيلت `balance={4200}` الثابتة من WithdrawalWorkflow؛ الإجراءات الآن fail-closed عند غياب patient/appointment الحقيقي.
- [ ] Provider App full runtime/E2E remains pending: execute provider login and request intake for doctor/lab/radiology/pharmacy/nursing/hospital/ambulance sandbox accounts, verify incoming queue, accept/reject/reassign, transitions, notifications, calls, wallet, reports, and cross-provider BOLA on production after deploying the synchronized app/backend commits.

# Comprehensive audit scope — added 2026-08-18

- [ ] Freeze and reconcile authoritative versions: GitHub branch/commit, backend archive, patient app, provider app, admin dashboard, database schema/migrations, deployed server SHA, and production API version.
- [ ] Patient App inventory: every route, screen, modal, tab, card, icon, button, form, loading/empty/error state, deep link, permission, language, RTL/LTR, light/dark theme, offline/retry behavior, and API/database binding.
- [ ] Provider App inventory: onboarding, authentication/2FA, profile/KYC, approval/pending/rejection states, service catalog, availability, schedules, holidays, leave, pricing, insurance/cash settings, incoming broadcast, queue/inbox, accept/reject/reassign, patient details, chat, voice/video, GPS, reports, prescriptions, referrals, no-show, cancellation, wallet, withdrawal, notifications, ratings, drug index, jobs, settings, and logout/security.
- [ ] Admin Dashboard inventory: authentication/2FA, role matrix, users/providers/facilities, approvals, orders/bookings, broadcast/reassignment, payments/refunds/wallet, insurance, catalog, drugs, labs/radiology reports, nursing operations, hospitals/staff, notifications, audit logs, contracts, localization/theme, analytics, exports, and destructive-action safeguards.
- [ ] Backend/database inventory: every controller/route/service/schema/index/queue/websocket/event/webhook/storage path, ownership checks, role/provider_type normalization, state machines, idempotency, audit trail, validation, error registry, rate limits, seed/mock/fallback/localhost scans, migrations, backups, and observability.
- [ ] Consultation matrix: online, clinic/in-person, home visit; cash, card/Moyasar, insurance, copay/partial approval; doctor directory/profile/specialty/facility/service/price; slots, working hours, holidays, leave, reschedule, cancellation, no-show; pre/during/post chat; video/audio initiate/ring/accept/reject/end; prescription, sick leave, medical report, lab/radiology referrals, follow-up, rating, receipt, and notifications.
- [ ] Pharmacy matrix: delivery, pickup, refill/reorder, stock/unavailable/substitution, cash/card/insurance, routing/broadcast, accept/reject/reassign, cart/approval, cancellation at each state, tracking, completion, inventory before/after, receipt, rating, and notifications.
- [ ] Laboratory matrix: branch/home collection, catalog/test preparation, booking/confirmation, insurance decision and copay, cash opt-in out-of-network, sample collected/analyzing/result, report upload/access, reschedule/reassign/cancel, patient/provider/admin ownership, and notifications.
- [ ] Radiology matrix: branch/home, catalog/modality/preparation, booking/confirmation, insurance/cash, perform, images/PACS/report delivery, provider queue/respond/allocate/finalize, reschedule/cancel/no-show, report access/BOLA, and notifications.
- [ ] Nursing/home-care matrix: service catalog, home visit request/broadcast/accept/reject/reassign, nurse onboarding/availability, visit start/arrive/in-progress/complete, GPS/geofence, notes/care plan/supplies, emergency/no-show/cancel/refund review, cash/insurance/payment states, tracking, rating, notifications, and provider/patient/admin isolation.
- [ ] Hospital/facility matrix: directory/profile/branches/departments, appointment booking, staff invite/onboard/roles, hospital-admin versus provider permissions, doctor schedules/leave, patient tracker, discharge/reporting, internal chat/announcements/resources, wallet/appointments, audit logs, and UUID/ObjectId compatibility.
- [ ] Shared matrix: notifications delivery/read/read-all/foreign isolation, wallet balance/cards/topup/transfer/withdrawal/ledger, family create/invite/join/permissions/records/remove, profile/addresses, chat membership/typing/messages, LiveKit origin/token/impersonation/no-show, OTP/2FA/rate limit, webhooks/signatures/idempotency, and error contracts.
- [ ] Extended/strategic features: nutrition plans, AI diagnosis/triage boundaries, mental health, pregnancy/follow-up, cycle/ovulation, medication reminders, drug index, jobs, personalization, SEO/GEO/share links, multilingual content, and explicit status of implemented versus planned versus fail-closed.
- [ ] Provider receiving-requests E2E: for every provider type verify login/onboarding/approval, online availability, broadcast receipt, inbox rendering, accept/reject/timeout/reassign, state transitions, payment/insurance branch, patient data minimization, chat/call/GPS/report actions, notifications, wallet/withdrawal, and cross-provider BOLA.
- [ ] Cross-platform QA: Android/iOS/Huawei source and build gates, small/medium/tablet layouts, orientation/background/permissions, weak network/retry, push/deep links, call/GPS behavior, RTL/LTR and six-language strings, light/dark automatic theme, accessibility, crash logs, and real-device UAT checklist.
- [ ] Post-deploy live matrix: execute only after auditor deploys `41d1103`; use sandbox accounts only, record request/response/status/IDs/state before-after/evidence, clean or document every mutation, and never close a route without source + automated + live evidence.

- [x] Created `AUTHORITATIVE_SOURCE_REGISTER_20260818.md` and initial source inventories for patient/provider/admin with route/API/interactive-handler extraction.
- [ ] Reconcile patient/admin archive hashes and exact source roots against GitHub branch before accepting their screen counts.
- [ ] Convert every extracted route and interactive handler into a screen/button contract row with expected API, role, loading/empty/error states, and test evidence.
- [ ] Do not mark phase 1 complete until deployed server SHA is confirmed to match `41d1103` and patient/admin/provider artifacts are mapped to the same release.

- [x] Source reconciliation found critical completeness gap: patient remediation has 51 files versus 627 in full live extraction; admin remediation has 11 versus 691. These incomplete snapshots are not authoritative for full screen/button claims.
- [ ] Reconcile and, if required, restore the complete Patient App (627-file candidate) and Admin Dashboard (691-file candidate) into the release/reference set; compare against GitHub archives and record hashes before implementation or release.

- [x] Archive comparison completed: `nabd_plus_patient_app.zip` extracts 629 files and is not hash-identical to the 627-file full patient snapshot; `Napd-admin-dashboard.zip` extracts only 66 files versus 691 in the full admin snapshot. Patient requires file-level reconciliation; Admin archive is a confirmed completeness blocker and must be rebuilt/replaced before full admin audit or release claim.
- [ ] Obtain/reconcile the complete Admin Dashboard source into the release archive and verify routes, API bindings, and build before deployment.

- [ ] Admin full snapshot build failure: Next.js prerendering `/admin/audit-logs` and `/admin/payouts` imports `<Html>` outside `pages/_document`; inspect shared/layout imports, fix source, then rerun full build and route smoke tests.

- [x] Admin compatibility diagnosis: Next 16.2.10 compiles but fails prerender with the Html/_document error; a temporary Next 14 test is not a valid drop-in because this source uses `next.config.ts`, which Next 14 rejects. Do not downgrade blindly; fix the supported Next configuration/pages-router compatibility and retest.

- [ ] Patient full-source gate is not yet conclusive: the first temporary npm install ended with ENOENT/TAR_ENTRY errors and missing `expo-router`, so Expo config/typecheck/tests were not validly completed. Retry from a clean temporary directory with a reproducible lockfile/install method before classifying source defects.

- [x] Patient gate environment diagnosis: the clean retry failed with npm `ENOSPC` because temporary native dependency installation exhausted sandbox space; temporary artifacts were removed and disk recovered. This is not a source verdict.
- [ ] Retry Patient App gate only after using a space-bounded install strategy or existing locked dependencies; capture Expo config, TypeScript, tests, and prebuild separately so one resource failure cannot invalidate all results.

- [ ] Production readonly reconciliation: liveness is 200 via origin, but readiness returns 500. Obtain server logs/readiness dependency diagnosis from the auditor before any E2E readiness claim; do not infer deployed SHA from health alone.

- [x] Created `DEPLOYMENT_AND_POST_DEPLOY_GATE_20260818.md` for auditor handoff: backup/rollback, SHA confirmation, readiness gate, role-by-role Provider App intake, Patient App service lifecycles, Admin operations, evidence schema, and PASS/FAIL/BLOCKED/UNRECONCILED/NOT IMPLEMENTED rules.

# Full Systematic QA & Workflow Validation — 2026-08-18

- [ ] Reconcile live release: confirm deployed SHA includes `41d1103` plus RolesGuard fix `f2bffa28`, record rollback image/DB backup, disk state, liveness/readiness, and release identifier.
- [ ] Add `f2bffa28` to source/evidence register and rerun local 269/269 gate after the RolesGuard change is present in the authoritative source archive.
- [ ] Patient App screen/button audit: enumerate every route, screen, modal, tab, card, icon, form, CTA, back action, cancel action, retry action, deep link, permission, and API call; classify each as wired, broken, placeholder, or missing.
- [ ] Provider App screen/button audit: enumerate onboarding/KYC, approval, profile, availability, schedules/holidays/leave, catalog/pricing/insurance settings, inbox/broadcast, accept/reject/reassign, patient detail, chat/call/GPS, reports/prescriptions/referrals, no-show/cancel, wallet/withdrawal, notifications, ratings, drug index/jobs, settings, and logout.
- [ ] Admin Dashboard screen/button audit: enumerate authentication/RBAC, provider/facility approvals, users, orders/bookings, queues/broadcast/reassignment, catalog/drugs, insurance, payments/refunds/payouts/ledger, labs/radiology/nursing/hospital/ambulance operations, notifications, audit logs, exports, configuration, localization/theme, and destructive-action safeguards.
- [ ] Consultation lifecycle matrix: online, clinic, home; cash, card, insurance/copay; doctor/facility/specialty/price; working hours/slots/holidays/leave; booking/confirm/reschedule/cancel/no-show; chat before/during/after; video/audio initiate/ring/accept/reject/end; prescription/sick leave/report/referral/follow-up/rating/receipt/notifications.
- [ ] Pharmacy lifecycle matrix: delivery/pickup/refill/reorder; cash/card/insurance; catalog/stock/substitution; broadcast/accept/reject/reassign; cart/approval/tracking/completion; cancellation at each state; inventory before/after; receipt/rating/notifications.
- [ ] Laboratory lifecycle matrix: branch/home; test catalog/preparation; cash/card/insurance/out-of-network; booking/sample/analyzing/result/report; accept/reject/reassign/reschedule/cancel; report access and BOLA; notifications.
- [ ] Radiology lifecycle matrix: branch/home/modality/PACS; cash/card/insurance; booking/perform/images/report; inbox/respond/allocate/finalize; reassign/reschedule/cancel/no-show; report access/BOLA; notifications.
- [ ] Nursing/home-care lifecycle matrix: catalog/broadcast/accept/reject/reassign; availability; arrival/start/in-progress/complete; GPS/geofence; notes/care plan/supplies; emergency/no-show/cancel; cash/insurance/pending-finance-review; rating/notifications; provider/patient/admin isolation.
- [ ] Hospital/facility lifecycle matrix: directory/profile/branches/departments; appointment; staff invite/onboard/roles; hospital-admin versus provider; schedules/leave; patient tracker; discharge/report/resources/announcements/internal chat; UUID contract; audit logs.
- [ ] Shared workflow matrix: notifications creation/read/read-all/foreign isolation; wallet/cards/topup/transfer/withdrawal/ledger; family invite/join/permissions/records/remove; chat membership/typing/messages; LiveKit origin/token/no-show; OTP/2FA/rate limits; webhooks/signatures/idempotency; error contracts.
- [ ] Extended feature audit: nutrition, mental health, pregnancy, cycle/ovulation, medication reminders, AI triage/diagnosis boundaries, drug index, provider jobs, personalization, SEO/GEO/share links, multilingual content, and automatic theme.
- [ ] Provider intake E2E: doctor/lab/radiology/pharmacy/nursing/hospital/ambulance sandbox login and onboarding state; online toggle; request broadcast/inbox; accept/reject/timeout/reassign; payment/insurance branch; patient minimization; chat/call/GPS/report; notification; wallet/withdrawal; settings/logout.
- [ ] Cross-account BOLA for every lifecycle: patient1 owner, patient2 foreign, provider1 assigned, provider2 foreign, hospital-admin, admin; verify reads/mutations/state/ledger/notifications/reports are 403/404 as appropriate.
- [ ] Cross-platform QA: Android/iOS/Huawei source/build, small/medium/tablet layouts, orientation/background/permissions, weak network/retry, push/deep links, calls/GPS, RTL/LTR/six languages, light/dark automatic/manual theme, accessibility, crash logs, real-device UAT.
- [ ] For every defect: inspect source → implement fail-closed fix → add regression → build → run full gate → commit/push → deploy confirmation → live recheck → evidence update. No closure on source-only evidence.

- [x] Remote reconciliation update: auditor pushed `f2bffa28609f` (global RolesGuard effective-role/provider_type fix) on top of `629f097`; production live matrix reports provider queue/inbox access restored and BOLA cases green.
- [ ] Reconcile local backend archive and full 269/269 gate against remote `f2bffa2` before any further source claim; retain deployed rollback image/DB evidence.
- [ ] Phase-1 readiness remains open until `/health/readiness` is explained/healthy or formally waived with server evidence; liveness 200 alone is insufficient.

- [x] Independent backend archive gate from remote `f2bffa2`: extracted 702 files, dependencies installed successfully, Jest exited 0 with all discovered suites passing; archive SHA `c274ce57313c7406cb2d2100cb5e41feaa94e53691675dedf242602b13e16793`. The auditor's reported total remains 39 suites/269 tests and must be retained as the release count.

- [x] Persisted systematic inventories: Patient App artifact currently contains 249 route/screen markers and Admin Dashboard artifact contains 42 page-route markers, plus API and interactive-handler sections.
- [ ] Expand each inventory marker into a row-level contract with exact screen/button, backend endpoint, payload, role, expected state transitions, and evidence; counts are discovery totals, not pass totals.

- [x] Patient readonly live matrix: login succeeded; notifications, wallet balance/transactions, orders/mine, doctors, labs/packages, radiology/services, pharmacy/products, home-care/services, insurance/companies, and articles returned 200 with structured data. Evidence saved as `PATIENT_READONLY_LIVE_MATRIX_20260818.json`.
- [ ] Reconcile Patient App exact consumers before mutation: `/profile`, `/family`, `/appointments/mine`, `/hospitals` returned 404 and `/services` returned 403 in the generic probe; these may be stale route guesses, so map each screen to its actual controller/endpoint before classifying as defects.

- [x] Patient route reconciliation artifact created: generic probe 404/403 results are not final defects until mapped to exact app consumers/controllers; mutations are prohibited from guessed routes.
- [ ] Re-run Patient reads from exact screen consumers and then begin one controlled sandbox lifecycle at a time with before/after/cleanup evidence.

- [x] Persisted Patient consultation consumer map with 854 lines of source screen/API/navigation evidence in `PATIENT_CONSULTATION_CONSUMER_MAP_20260818.txt`.
- [ ] Resolve consultation consumers into exact endpoints and execute online/clinic/home + cash/card/insurance booking lifecycles with doctor acceptance and patient/provider cross-account evidence.

- [x] Persisted Provider App intake consumer map with 507 lines of screen/API/workflow evidence in `PROVIDER_INTAKE_CONSUMER_MAP_20260818.txt`.
- [ ] Resolve provider consumers to exact backend routes and execute read-only queue/availability probes, then controlled accept/reject/reassign lifecycles per provider type with cross-provider BOLA evidence.

- [x] Persisted Provider intake backend/app route map in `PROVIDER_INTAKE_BACKEND_ROUTE_MAP_20260818.txt` (532 lines) for exact consumer-to-controller reconciliation.
- [ ] Use the reconciled route map to run provider login/queue/availability reads and then accept/reject/reassign only on real sandbox requests, recording provider-type and assignment boundaries.

- [x] Provider readonly probe executed without mutations; evidence saved in `PROVIDER_READONLY_LIVE_MATRIX_20260818.json` and findings in `PROVIDER_READONLY_FINDINGS_20260818.md`. App login contract is confirmed as `POST /provider/auth/login` with email/password/meta.
- [ ] Reconcile provider 404 response bodies as account/contract classification and wait out 429 windows before one-account-at-a-time retry; no repeated login attempts or queue mutations until then.

- [x] Persisted Patient consumer/backend route reconciliation in `PATIENT_CONSUMER_BACKEND_ROUTE_MAP_20260818.txt` (1450 lines), covering profile, family, appointments, pharmacy, labs, radiology, nursing, hospital, wallet, notifications, insurance, and reports.
- [ ] Classify every Patient 404/403 by exact consumer call, backend contract, auth/ownership policy, and screen/workflow impact; then create a safe production probe matrix.

- [x] Inventoried Provider App: 42 screen files and 5 API/context files, plus provider/service controllers; saved in `PROVIDER_SCREEN_CONTROLLER_INVENTORY_20260818.md`.
- [ ] For each provider type (doctor, pharmacy, lab, radiology, nursing, hospital, ambulance), map screen actions to exact backend request lifecycle and mark read-only, mutation, or externally blocked.

- [x] Attempted one exact Patient read-only probe against origin with resolved TLS; session timed out before a response and was killed safely. Evidence: `PATIENT_EXACT_READ_PROBE_20260818.md`. Classified INCONCLUSIVE/transport timeout, not API failure.
- [ ] Re-run Patient exact-read probe only after transport stability is confirmed; record status/body/IDs without persisting tokens.

- [x] Committed and pushed the current QA evidence/register batch to `manus/on-live-reconciliation` as `8136d00` after safely rebasing on remote `f2bffa2`; no source reset or remote work loss.
- [ ] Continue production sandbox lifecycle validation from the pushed route contracts; do not declare release readiness until open INCONCLUSIVE/BLOCKED rows are closed or explicitly accepted.

- [x] Extracted Provider API consumer calls and documented findings in `PROVIDER_API_CONSUMER_CALLS_20260818.txt` and `PROVIDER_API_CONSUMER_FINDINGS_20260818.md`; identified report storage URL, Blueprint, emergency fail-closed, lab-stage, ambulance, wallet and copilot gates.
- [ ] Validate each discovered consumer against live controller/storage/state/notification contracts; no toast-only or fixed-storage URL counts as completion.

- [x] Mapped specialty provider contracts in `PROVIDER_SPECIALTY_CONTRACT_MAP_20260818.md`: pharmacy allocations/broadcasts/inventory/chat, lab bookings/samples/results, radiology provider queue/report/catalog, and home-care/nursing intake/visit/GPS/report.
- [ ] Execute one controlled live read per specialty inbox and then lifecycle mutation only when a real sandbox request exists; classify missing provider types as BLOCKED rather than seeding production data.

- [x] Production infrastructure gate rechecked via origin: liveness 200, readiness 200, MongoDB up, Redis up. Evidence: `PRODUCTION_HEALTH_GATE_20260818.json`.
- [ ] Continue service lifecycle validation; infrastructure health PASS does not close patient/provider workflow or device gates.

- [x] Fixed confirmed Pharmacy placeholders: disabled the fake barcode success action and replaced hardcoded broadcast order/accept toast with live `/provider/pharmacy/broadcasts` data and server-backed accept; Provider typecheck passed and 3/3 Jest contracts passed.
- [ ] Re-run production provider pharmacy read/accept lifecycle after rate-limit window with a real sandbox broadcast only; verify before/after state, notification, and patient visibility.

- [x] Fixed Radiology scan-image placeholder: removed `Coming with S3 integration` action and made local image upload explicitly disabled until authorized storage integration; Provider typecheck and 3/3 Jest contracts remain green.
- [ ] Audit remaining toast-only export/call/device actions screen-by-screen; wire to real contracts where available or make them explicitly disabled/fail-closed.

- [x] Removed fabricated PharmacyRegistration defaults (pricing, Riyadh coordinates, hours, workdays, categories, delivery flags); empty/neutral defaults now require explicit provider input. Typecheck and 3/3 Provider Jest contracts passed.
- [ ] Extend the same default-business-data scan to doctor/lab/radiology/nursing/facility registrations and fix only confirmed non-neutral defaults with the same validation cycle.

- [x] Removed seeded commercial/location/schedule defaults from Doctor, Lab, Radiology, and Nursing registrations; Facility was already neutral. Provider typecheck and 3/3 Jest contracts passed after the batch.
- [ ] Re-test registration validation screens manually/with device builds to ensure required-field errors replace prior defaults and no backend payload accepts empty operational contracts.

- [x] Added regression assertions for fake pharmacy/radiology actions and seeded registration values; Provider typecheck and 5/5 Jest contracts passed.
- [ ] Keep the regression suite as a gate while auditing remaining Patient/Admin screens and live provider lifecycle workflows.

- [x] Post-fix registration scan saved as `PROVIDER_REGISTRATION_DEFAULTS_POSTFIX_SCAN_20260818.txt`; remaining nonzero values are user-selected option definitions or runtime payload fallbacks, not initializer business seeds.
- [ ] Validate runtime form submission rejects missing location/schedule/pricing where required instead of silently persisting zero/empty contracts.

- [x] Removed Doctor submit fallback literals for 09:00/17:00 and 15/20-minute durations; incomplete provider input no longer becomes fabricated schedule/service data. Typecheck and 5/5 Provider Jest contracts passed.
- [ ] Apply the same submit-payload fallback audit to lab/radiology/nursing/pharmacy and add assertions where non-neutral fallback literals remain.

- [x] Saved `PROVIDER_REGISTRATION_VALIDATION_AUDIT_20260818.md`; it records submit paths and confirms a follow-up validation gap: several wizards still need explicit required-field guards after neutral defaults.
- [ ] Add required-field validation for selected service pricing/schedule/location before provider submit, then validate and push as a separate remediation batch.

- [x] Added Doctor Step 4 validation: at least one service, nonnegative price and positive duration for each selected service, and positive home radius plus map location for home visits. Typecheck and 5/5 Provider Jest contracts passed.
- [ ] Add equivalent conditional guards to pharmacy/lab/radiology/nursing submit steps and cover them with regression tests before declaring onboarding workflows closed.

- [x] Added PharmacyRegistration pre-submit guards for identity/address/map location, medicine category/dispensing mode, and delivery radius/workdays/hours when delivery is enabled. Typecheck and 5/5 Provider Jest contracts passed.
- [ ] Add equivalent pre-submit guards to lab/radiology/nursing registration, then rerun the complete provider regression gate.

- [x] Added Lab and Radiology pre-submit guards for center identity/location, at least one test/scan, center hours, and home-service radius/hours when enabled. Typecheck and 5/5 Provider Jest contracts passed.
- [ ] Add equivalent guards to NursingRegistration, then run the complete Provider source gate and retain the commit for deployment review.

- [x] Added NursingRegistration pre-submit guards for identity/location, selected services/pricing models, positive price per model, coverage radius, and working hours. Full Provider typecheck and 5/5 Jest contracts passed after the complete guard batch.
- [ ] Re-run device/manual onboarding flows against the deployed build; source gate is green but production deployment and real account registration remain separate gates.

- [!] Provider Android Expo export is blocked: `package.json` points to Expo AppEntry but the authoritative snapshot has no root `App.tsx/js/jsx`; evidence: `audit-artifacts/PROVIDER_EXPO_BUILD_BLOCKER_20260818.md`. Do not create a guessed entrypoint; restore the authoritative navigation entry before device/store claims.
- [ ] Restore Provider App entrypoint from authoritative source register, then rerun Expo export/prebuild and device gates.

- [ ] Restore the verified Provider `App.tsx` entrypoint plus its required `PushNotifications`, `ProviderHome`, `LiveKitRoomProvider`, and `PharmacyChatResponder` modules from `/home/ubuntu/nabdah-source-readonly/provider-app`; then rerun typecheck, Jest, and Expo export.

- [x] Restored verified Provider `App.tsx` plus `PushNotifications`, `ProviderHome`, `LiveKitRoomProvider`, and `PharmacyChatResponder` from source-readonly; Provider typecheck passed, 5/5 Jest contracts passed, and Android Expo export succeeded with one 5.4 MB Hermes bundle. Evidence: `PROVIDER_ANDROID_EXPORT_METADATA_20260818.json`.
- [ ] Run native prebuild/device matrix against this restored entrypoint; Android export is a bundle gate, not proof of emulator/farm/runtime readiness.

- [x] Expo prebuild passed after App restoration; native project generation is reproducible and generated folders were intentionally not committed. Evidence: `PROVIDER_NATIVE_PREBUILD_20260818.md`.
- [ ] Add production app icon and install `expo-system-ui` or document the managed-workflow equivalent before store submission; rerun prebuild after that configuration decision.

- [x] GitHub verification confirms the restored Provider entrypoint/runtime modules and export/prebuild evidence are present on `origin/manus/on-live-reconciliation`; local tree is clean at `bf80020` plus documentation commit pending.

- [x] One controlled doctor sandbox login succeeded (HTTP 201) and exact read-only probe returned `progress=200`, `notifications=200`, `wallet/balance=200`, `wallet/transactions=200`; `provider-onboarding/my-profile=404` remains an exact-contract reconciliation item. No mutation or response body was persisted.
- [ ] Map the 404 `my-profile` consumer to the exact controller route before any provider lifecycle mutation; then run the same one-account read gate for the next provider type outside active 429 windows.

- [x] Recorded `PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md`: local backend controller calls missing `getMyProfile`, while live doctor probe has `my-profile=404` and `progress=200`; no backend code was changed because the snapshot is not a Git working tree and the Provider consumer does not use the route.
- [ ] Reconcile authoritative backend repository/image and add boot/typecheck coverage for provider-onboarding controller/service method parity before changing or removing my-profile.

- [x] One controlled lab sandbox login succeeded (HTTP 201); read-only probe returned `progress=200`, `notifications=200`, `wallet/balance=200`, `wallet/transactions=200`, `labs/provider/inbox=200`, and `labs/samples=200`. Only statuses/body sizes were persisted; no queue mutation occurred.
- [ ] Use a real sandbox lab request, if one exists and is confirmed safe, for the next accept/execute lifecycle; otherwise classify lab lifecycle as blocked by absence of an eligible sandbox request rather than inventing one.

- [x] One controlled radiology sandbox login succeeded (HTTP 201); read-only probe returned `progress=200`, `notifications=200`, `wallet/balance=200`, `wallet/transactions=200`, `radiology/provider/inbox=200`, and `radiology/services=200`. Only statuses/body sizes were persisted; no mutation occurred.
- [ ] Confirm an eligible sandbox radiology request before testing accept/execute/report lifecycle; absence of a safe request remains BLOCKED, not a reason to fabricate one.

- [x] Reconciled Pharmacy route mismatch: `/pharmacy/provider/queue` and `/pharmacy/provider/broadcasts` returned 404, while controller-declared `/provider/pharmacy/broadcasts` returned 200 with an empty read-only list. No accept/reject mutation was attempted.
- [ ] Update PharmacyDashboard consumer to use the controller-declared `/provider/pharmacy/broadcasts` contract, then rerun Provider typecheck/Jest and recheck the live read route after deployment review.

- [ ] Fix PharmacyDashboard reject consumer from stale `/pharmacy/orders/:id/reject` to controller contract `/provider/pharmacy/broadcasts/:orderId/reject`, then run Provider typecheck/Jest and push.
- [ ] Reconcile ProviderApi.login consumer (`/auth/login` with phone) against the verified `/provider/auth/login` email contract before onboarding login is declared complete.

- [x] Fixed PharmacyDashboard reject action to call `/provider/pharmacy/broadcasts/:orderId/reject`, matching the backend controller; Provider typecheck and 5/5 Jest contracts passed.

- [x] Recorded dormant Provider auth drift: unused `ProviderApi.login` posts phone credentials to `/auth/login`, while live sandbox provider login uses `/provider/auth/login` with email; no speculative API change was made.
- [ ] Before release, either remove the dormant helper or update it under an approved provider-auth contract with a direct auth regression test.

- [ ] Fix Pharmacy OrderHistoryScreen stale GET `/provider/pharmacy/orders` to the declared provider allocations read contract with `status=completed`, then run Provider typecheck/Jest and push.

- [x] Fixed Pharmacy OrderHistoryScreen to read `/provider/pharmacy/allocations?status=completed`, matching the declared provider controller; Provider typecheck and 5/5 Jest contracts passed.

- [x] Live recheck of the corrected pharmacy history route returned `200` with an empty list for `GET /provider/pharmacy/allocations?status=completed` using the pharmacy sandbox token; no mutation occurred.

- [x] One controlled nursing sandbox login succeeded (HTTP 201); read-only probe returned `progress=200`, `notifications=200`, `wallet/balance=200`, `wallet/transactions=200`, `/nursing/visits=200`, and `/nursing/visits?status=pending=200`. Only statuses/body sizes were persisted; no visit mutation occurred.
- [ ] Confirm an eligible sandbox nursing visit before testing accept/start/complete/location lifecycle; empty inbox is BLOCKED for mutation testing.

- [x] One controlled hospital sandbox login succeeded (HTTP 201); read-only probe returned `progress=200`, `notifications=200`, `wallet/balance=200`, `wallet/transactions=200`, while `/hospital/staff=403`. This is classified as expected least-privilege for a non-hospital-admin provider account; no staff mutation occurred.
- [ ] Obtain/verify a dedicated sandbox hospital-admin role before testing staff list/create/update/delete; do not weaken the 403 for an ordinary hospital provider.

- [x] Patient exact-read retry succeeded after the prior transport timeout: sandbox login HTTP 201; `/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/wallet/transactions`, `/orders/mine`, `/doctors`, and `/insurance/companies` all returned HTTP 200. Only statuses/body sizes were persisted; no mutation occurred.
- [ ] Run the Patient-1/Patient-2 BOLA read/mutation isolation matrix only after selecting a real sandbox order/appointment ID from Patient-1 and recording before/after state; do not fabricate an ID.

- [x] Live Patient BOLA mutation matrix completed on real sandbox order `62039080-53eb-4ca2-8bac-69c2a7bb038f`: Patient-1 owner read before=200 and after=200 with identical body size; Patient-2 foreign read=403 and foreign cancel=403. No state-changing owner action was executed.

- [x] Rechecked report PDF BOLA on the same real sandbox order: owner `GET /orders/:id/report.pdf` returned 200 (1524 bytes) and foreign Patient-2 returned 403 (71 bytes). PDF bodies were deleted and not committed.

- [x] Classified Pharmacy lifecycle as `BLOCKED_NO_ELIGIBLE_PROVIDER_ASSIGNMENT`: a real Patient-1 pending order exists with `pharmacy_id=475a602c-eb2d-486d-9ffd-ea3a70da0004`, but the pharmacy sandbox account's `/provider-onboarding/progress` returned `{"started":false}` and its broadcast list was empty. No accept/reject/dispatch mutation was attempted against an unmatched provider.
- [ ] Provision or identify a properly linked sandbox pharmacy/provider assignment through the approved test setup, then rerun the full pharmacy lifecycle with before/after state and cleanup.

- [x] Inspected the real lab provider inbox read-only and saved a sanitized summary. It contains one request `76166cc4-7c29-4762-944b-c7c9de45bb15` already in `REPORTED` state and one non-request wrapper entry without a status; no pending/accepted sandbox request is eligible for accept/collect/analyze mutation.
- [ ] Re-run lab lifecycle only when an eligible sandbox request in a pre-report state is linked to the sandbox lab; do not mutate the already reported request.

- [ ] Add contract-test assertions for Pharmacy broadcast GET, accept, reject, and completed-history routes so the corrected consumers cannot regress to stale paths.

- [x] Added regression assertions for Pharmacy broadcast GET, accept, reject, and completed-history routes; Provider typecheck and 5/5 Jest contracts passed.

- [x] Recorded `LABS_ENGINE_LEGACY_AUTH_DRIFT_20260818.md`: legacy `labs/bookings` lifecycle controller lacks visible guard/current-user/ownership checks; no legacy lifecycle mutation was executed.
- [ ] Reconcile this legacy controller against the deployed backend route map/image; if mounted, add centralized auth/provider-role/ownership tests before activation.

- [x] Recorded `LAB_CONTRACT_RECONCILIATION_BLOCKER_20260818.md`: LabDashboard has ~30 `/labs/bookings/*` consumers while overlapping legacy `LabsEngineController` mutations lack visible auth/ownership; lifecycle mutations remain blocked until deployed route mapping is confirmed.
- [ ] Resolve the deployed mapping between guarded `LabsController` service routes and legacy `LabsEngineController`, then add/verify ownership and provider-role tests before executing LabDashboard mutations.

- [ ] Remove Admin disputes fabricated fallbacks (`amount || 150`, synthetic patient/provider names, and synthetic dispute reason) and render explicit missing-data states from the backend contract instead.

- [x] Recorded `ADMIN_DISPUTES_SOURCE_SCOPE_BLOCKER_20260818.md`: Admin disputes renders fabricated financial/name/reason fallbacks, but the full Admin tree is outside live-work and its authoritative Git source is not yet proven; no unlinked snapshot was edited.
- [ ] Identify the authoritative Admin repository/worktree, remove fabricated fallbacks, add regression tests, then build and revalidate before any Admin readiness claim.

- [x] Audit-report application build gate passed after installing the declared pnpm version: frozen install, production build, and TypeScript check all PASS; asset/chunk warnings are documented in `AUDIT_REPORT_BUILD_GATE_20260818.md`.
- [ ] Reduce audit-report main chunk and verify runtime-resolved storage asset in the deployed preview before final report delivery.

- [x] Saved `PHASE5_REVALIDATION_SUMMARY_20260818.md` separating verified PASS evidence from lifecycle/Admin/device/gateway BLOCKED items and the superseded transport INCONCLUSIVE.

- [x] Issued `FULL_SYSTEMATIC_QA_FINAL_REPORT_20260818.md` with the evidence-based release verdict, verified gates, lifecycle blockers, Admin source scope blocker, Lab contract drift, payment/device constraints, and internal evidence references.


# برنامج الإغلاق الكامل للإنتاج — 2026-08-18

- [ ] تجميد المستودعات والـcommits authoritative للـBackend وPatient وProvider وAdmin وتسجيل hashes وربط النشر.
- [ ] إنتاج مصفوفة شاشة × زر × consumer × controller × database contract لكل Patient وProvider وAdmin.
- [ ] إزالة كل placeholder وfallback تجاري وfake success وstale route وbuild blocker، وإضافة اختبار regression لكل إصلاح.
- [ ] إنشاء أو ربط sandbox fixtures حقيقية لكل خدمة ودور دون اختلاق بيانات إنتاجية.
- [ ] تنفيذ Patient E2E كاملاً لكل خدمات الاستشارة online/clinic/home، pharmacy، lab، radiology، nursing، hospital، insurance/cash، الدفع، الإلغاء، إعادة الجدولة، no-show، التقارير، الإشعارات، المحفظة وBOLA.
- [ ] تنفيذ Provider E2E كاملاً لكل نوع مزود: onboarding، availability، inbox/broadcast، accept/reject/reassign، التنفيذ، GPS، chat/video، التقارير، insurance/cash، wallet/payout، settings وحدود الدور.
- [ ] تنفيذ Admin E2E كاملاً: login/2FA، dashboard، users، moderation، catalog، disputes، ledger، payouts، insurance، procurement، notifications، SOS، RBAC وaudit logs.
- [ ] إغلاق WebSocket والدفع والويبهوك/idempotency وOTP/2FA والتوطين والثيمات وSEO/structured data والأداء والrate limits.
- [ ] بناء واختبار Android/iOS/Huawei والمحاكيات والمزرعة وTestFlight وdeep links وpush/calls/GPS/RTL/lifecycle/permissions.
- [ ] تشغيل release gate على commit المنشور وإعادة health/security/smoke/E2E، ثم إصدار شهادة جاهزية فقط عند PASS لكل البوابات الإلزامية.

- [x] Captured file counts and tree hashes for Patient, Provider, Backend, and both Admin candidate snapshots in `AUTHORITATIVE_SOURCE_HASH_SNAPSHOT_20260818.txt`.
- [ ] Resolve Admin candidate divergence and map each snapshot to its actual Git repository/commit before source edits.


- [x] Corrected scope: `Alhrajplus` and `Naps-admin` are unrelated projects and are excluded from all Nabdah work.
- [x] Nabdah scope is restricted to `https://github.com/obaid08642-ops/new.git` and its branches only; no files from unrelated repositories may be used as source or evidence.
- [ ] Re-enumerate only the branches and Nabdah components inside `new`, then reconcile each source snapshot to a branch/commit before continuing implementation.

- [x] Indexed the 11 branches of `obaid08642-ops/new` in `NABDAH_NEW_REPOSITORY_BRANCH_INDEX_20260818.txt`; unrelated repositories remain excluded.
- [ ] Compare branch trees and identify which Nabdah branch contains the latest Patient, Provider, Backend, and Admin authoritative source before selecting the implementation base.

- [x] Fetched and indexed all branches of `obaid08642-ops/new` only; `fix/e2e-operational-contracts-20260814` is the direct four-component source candidate, while milestone branches are archive-based.
- [ ] Compare hashes and source trees between `fix/e2e-operational-contracts-20260814`, packaged artifacts, and `manus/on-live-reconciliation`; select the direct Nabdah patch base before implementation.

- [x] Confirmed `fix/e2e-operational-contracts-20260814` at `21006cc` is the direct four-component Nabdah source branch inside `new` (backend 619, patient 602, provider 97, admin 125 files).
- [ ] Create a verified Nabdah-only source worktree from `fix/e2e-operational-contracts-20260814`, then reconcile the previous provider fixes and QA evidence without importing unrelated repositories.

- [x] Ran and cleaned an isolated source merge trial inside `new`; no branch was changed and the only direct binary conflict was recorded in `NABDAH_SOURCE_MERGE_TRIAL_20260818.md`.
- [ ] Deliberately reconcile direct Nabdah trees and verified Provider/QA changes, regenerate packages only after full source gates pass, then push the resulting implementation commit to `manus/on-live-reconciliation`.

- [x] Recorded `NABDAH_DIRECT_BACKEND_BUILD_ENV_BLOCKER_20260818.md`: direct backend lockfile differs from the local extracted dependency tree and clean install is blocked by peer resolution/inode quota; no invalid build PASS was claimed.
- [ ] Run exact direct-backend Jest/build in a sufficient-inode environment and record the result before merging or deploying the full source tree.

- [x] Created `NABDAH_DIRECT_COMPONENT_INVENTORY_20260818.txt` from the direct Nabdah source branch only: 494 Patient route/source files, 39 Provider screen files, 15 Admin page files, 111 Backend controllers, and 137 Backend services.
- [ ] Expand this inventory into screen/button/consumer/controller/database/state matrices, then test every unresolved mapping rather than counting files as completion.

- [x] Generated `NABDAH_SCREEN_BUTTON_CONTRACT_INVENTORY_20260818.tsv` from direct Nabdah source only: 1,858 Patient markers, 1,262 Provider markers, and 38 Admin markers.
- [ ] Normalize the raw markers into unique screen/action/endpoint records and classify each as wired, stale, placeholder, fail-closed, or requiring backend/fixture proof.

- [x] Normalized the Nabdah screen/button inventory into `NABDAH_SCREEN_BUTTON_CONTRACT_UNIQUE_20260818.tsv`: 3,158 unique markers, 580 endpoint-bearing records, 10 placeholder candidates, 32 fail-closed reviews, and 6 stale/environment candidates.
- [ ] Manually validate every candidate classification against the direct Backend controller/schema and convert each record to PASS, FIX, BLOCKED, or INCONCLUSIVE with evidence.

- [x] Compiled 933 full Backend routes from class/method decorators and produced `NABDAH_BACKEND_COMPILED_ROUTES_20260818.tsv`.
- [x] Produced `NABDAH_ENDPOINT_CONTROLLER_MATCH_20260818.tsv`: 587 extracted path-like records, 235 matched controller routes, and 352 requiring review; many unmatched records are client navigation paths such as `/(tabs)` and must be filtered before defect classification.
- [ ] Filter non-API navigation paths, recover HTTP methods from call context, and manually classify the remaining unmatched consumer routes against controller prefixes/constants.

- [x] Separated UI navigation literals from actual network calls and extracted 404 concrete API call records across Patient/Provider/Admin.
- [x] Method-aware matching found 260 direct matches and 144 review candidates; documented that concatenated/template expressions require reconstruction before defect classification.
- [ ] Reconstruct and validate all 144 API review candidates, including response-shape/auth checks; no route is considered stale from string matching alone.
- [x] Filtered the 352 route-review records into 91 navigation/template records and 261 API-candidate records in `NABDAH_UNMATCHED_API_REVIEW_20260818.tsv`; the 261 remain open for full expression reconstruction.

- [x] Verified repository identity: only `obaid08642-ops/new`; direct implementation source is remote `fix/e2e-operational-contracts-20260814` at `21006cc`, and QA evidence is remote `manus/on-live-reconciliation` at `d3eb266`.
- [x] Confirmed the QA branch is being used for audit evidence, not as a substitute for the direct implementation source; removed the interrupted untracked backend dependency directory.
- [ ] Continue strictly in plan order: finish contract review, then build/test gates, then sandbox-only production E2E.

- [x] Corrected the execution source to `manus/on-live-reconciliation` at `d59a8bfa` after verifying it is 311 commits ahead of the old `fix/e2e-operational-contracts-20260814` ref.
- [x] Confirmed the current reconciliation branch uses the cleaned single-artifact layout; backend/patient source and provider/admin artifacts must be extracted from the committed archives before build or source inspection.
- [ ] Extract and audit only the source artifacts from `manus/on-live-reconciliation`; do not use the old fix branch as an implementation base.

- [ ] Audit historical push/commit destinations from the conversation and Git history; identify exactly which branch received each Backend/Patient/Provider/Admin change.
- [ ] Verify whether current `manus/on-live-reconciliation` contains all four application artifacts or only Backend/patient archives, and record any missing Provider/Admin source artifacts.

- [ ] Resume Full Systematic QA from the verified `manus/on-live-reconciliation` branch at current remote HEAD; extract and audit all four committed application artifacts before any new implementation.
- [ ] Preserve the original closure order: contract inventory -> build/test gates -> sandbox-only E2E -> fixes/revalidation -> readiness report.

- [ ] Build the expanded service × booking-mode × payment/insurance × location × lifecycle × actor matrix before declaring any workflow complete.
- [ ] Add explicit screen/button/state checks for patient selection, scheduling, confirmation, payment, insurance approval, provider intake, execution, reporting, tracking, cancellation, reschedule, refund/ledger, notifications, and admin oversight.
- [ ] Cover all service families: consultations, pharmacy, laboratory, radiology, nursing/home-care, hospitals/facilities, ambulance/emergency, nutrition, maternity, mental health, AI tools, family/health records, wallet, support, and shared account flows.

- [ ] Integrate Pasted_content_17 requirements: doctor search/profile/availability with holidays, blocked slots, existing bookings, split shifts, and immediate versus scheduled service.
- [ ] Add consultation branches for clinic, home, and online care across cash and insurance, including insurance pending/approved/partial/rejected and patient copay confirmation.
- [ ] Add provider-side insurance intake with complete patient/service/coverage details, external insurer submission boundary, decision entry, and patient/provider notifications.
- [ ] Add consultation communication lifecycle: pre-visit chat window, reminders, ready-to-call gate, video/voice controls, files, reconnect/end states, and access authorization.
- [ ] Add consented clinical context and attachments before booking; prescription, referral, lab/radiology/home-care orders after consultation; independent ordering per downstream service; completion and rating flows.
- [ ] Apply the same decision/state/screen/button model to pharmacy, laboratory, radiology, nursing/home-care, and facility workflows, including prescription-required versus OTC medication logic.

- [ ] Preserve and execute the original QA/remediation roadmap while adding the full service-journey expansion from Pasted_content_17.
- [ ] Audit Patient screens and actions end-to-end across discovery, booking, payment/insurance, confirmation, execution, results, prescriptions, referrals, ratings, profile, family, wallet, support, localization, theme, permissions, and recovery states.
- [ ] Audit Provider screens end-to-end across onboarding, profile/clinic/facility identity, availability/holidays/shifts, insurance/cash settings, inbox/broadcast, accept/reject/reassign, execution, reports, communication, wallet, payouts, notifications, settings, and security.
- [ ] Audit Admin screens end-to-end across operations, approvals, providers/facilities, catalogs, orders/bookings, insurance, finance/ledger, reports/charts, notifications, support, audit logs, feature/config controls, privacy, and role governance.
- [ ] For every feature, detect missing logical CTA/screen/state, local-only success, fabricated/hardcoded data, stale route, missing backend/database transition, broken error/loading/empty/retry state, accessibility/localization issue, and security/ownership gap.
- [ ] Apply the complete service journey model to consultations, pharmacy, laboratory, radiology, nursing/home-care, hospitals/facilities, ambulance/emergency, nutrition, maternity, mental health, AI, family/records, wallet, support, and shared account flows.

- [ ] Perform a final completeness review of the master plan against the entire conversation and all supplied requirement files; do not assume the current service list is exhaustive.
- [ ] Check for omitted cross-cutting areas: search/discovery, pricing/catalogs, consent/privacy, analytics, audit/compliance, fraud/abuse, accessibility, localization, SEO/web, app-store/device release, observability, backups/restore, scaling/queues, and incident/support operations.
- [ ] Record any new gaps as explicit scenarios and release gates before implementation continues.

- [ ] Do not start any numbered phase until the owner explicitly says `ابدأ` for that phase.
- [ ] At the end of every phase, perform a line-by-line checklist review against the phase scope, verify artifacts/tests/source state, commit and push only to `manus/on-live-reconciliation`, then report completion and wait for the owner’s next-phase command.
- [ ] Never declare a phase complete when an item is untested; classify it as PASS, FIX, BLOCKED, or INCONCLUSIVE with evidence.

- [ ] Preserve every existing phase and add a dedicated competitive UX/workflow benchmark phase before final remediation.
- [ ] Define competitor cohorts by domain: teleconsultation, pharmacy/e-prescription, laboratory, radiology/imaging, home nursing, hospital/facility, nutrition/maternity/mental health, and integrated health platforms.
- [ ] Research public flows and provider/operations experiences screen-by-screen where legally and technically accessible; record source URL, date, platform, observed steps, evidence, and confidence.
- [ ] Compare competitor journeys against Nabdah by task, actor, screen, CTA, state, pricing/insurance, handoff, notification, recovery, accessibility, and trust/safety; separate observed facts from recommendations.
- [ ] Convert only validated opportunities into Nabdah requirements; do not copy protected design/content or fabricate competitor behavior.

- [x] Rebase Phase 1 source verification on the latest `main` branch as requested; compare its ancestry, commit tip, and four application artifacts with `manus/on-live-reconciliation` before continuing.
- [x] Do not start Phase 2 or modify source until the `main` baseline comparison is documented and the owner-approved source reference is explicit.

- [x] Compare `main` and `manus/on-live-reconciliation` at commit, tree, archive, extracted-file, source-fix, mock-data, and manifest levels before Phase 2.
- [x] Classify each difference as source fix, audit evidence, regenerated artifact, missing file, stale file, mock/hardcoded data, or unresolved conflict; do not choose a baseline by commit date alone.
- [x] Determine and document the approved source policy: `main=53ba7da` is the default final source, while QA remains verification evidence; no silent whole-archive merge was performed.
- [ ] Apply the end-of-phase double-check protocol to every future Phase: compare to plan, complete missing items, re-test, document evidence, push, and wait for owner approval.

- [x] Phase 2 approved baseline: use `main=53ba7da` as the effective source default and `manus/on-live-reconciliation` as the evidence branch; do not restore `selfassessment.repository.ts`, do not commit `.env` or Firebase secrets, and do not build from another branch.
- [ ] Phase 2 Patient closure must include source inventory, screen/button/state matrix, API/Backend contract matching, mock/hardcoded data scan, navigation/route checks, and user-journey gaps before any remediation is declared.

- [x] Compare every changed/unique Patient file between main and QA, including AI, diagnostics, medicines, nutrition, maternity, mental health, reports, family, localization, medication notifications, route backups, and release configuration. Current reconciled reference is byte-identical to main across the full Patient tree; see `NABDAH_PHASE2_PATIENT_FULL_TREE_SOURCE_COMPARISON_20260819.md`.
- [x] For each differing file, record a decision: MAIN, QA, MERGED, or BLOCKED, with evidence for feature completeness, real backend/data integration, placeholder/mock absence, security, and build compatibility. No current reconciled-reference differences exist; prior sensitive candidates were resolved as MAIN_DEFAULT_IDENTICAL_CURRENT_REFERENCE.
- [ ] Prioritize and inspect advanced Patient features: medicines/OTC and prescriptions, nutrition, pregnancy/maternity/baby growth, mental health, AI, diagnostics/labs/radiology, reminders, reports, family permissions, wallet, and support.
- [ ] Extend the same file-level decision method to Provider operational screens in the next Provider phase: onboarding, profiles, availability, insurance/cash settings, intake, accept/reject/reassign, execution, reports, payouts, maps, chat, and notifications.

- [x] Phase 2 source policy: treat `main` as the default final source; use QA only as a verification reference unless a specific file is proven newer, better integrated, less synthetic, and build-compatible.
- [x] Record any exception to the main-default policy per file/feature with evidence and owner-facing rationale; never silently replace whole app archives or branches. No current reconciled-reference exception exists.

- [x] Compare the latest Patient files for profile, medication reminders, medication reorder/refill, chronic conditions, chronic medications, nutrition, cycle tracking, maternity/pregnancy follow-up, and mental health against main and the verification archive. The current reconciled tree is byte-identical to main.
- [x] Record a per-file decision (MAIN, ALTERNATIVE, MERGED, FIX, or BLOCKED) with feature, API contract, state, synthetic-data, and test evidence; do not silently mix archives. Current source decision is MAIN_DEFAULT_IDENTICAL_CURRENT_REFERENCE; behavioral and safety gates remain separately open.
- [ ] Verify selected files build and preserve real backend integration, loading/error/empty states, ownership, localization, and medical-safety constraints before Phase 2 closure.

- [ ] Correct Phase 2 reporting: describe most Patient/Provider/Admin changes as rebuilds or internal rewrites of existing screens, not newly added screens.
- [ ] Verify the only actual additions in the stated scope: six Patient translation dictionaries with tests, medication-notifications.ts, and Provider PlatformMap.tsx/.native.tsx/.web.tsx; record Admin as internal changes across the existing 34 pages with no new pages.
- [ ] Reclassify every apparent new screen/feature claim in the audit as existing-screen rebuild, genuine addition, removed synthetic data, or unresolved gap, with source evidence.

- [ ] Phase 2 confirmed Patient defect: wire `profile/addresses.tsx` `إضافة عنوان جديد` button to a real create-address form using `POST /users/me/addresses`, with validation, loading/error/retry, ownership, RTL/LTR, accessibility, and duplicate-submit protection.
- [ ] Phase 2 confirmed Patient diagnostics booking defects: replace fabricated address/provider/slot/document/price data; map insurance fields to `insurance_provider` and `insurance_member_id`; remove unsupported wallet booking choice; use server-authoritative quote/payment state; and preserve idempotent cart/payment sequencing before live activation.
- [ ] Phase 2 confirmed Patient maternity medical-state defects: remove local fabricated week/due-date/profile fallbacks; make setup/profile state Backend-authoritative; add rollback/retry after failed status/checkup mutations; require verified pregnancy inputs before profile creation; and make educational/prediction content week-specific, clearly estimated, and medically safe.
- [ ] Phase 2 confirmed Patient mood-journal defects: collect or intentionally contract energy/stress/sleep values; align activities and notes fields with Backend schema; prevent duplicate submission; and distinguish history-load errors from an empty owned history.
- [ ] Phase 2 confirmed Patient AI nutrition-plan defects: align generator response schema with rendered UI; persist an owned reviewed plan or remove the false save action; surface profile persistence/generator failures; retain consented dietary preferences; and add safe bounds, limitations, and contraindication handling before health-plan presentation.
- [ ] Phase 2 confirmed Patient medication-reminder defects: stop silently converting monthly to weekly; preserve fractional doses or constrain input; derive daily count from selected times; implement or remove unpersisted refill promises; clearly label manual instructions; and verify real notification scheduling/cancellation across timezone and device lifecycle.
- [ ] Phase 2 confirmed Patient chronic-refill defects: pass returned `order_id` to tracking; move refill stock/date transition to the verified fulfillment state; align threshold copy with backend; require eligible medication identity; and add idempotency/duplicate-order protection for retries.
- [ ] Phase 2 confirmed Patient Family Calendar defects: replace Android-incompatible `Alert.prompt` with a real cross-platform event form; require actual schedule/member fields; scope delete to creator/owner or explicit capability; distinguish fetch failure from empty state; and hide family permission controls from non-owners.
- [ ] Phase 2 confirmed Patient insurance approval payment-handoff defects: require an explicit owned request/booking ID; display only server-authoritative financial values; create a real server-owned copay/payment intent; pass its returned transaction/payment metadata to processing; and render not-found/error/retry rather than indefinite pending state.
- [ ] Phase 2 confirmed Patient insurance payment-split defects: replace missing `/insurance/payment-confirm` with a documented server-owned copay/payment contract; bind request/booking ownership and approved state; calculate all shares server-side; provide idempotent intent/cash handling; and route only from canonical server entity response.
- [ ] Phase 2 confirmed Patient consultation insurance/financial defects: bind insurance to a validated owned policy or a manual review request; keep insurance appointments pending until decision; use central authenticated coverage transport; render only server quotes/coplay; constrain the confirmed visit type to the validated slot; and test online/clinic/home cash-card-insurance workflows end to end.
- [ ] Phase 2 confirmed Patient vital-sign defects: align type/payload/time and recent-response schemas; validate finite type-specific readings and BP pairs client/server; replace false universal normal/high thresholds and summary labels with medically reviewed, context-aware or neutral status; and test all vital types with owned sandbox records.
- [ ] Phase 2 confirmed Patient Family Chat defects: resolve messages through authoritative active FamilyGroup membership; reject no-group/removed users; use the canonical group identifier; revoke chat access immediately on leave/removal; and test owner/member/removed/unrelated sandbox cases.
- [ ] Phase 2 confirmed Patient monthly-report defects: consume canonical appointment `slot_start`/normalized report fields; distinguish partial source failure from an empty report; depend only on corrected vital-status semantics; and replace Arabic-only month/copy rendering with all-language locale-aware formatting.
- [ ] Phase 2 confirmed Patient medical-report viewer/AI defects: replace invalid `/reports/:id` with canonical `/medical-reports/:id`; normalize `id`/legacy `reportId` across hub, diagnostics, health, and notification entry paths; add safely categorized failures and six-language copy; require a specific PHI-share confirmation/minimal export; and define authenticated attachment handling before exposing it.
- [ ] Phase 2 confirmed Patient home-care/nursing defects: replace unsent multi-day/transport/provider choices and client estimates with server quotes and canonical recurrence/assignment contracts; implement an owned insurance-request/coplay state machine; route new requests to truthful awaiting-assignment/payment states; consume real availability; persist safe structured location for authorized tracking; normalize provider DTO/reviews; add usable error/retry/rating states; and complete six-language RTL/LTR coverage.
- [ ] Phase 2 confirmed Patient diagnostics/lab/radiology defects: replace local AM/PM/UTC slot construction with canonical server slots; require structured home address/contact and validated insurance inputs; render returned server quote/state and preserve recovery through payment; enforce the safety questionnaire server-side; implement validated radiology price/service/slot/payment contract; fail-close radiology reads/mutations for patient/provider/admin ownership with BOLA tests; and complete six-language safe error handling.
- [ ] Phase 2 confirmed Patient wallet defects: remove hard-coded/non-tokenized card addition and use gateway tokenization only; make transfer debit/credit/ledger rows atomic or block the capability; add idempotent transfer references and recovery UI; replace Android-incompatible prompts with an accessible confirmation form; enforce advertised family/provider recipient eligibility or label a generic transfer; and complete six-language financial copy.
- [ ] Phase 2 confirmed Patient profile/notification-settings defects: prevent unverified default clinical data after load errors; add sensitive medical/identity DTO validation and consent/audit boundaries; show save/upload recovery states; make notification preferences complete/merged/rollback-safe and actually enforced by delivery with documented emergency override; reconcile inbox read failures; and complete six-language accessible UI copy.
- [ ] Phase 2 confirmed Patient triage/drug-interaction safety defects: suspend misleading diagnostic/coverage claims; add explicit JWT/patient ownership, rate limits, audit and typed contract tests; replace incompatible scanner DTO/rules and false-negative failure UI with an approved clinical source or a clearly limited unavailable state; remove fabricated tests/dead referral action; keep SOS/QR/emergency fail-closed pending approval; and complete clinically reviewed six-language copy.
- [ ] Phase 2 confirmed Patient skin-analysis defects: keep image collection/transmission fail-closed pending legal/product consent and retention approval; remove fabricated scores/recommendations/accuracy claims and `Unknown`-as-success behavior; require a clinically governed typed response/escalation model; add safe retries and six-language accessible permission/disclaimer copy.
- [ ] Phase 2 confirmed Patient loyalty defects: make reward stock/points/ledger/claim creation atomic; add idempotency and stable claim recovery; replace predictable coupon creation with secure owned expiry/redemption tokens; remove client hard-coded SAR equivalence/default programme terms; and deliver server-authoritative six-language terms and rewards.
- [ ] Phase 2 confirmed Patient privacy/settings defects: replace mismatched/unenforced consent switches with a versioned policy schema and verified processor enforcement; keep sharing, export, and deletion rights fail-closed until legal/product-approved verified workflows exist; remove unsupported ISO/data-sale/72-hour assurances; add auditable withdrawal propagation and six-language accessibility coverage.
- [ ] Phase 2 confirmed Patient data-management defects: remove/disable empty export, portability, and deletion controls until verified rights workflows exist; display Backend-authoritative storage limit with error/retry states; remove unsupported FHIR/HL7/delivery-time/legal-right claims pending approved policy and implementation.
- [ ] Phase 2 confirmed Patient prescription-OCR defects: replace incompatible `items`/`medications` contract and false success state; remove fabricated doses/alternatives/doctor/date/pricing and enforce clinician/pharmacist verification; keep prescription-image processing fail-closed until approved consent/retention controls; implement prescription-linked owned handoffs or remove generic order/reminder/share promises; and provide reviewed six-language error/disclaimer content.
- [ ] Phase 2 confirmed Patient support workflow defects: replace undeclared `/support/chat` with an authenticated owned/persisted conversation or truthful ticket-only flow; remove fabricated agent/SLA/fallback-chat claims; pass ticket ID to owned detail/reply views; bind attachments to secure ticket records with consent and file controls; and complete six-language status/error copy.
- [x] Phase 3 Provider audit: inventory and validate onboarding, profile, availability, orders/inboxes, service delivery, consultations/calls, pharmacy/lab/radiology/nursing operations, maps, wallet, notifications, settings, localization, UI states, and Backend ownership contracts before closing the phase. Audit evidence is closed; remediation remains tracked below for Phase 8.
- [ ] Phase 3 confirmed Provider network/onboarding defects: remove production custom-HTTP API override; unify/remove conflicting API and WebSocket origins; remove release debug endpoint/port disclosure; and implement the required six-language Provider localization with RTL/LTR validation.
- [ ] Phase 3 confirmed Provider onboarding/trust defects: remove unsupported MOH/encryption/national-origin claims; define or eliminate unauthenticated guest job/drug access; and remove the release long-press custom-host UI/storage path.
- [ ] Phase 3 confirmed Doctor registration/KYC defects: repair missing home-duration contract; remove fabricated location and third-party background-removal; lock pre-approval accounts to no provider/PHI/payment operations; secure/validate document uploads; normalize cash/insurance/services schema; require verified OTP/contract/bank-destination workflow; and complete six-language accessible onboarding.
- [ ] Phase 3 confirmed Lab/Radiology registration defects: apply the same restricted pending-account, secure KYC-document MIME/content validation, scoped submission, bank/OTP/contract verification, and six-language onboarding controls established for Doctor registration.
- [ ] Phase 3 confirmed Doctor provider-configuration defects: replace static schedules/exceptions/insurers/copays/credentials with owned server DTOs; persist vacation state and booking impact; implement audited insurance/config updates and secure credential/media upload/review; replace local-only location/coverage/fee success with validated contracts; remove inactive placeholders; and complete six-language accessible UI.
- [ ] Phase 3 confirmed Provider pharmacy-reception defects: replace invalid accept route with server broadcast claim contract; implement or remove partial/substitution flow; persist audited online availability; display only patient-safe authoritative dispatch fields; replace static pharmacy chat with owned threads; and complete six-language accessible reception UI.
- [ ] Phase 3 confirmed Provider laboratory-operation defects: route insurance decisions through owned approval/copay contracts; separate intake rejection from sample-quality state; remove invented patient/test/price/time and zero-on-failure dashboard values; normalize inbox state DTO mapping; remove invalid radiology navigation; and complete six-language accessible clinical/financial UI.
- [ ] Phase 3 confirmed Provider radiology-operation defects: replace fabricated report URL/success with secure owned file workflow; implement provider acceptance/rejection/payment contracts rather than generic state patching; validate/persist insurance decisions; use real slot reservation for reschedule; enforce safety contraindication workflow; distinguish outage from empty operations; and complete six-language minimum-PHI UI.
- [ ] Phase 3 confirmed Provider nursing-operation defects: replace drifted queues/response calls with canonical home-care contracts; change provider decline to audited reallocation rather than patient cancellation; remove fabricated distance/demographic/care/timing values; persist acknowledged availability with rollback; disable no-visit quick actions and keep SOS/location/QR fail-closed; and complete six-language minimum-PHI UI.
- [ ] Phase 3 confirmed Provider facility-operation defects: enforce selected branch scope across every facility query/mutation; replace client-generated/displayed temporary staff passwords with secure server invitations; load truthful facility/order/activity states with error handling; apply server-governed least-privilege staff roles; disable QR/SOS pending approval; and complete six-language minimum-PHI UI.
- [ ] Phase 3 confirmed Provider ambulance/emergency defects: preserve SOS/location/QR/consent fail-closed; remove active mission fallback controls; define approved coded legal/clinical handover and completion records; prohibit best-effort tracking until consent/retention/audit exists; replace false availability/history/empty states; and complete approved six-language minimum-PHI emergency UI.
- [ ] Phase 3 confirmed Provider doctor-reception defects: replace local cash collected success and free-form insurance handoff with idempotent server-owned financial/insurance transitions; remove inferred patient/payment/time data; repair reachable queue error/retry states; unify authenticated realtime origin/rooms; replace emoji/raw AR/EN with accessible six-language UI; and keep SOS/location/QR fail-closed.
- [ ] Phase 3 confirmed Provider doctor-clinical workflow defects: replace simulated video/chat and hard-coded EHR with authenticated owned clinical/session DTOs; prevent guest/wrong-patient and Arabic-duration E-prescription corruption; remove static/custom unverified medication/templates and enforce approved catalogue/clinical checks; implement or disable delivery/PDF/insurance actions; keep clinical QR/documents fail-closed; and deliver reviewed six-language accessible clinical UI.
- [ ] Phase 3 confirmed Provider shared communication/support defects: remove fabricated fallback chats/tickets; make messages and notifications server-acknowledged/idempotent with retry/reconciliation; implement or disable secure calls/attachments; normalize thread DTO fields; use owned ticket/FAQ contracts; and add six-language minimum-PHI/privacy controls.
- [ ] Phase 3 confirmed Provider shared security/analytics defects: replace local devices/2FA/biometrics with protected session/enrolment/revocation contracts; remove fabricated wearable health data and static clinical reference content until governed integrations exist; disable simulated masked calling; replace fabricated analytics/exports with server-authoritative error-aware outputs; retain QR fail-closed; and complete six-language accessibility/minimum-PHI review.
- [x] Phase 4 Admin audit: inventory and validate authentication/2FA, role and branch scope, provider/KYC approval, patient/support operations, orders/services/insurance, finance/payouts/refunds, reports/exports, content/settings, notifications, audit trails, localization, UI states, and Backend ownership contracts before closing the phase. Audit evidence is closed; remediation remains tracked below for Phase 8.
- [ ] Phase 4 confirmed Admin authorization-shell defects: replace browser-controlled admin role/token checks and localStorage credential storage with verified protected sessions/permissions; enforce least-privilege and branch scope across navigation and APIs; replace empty icons; and deliver accessible six-language RTL/LTR Admin UI.
- [ ] Phase 4 confirmed Admin command-centre defects: remove synthetic heatmap placement; render explicit stale/error/retry telemetry states; bind health/orders/location feeds to minimum-necessary role/scope/audit controls; and complete exhaustive six-language responsive status/date/currency UI.
- [ ] Phase 4 confirmed Admin provider-moderation defects: require auditable KYC activation decisions/checklists/reviewer evidence and high-risk maker-checker controls; type/classify/mask provider deltas with reasons/step-up approval; distinguish failed load from zero queues; replace free-text suspension with policy/case/appeal scope; and complete six-language accessible governance UI.
- [ ] Phase 4 confirmed Admin payout defects: render maker-checker routing/reference rather than false paid success; make payout state/ledger reservation atomic/idempotent/reconcilable; require verified destination/proof/actor receipt; preserve mandatory rejection reasons across legacy/provider sources; mask IBAN by finance role/step-up audit; and complete six-language accessible financial status UI.
- [ ] Phase 4 confirmed Admin insurance/refund defects: add explicit server finance/admin permissions with negative-role tests; separate/refine refund decision and money-execution states with mandatory reason/audit/receipt/reconciliation/maker-checker; make transitions atomic; reveal per-source load failures; remove raw insurance JSON in favor of field-masked DTOs; and complete six-language accessible status UI.
- [ ] Phase 4 confirmed Admin RBAC-matrix defects: serve/generate complete versioned Backend role/permission/branch-scope policy rather than a static duplicate; include omitted authoritative roles and intentional guest explanation; show/enforce step-up/reason/audit safeguards for impersonation/export/backup; and provide accessible six-language policy visualization.
- [ ] Phase 4 confirmed Admin SOS/emergency defects: retain all SOS/location/QR/consent operations fail-closed; replace free-text hospital assignment and optional-note resolution with approved owned dispatch/outcome/handover state machines; prohibit ungoverned PHI/location/map disclosure; remove false-safe/fallback facts; and deliver approved six-language high-risk action safeguards only after activation.
- [ ] Phase 4 confirmed Admin audit-log defects: remove localStorage bearer use in favor of verified session client; show audit-source error/stale/retry states; substantiate immutable/ABAC claims with provenance/integrity evidence; add scoped filters/pagination/masked detail/export/audit; remove fabricated actor/time fallbacks; and complete six-language accessibility.
- [ ] Phase 4 confirmed Admin configuration/maintenance defects: add explicit privilege guards/negative tests; derive actors from verified sessions; implement a real verified kill-switch rather than body-ID/no-op claim; validate SLA responses/version/concurrency and block defaults on load failure; require approved break-glass/incident/step-up/dual-control/audit/recovery; remove unsupported immutable/ABAC claims; and complete six-language high-risk UI.
- [ ] Phase 4 confirmed Admin user-management defects: disable permanent deletion pending approved privacy-rights/retention/case workflow; replace browser-confirm ban/reactivation with auditable policy/appeal/session-revocation state machine; minimize/mask full user/PHI/family/activity data by role/purpose/scope; correct rejected-versus-pending filters; add pagination and typed moderation decisions; and complete six-language accessible high-risk UI.
- [ ] Phase 4 confirmed Admin medicine-catalog defects: replace direct clinical/Rx field publication with sourced/versioned clinical-governance and high-risk approval/rollback; harden browser image upload/storage moderation; bind shortage claims to location inventory/evidence/expiry; type/risk-classify change requests with mandatory reasons and truthful failures; and complete clinically reviewed six-language content.
- [ ] Phase 4 confirmed Admin support-ticket defects: implement owned assignee/SLA/resolution/reopen/escalation case workflow; minimize/mask ticket/thread PHI by role/purpose with view audit; add guarded/idempotent/consented reply delivery and templates; provide filtered/paginated triage queues; and complete six-language confidentiality/accessibility UI.
- [ ] Phase 4 confirmed Admin notification/campaign defects: add consent-filtered audience preview/content/maker-checker/audit before broad send; show truthful retarget execution/error state; restrict deep links to typed allowlists; validate schedule timezone/quiet-hour/recipient context server-side; expose per-source load failures; and complete six-language accessible privacy UI.
- [ ] Phase 4 confirmed Admin financial-ledger/warehouse defects: remove hard-coded client commission/VAT earning calculations; verify/render payout gateway/maker-checker response rather than false completion; mask bank data; create server-validated, versioned, approved warehouse quotes with acceptance/expiry; expose all financial source failures; and complete six-language accessible legal/financial UI.
- [ ] Phase 4 confirmed Admin AI-gateway defects: enforce approved provider/feature PHI/medical-image policy, consent/residency/retention and clinical model governance; add step-up/maker-checker/versioned audit/rollback/error states for routing changes; distinguish gateway/usage outage from loading/no use; add safe governance metrics; and complete six-language accessible high-risk UI.
- [ ] Phase 4 confirmed Admin nursing-operation defects: replace free-text direct nurse assignment with scoped eligible-provider/reassignment/acceptance/audit workflow; remove fabricated patient/service/address fallbacks; expose queue outages/retry; and add approved six-language minimum-PHI high-risk controls.
- [ ] Phase 4 confirmed Admin dispute-resolution defects: separate case decision, forced cancellation, refund authorization and payment execution with idempotent E2E tests; require typed response/receipt/ledger reconciliation; implement evidence/reason/appeal/maker-checker case workflow; remove localStorage/failure-as-empty/fabricated-case facts; and complete six-language high-risk confidentiality UI.
- [ ] Phase 4 confirmed Admin service-catalog defects: replace immediate generic clinical/service/price/turnaround publication with versioned clinical/operations/finance governance; replace delete with dependency-aware retirement/rollback; secure image sourcing; add typed package/service constraints; expose semantic error/stale states; and complete six-language patient-impact localization.
- [x] Phase 5 Backend/Database cross-app audit: verify route/controller/service/schema/DB invariants for every Patient, Provider, and Admin contract; reconcile duplicated compatibility/legacy modules, state transitions, pricing/payment/insurance, media/storage, realtime, notifications, authorization and migrations before closing the phase. Audit evidence is closed; remediation remains tracked below for Phase 8.
- [ ] Phase 5 confirmed canonical/legacy data defects: collapse parallel pharmacy order/allocation/broadcast state to a reconciled canonical state machine/outbox; migrate duplicate provider profiles with exact parity, controlled reader/write cutover and rollback; replace estimated/static legacy evidence with exact generated reconciliation/invariant reports.
- [ ] Phase 5 confirmed workflow-engine defects: enforce all persisted transitions through the shared engine; fail safely on unknown state; add transactional outbox/reconciliation for events; use verified availability/location/schedule and scoped matching; and publish versioned lifecycle contract/migration tests.
- [ ] Phase 5 confirmed consistency-reconciliation defects: prohibit direct orphan cancellation and route remedial actions through reviewed cross-domain workflow/finance/insurance/inventory/retention effects; replace capped 30-day sampling with exact partitioned reconciliation; define true domain duplicate keys; create durable event backfill/failure reports; and detect stale states across every service.
- [ ] Phase 5 confirmed storage/media defects: make visibility server-derived by data purpose and prohibit public sensitive documents; fail closed on private Cloudinary signing errors; add content/MIME/malware/DLP/quarantine validation; remove sensitive inline-DB fallback; replace generic guest ownership with expiring moderated identities; and enforce purpose/consent/retention/audit metadata.
- [ ] Phase 5 confirmed payment-engine defects: authorize retry/verify/list by patient ownership or assigned scoped staff before mutation/read; sign and validate provider webhooks; reserve intent/retry idempotently and atomically; couple payment/refund/event/realtime through durable outbox/reconciliation; require governed refund execution; and expose payment readiness while Moyasar remains owner-deferred.
- [ ] Phase 5 confirmed insurance/quote defects: derive signed quote from canonical service/slot/provider/policy; create one idempotent insurance request from an owned booking with verified price/assignment; verify copay through bound paid transaction/webhook; atomically project insurance decisions to booking/payment workflow; secure/verify policy evidence; and snapshot approved finance rules.
- [ ] Phase 5 confirmed realtime/WebSocket defects: remove arbitrary generic room joining and enforce server room membership/purpose; verify waiting-room participant/appointment state; scope presence lookup; persist idempotent message delivery/read cursors; make offline replay acknowledgment-based; and replace process-memory queues/fixed ETA with durable shared lifecycle state.
- [ ] Phase 5 confirmed authorization-guard defects: fail closed if impersonation audit fails and replace header impersonation with case/purpose/step-up/TTL/scoped sessions; enforce branch/tenant scope for privileged roles; trust only verified proxy IP; add JWT session/device/user-status/role-version revocation; and define safe invalid-token behavior for public routes.
- [ ] Phase 5 confirmed transaction-schema defects: add database-enforced active-intent/idempotency/gateway-reference uniqueness; redact/encrypt client secret and PSP payload by purpose; enforce money/currency/refund invariants; and store immutable actor/case/PSP payment-refund event evidence.
- [ ] Phase 5 confirmed event-bus defects: replace swallow-and-fanout with transactional durable outbox; add aggregate/version/causation/idempotency keys and idempotent consumers; replace in-process-only fanout with resilient distributed delivery; and add scoped cursor/retention/integrity/audit event-stream controls.
- [x] Phase 6 security/ownership/privacy matrix: consolidate and validate patient/provider/admin/guest/removed-member/foreign-account access rules across REST, WebSocket, storage, payments, PHI, location, audit, impersonation, emergency, QR, consent, privacy rights and sensitive mutations before closing the phase. Audit evidence is closed; remediation and negative testing remain tracked below for Phase 8–11.
- [ ] Phase 6 confirmed public care-discovery defects: require active/published state for every public provider/facility/detail/slot route; return only versioned allowlisted public DTOs; filter inactive similar/facility records; replace raw regex search; return truthful pagination; and enforce coarse consented public location/schedule policy.
- [ ] Phase 6 consolidated security matrix: implement and later prove negative access tests for foreign patients, removed/unrelated family, unassigned/cross-facility providers, role/scope escalation, revoked tokens, forged WebSocket room/appointment/thread, unsigned/replayed webhooks, private/expired storage URLs, and all deferred emergency/QR/consent/privacy-rights boundaries.
- [ ] Phase 3 confirmed Provider payout defects: make balance/pending-withdrawal reservation atomic and idempotent; require verified bank-account destination/change controls before payout; retain and display server withdrawal reference/state/ledger recovery; and complete six-language accessible financial/legal UI.
- [ ] Phase 2 accelerated independent discovery batch: complete static contract and workflow reviews for Family permissions/chat, medical-report AI, health-day/vitals, pharmacy cart/order confirmation, insurance flows, and consultation booking; consolidate only verified findings before any remediation.
- [ ] Phase 2 Patient visual/UX audit: inventory every screen’s hierarchy, color contrast, typography, surfaces/backgrounds, icon/emoji use, CTA states, top/bottom navigation, RTL/LTR, loading/error/empty states, and accessibility; record only evidenced design defects for Phase 8 remediation.
- [ ] Phase 7 feature-specific competitor benchmark: compare medication reminders, nutrition, mental health, maternity/fertility, pharmacy, diagnostics, nursing, consultations, family, and insurance against credible market products; convert only validated patterns into Nabdah UX decisions and never copy branding or unverified flows.
- [ ] Phase 8 cross-app design system remediation: create and apply a consistent premium design-token, vector-icon, navigation, button, background, and state-feedback standard to Patient, Provider, and Admin only after the relevant functional contracts are fixed and tested.
- [ ] Phase 2 Patient localization audit: verify every visible and announced string across supported languages, RTL/LTR geometry, plural/number/date formatting, fallback behavior, accessibility labels, and no untranslated/development copy before release.
- [ ] Phase 2 confirmed Patient UI/UX localization defects: remove unconditional RTL behavior from bottom navigation; add navigation accessibility labels/states; replace exact-phrase fallback dependence with coverage-tested keys for critical/dynamic copy; and inventory hard-coded visual values for later design-token consolidation.
- [ ] Phase 8 release-candidate governance: prepare a source-change manifest, migration statement, build/test evidence, sandbox E2E evidence, rollback note, and deployment request for the reviewer; do not deploy audit-only commits or unverified source changes.
- [ ] Execution governance: after each Phase, complete the written double-check, tests, evidence update, and QA-branch push, then advance automatically to the next Phase; retain any untestable live/deployment gate as explicitly pending rather than blocking unrelated work.
- [ ] Deployment deferral: when a source change requires server deployment, prepare and send the exact deployment candidate to the reviewer/owner, continue all unrelated audit work, and defer production deployment until explicit reviewer/owner action; never treat the absence of a reply as deployment approval.
- [x] Phase 2 correct API review false positives using screen-level reads and controller aliases before counting any remaining Patient contract defects.
- [ ] Phase 2 Patient runtime build remains BLOCKED until package-lock/package.json synchronization and dependency mirror/network access are resolved in an isolated build environment without silently changing main.
- [ ] Phase 2 Patient release configuration: decide whether to install and configure `expo-system-ui` so the declared `userInterfaceStyle` is effective, then rerun the Android prebuild gate.
- [ ] Phase 2 Patient native APK/AAB gate: Android prebuild passes in the temporary copy, but this sandbox lacks Android SDK/`adb`; run the Gradle release build only in an SDK-equipped CI/device-build environment and preserve its logs/artifact metadata.
- [x] Phase 7 competitor research and screen-by-screen UX benchmark: compared consultations, pharmacy, diagnostics, home care, mental health, nutrition, maternity, medication adherence and provider workflows using official public sources; converted verified patterns into a source-safe Phase 8 backlog without copying brands or treating public descriptions as security proof.
- [x] Phase 8 remediation batch A — public care discovery: enforce active/published status for provider/facility detail and slots, introduce minimum-data public DTO/projections, remove inactive similar records, apply safe bounded search input, return truthful pagination, and add focused backend tests before any UI restyling. Source commit `7cd5c71`; focused Jest and Backend build passed; broader/production-negative acceptance remains Phase 9/11.
- [x] Phase 8 remediation batch B — realtime room ownership: remove generic arbitrary room subscription; authorize each room by canonical appointment/thread/family membership and active participant status; reject malformed/unowned room requests with no event leak; add focused socket-gateway regression tests before any realtime UX change. Source commit `6d07583`; focused realtime tests, combined Phase 8 regressions and Backend build passed; broader/live socket acceptance remains Phase 9/11.
- [x] Phase 8 remediation batch C — payment authorization and webhook integrity: verify payment retry/read ownership before any mutation, require signed trusted gateway webhook configuration, fail closed when signature material is absent/invalid, and add focused regression tests without attempting live payments while Moyasar is owner-deferred. Source commit `35d5587`; payment tests (11), combined Phase 8 regressions (19), and Backend build passed; deployment secret/live sandbox acceptance remains Phase 9/11.
- [x] Phase 8 remediation batch D — privileged JWT/impersonation integrity: fail closed if privileged impersonation audit cannot be persisted, prohibit unscoped impersonation identifiers/role escalation, enforce expiry and effective-role scope at the guard boundary, and add focused negative authorization tests before any admin UX change. Source commit `aeb6062`; focused guard tests (13), combined Phase 8 regressions (32), and Backend build passed. Any future impersonation remains disabled pending a governed server-side session design.
- [x] Phase 8 remediation batch E — Patient locale-aware navigation: remove unconditional RTL and Arabic-only bottom-navigation assumptions; derive direction, labels and accessibility metadata from the active supported locale; retain compact/premium navigation state behavior; and add focused static/runtime tests before broader screen restyling. Source commit `ae0673a`; locale tests (2), Patient typecheck and Expo export passed. Broader six-language screen remediation remains Phase 8–10.
- [x] Phase 8 remediation batch F — family ownership contracts: reconcile member identifier usage with canonical backend IDs, remove legacy family chat data paths, require server-backed active membership before chat/permission operations, and add focused tests without reading or changing non-sandbox family data. Source commit `1171a9e`; family tests (2), combined Backend regressions (34), Backend build and Patient typecheck passed. Sandbox negative acceptance remains Phase 11.
- [x] Phase 8 remediation batch G — clinical vitals contract: reconcile Patient vital input/output keys with the canonical Backend schema (`glucose`, `heart_rate` and approved units), reject malformed clinical entries instead of silently remapping/drop values, and add focused contract tests before any health-summary UI change. Source commit `d2259f9`; health tests (7), combined Backend regressions (41), Backend build and Patient typecheck passed. Sandbox input/history/summary acceptance remains Phase 11.
- [x] Phase 8 remediation batch H — maternity clinical state: remove local fallback pregnancy facts and fabricated milestones; require source-backed patient-entered profile state, clear no-data/error/opt-out states, and add focused contract tests before any maternity UX refinement. Revalidated on the authoritative source: no new source change was required; maternity tests (4), Backend build and Patient typecheck passed. Six-language sandbox/device acceptance remains Phase 10/11.
- [x] Phase 8 remediation batch I — nutrition plan truthfulness: reconcile Patient AI-plan response/save contracts with Backend-owned plan objects, reject malformed/generic responses, remove broken optimistic save behavior, preserve source/clinical-review disclosure, and add focused tests before nutrition UI polish. Revalidated on the authoritative source: unsupported AI-plan routes are safely redirected, nutrition tests (4), six-locale translation tests (2), Backend build and Patient typecheck passed. Future AI plans require a new governed contract.
- [x] Phase 8 remediation batch J — medication reminder fidelity: preserve exact dose/form/route and supported recurrence semantics end to end; prevent monthly-to-weekly coercion; require canonical server persistence before confirmation; and add focused recurrence/precision regressions before reminder UI polish. Source commit `0eedead`; health tests (8), combined Backend regressions (50), Backend build and Patient typecheck passed. Device/sandbox acceptance remains Phase 10/11.
- [x] Phase 8 remediation batch K — payment intent idempotency: require an owned booking and client idempotency key for payment intent creation/retry, prevent parallel active intents at database/query level, enforce gateway-reference uniqueness, expose an existing pending intent safely, and add focused concurrency/duplicate regressions without contacting a live gateway. Source commit `09d3225`; payment/idempotency tests (16), combined Backend regressions (55), Backend build and Patient typecheck passed. Production index preflight/migration and sandbox gateway acceptance remain gated for Phase 9/11.
- [x] Phase 8 remediation batch L — insurance quote/coplay integrity: derive quote and copay from canonical owned booking/service/provider/policy state, bind payment transaction to that request, reject client-supplied price/payment identifiers, project decision/payment through guarded workflow state, and add focused tests without requesting insurer or gateway mutations. Source commit `69d6b56`; insurance tests (46), combined Backend regressions (101), Backend build and Patient typecheck passed. Sandbox lifecycle and provider/gateway acceptance remain Phase 9/11.
- [x] Phase 8 remediation batch M — protected media/storage: derive file visibility from server purpose/owner/relationship rather than request flags, deny public access to clinical/KYC/insurance/report artifacts, fail closed on signing errors, remove sensitive inline fallback exposure, and add focused storage ownership/expiry regressions before media UI polish. Source commit `4e66354`; storage tests (3), combined Backend regressions (104), and Backend build passed. Storage configuration/legacy-asset migration and sandbox access/expiry acceptance remain Phase 9/11.
- [x] Phase 8 remediation batch N — workflow/event integrity: reject unknown lifecycle state mapping, route externally reachable booking/order transitions through canonical workflow guards, block event fanout when durable event persistence fails, and add focused state/event regression tests before provider/patient status UI polish. Source commit `28524aa`; workflow/event tests (4), combined Backend regressions (108), and Backend build passed. Migration of remaining historical direct writes and outbox/retry acceptance remain Phase 8–11.
- [x] Phase 8 remediation batch O — diagnostics booking truthfulness: eliminate fabricated lab/radiology fee, tax, slot and appointment confirmation data; bind review/confirmation to server quote/booking lifecycle; prevent report-link fabrication; and add focused Patient/Backend contract tests before diagnostic UI refinement. Source commit `0ccec6f`; legacy fake screens were already fail-closed, direct report links were removed, Patient typecheck and Expo export passed. Protected report-ID/slot/quote sandbox acceptance remains Phase 9/11.
- [x] Phase 8 remediation batch P — provider diagnostic report integrity: replace client-supplied report/PDF/image URLs with validated private StorageObject references tied to the authorized provider booking, gate report release on stored evidence and lifecycle state, and add focused provider/patient negative tests before radiology/lab report UX refinement. Source commit `29a5927`; focused report tests (2), combined Backend regressions (110), and Backend build passed. Provider migration plus patient/referrer protected delivery/expiry acceptance remains Phase 8–11.

- [x] Phase 8 remediation batch Q — patient mood-journal truthfulness: prevent synthetic mood/energy/stress/sleep values, align UI request/history fields to the authoritative health contract, make errors distinct from an empty history, and add focused client contract tests without fabricating clinical data. Source commit `c865fbf`; Patient tests (16 suites/45), TypeScript, and Expo web export passed. Device/localization and owned sandbox acceptance remain Phase 10–11.

- [x] Phase 8 remediation batch R — chronic medication refill integrity: propagate only a server-returned order identity to tracking, prevent client-side stock or fulfillment claims, preserve the server-owned eligibility/quote/state contract, and add focused contract tests without creating duplicate refill orders. Source commit `0633f61`; Backend full gate (54 suites/332), Backend build, Patient tests (17 suites/47), TypeScript, and Expo web export passed. Verified dispensing quantity/date, linked sandbox lifecycle, payment, notification, and BOLA acceptance remain Phase 11.

- [x] Phase 8 remediation batch S — family-calendar contract and Android compatibility: replace Android-incompatible prompt flows with an accessible form, require server-owned member/schedule fields, preserve owner/capability boundaries for changes and deletion, and distinguish load errors from an empty calendar through focused client tests. Source commit `6d13619`; Backend full gate (54 suites/336), Backend build, Patient tests (18 suites/49), TypeScript, and Expo web export passed. Device form, deployment, linked sandbox family lifecycle/BOLA, and six-language acceptance remain Phase 10–11.

- [x] Phase 8 remediation batch T — insurance copay/payment-split integrity: replace any missing or client-driven payment-confirmation path with a documented server-owned, owned-booking/approved-request contract; keep shares and financial state server-authoritative; add idempotent negative coverage without activating Moyasar. Source commit `edc625c`; Patient tests (19 suites/51), TypeScript, and Expo web export passed. Backend source authority was rechecked; owned sandbox provider decision/payment/webhook/BOLA acceptance remains Phase 11 and Moyasar stays deferred.

- [x] Phase 8 remediation batch U — monthly health-report temporal integrity: normalize appointment time fields to the server contract (`slot_start` with compatible verified legacy fields only), avoid client-side invented counts/summary claims, retain explicit load/empty states, and add focused regression coverage. Source commit `a08bbb6`; Patient tests (20 suites/53), TypeScript, and Expo web export passed. Device/timezone, linked sandbox ownership, and six-language acceptance remain Phase 10–11.

- [x] Phase 8 remediation batch V — Provider network configuration integrity: replace hardcoded debug/localhost endpoint selection with a validated environment-based production configuration, fail closed for missing or insecure release URLs, and add configuration regression coverage without contacting production. Source commit `34e424b`; Provider release contracts (9 tests), TypeScript, and Expo web export passed. Device/weak-network/socket/release-BOLA acceptance remains Phase 10–11; dependency advisories are carried to Phase 9 without blind upgrades.

- [x] Phase 8 remediation batch W — Provider KYC state-gate integrity: require a server-owned verified/active status before exposing or accepting operational content, distinguish pending/rejected/upload failure states, and add focused Provider contract coverage without uploading live documents. Source commit `4fc0b49`; Backend full gate (54 suites/338), Backend build, Provider tests (10), TypeScript, and Expo web export passed. Linked sandbox state matrix, deployment, session refresh, WebSocket/BOLA, and real document acceptance remain Phase 11.

- [x] Phase 8 remediation batch X — Provider pharmacy broadcast contract integrity: align queue/list, accept, reject, and refresh paths to the server-owned allocation/broadcast contract; remove stale endpoint assumptions and local terminal states; add focused Provider/Backend regression coverage. Source commit `6836563`; Backend full gate (54 suites/338), Backend build, Provider tests (11), TypeScript, and Expo web export passed. Linked sandbox broadcast race/inventory/notification/BOLA acceptance remains Phase 11.

- [x] Phase 8 remediation batch Y — laboratory lifecycle/workflow integrity: route provider sample and result transitions through the canonical workflow engine with ownership checks, reject illegal direct state jumps, keep report delivery contingent on validated private evidence, and add focused Backend/Provider regression coverage. Source commit `7f6e811`; Backend full gate (55 suites/341), Backend build, Provider tests (12), TypeScript, and Expo web export passed. Private lab StorageObject binding, QC rejection endpoint, legacy labs-engine containment, and linked sandbox lifecycle/BOLA acceptance remain open and fail closed.

- [x] Phase 8 remediation batch Z — Admin session and governance integrity: remove browser-persistent management tokens, use server-issued HttpOnly cookie authentication with explicit expiry/CSRF behavior, scope admin routes through central authorization, and add focused Backend/Admin regression coverage without logging in to production. Source commit `05d6b7c`; Admin session contract and Next production build passed. Sandbox admin cookie/2FA/CSRF/role-change acceptance remains Phase 11; no production login was performed.

- [x] Phase 8 remediation batch AA — Provider payout reservation integrity: atomically reserve only owned, settled withdrawable balance; require a verified immutable payout destination; preserve idempotent request/reference/recovery state; prevent dashboard success claims before server confirmation; and add focused Backend/Provider regression coverage without creating a payout. Source commit `adf32f1`; Backend full gate (56 suites/344), Backend build, Provider tests (13), TypeScript, and Expo web export passed. Linked sandbox concurrency/bank/admin execute-reject/approval/BOLA acceptance remains Phase 11; no withdrawal or bank transfer was initiated.

- [x] Phase 8 remediation batch AB — Provider nursing queue contract integrity: replace nonexistent intake/response calls with an owned server-backed queue and legal workflow transitions; prevent free-text assignment or local visit completion claims; add focused Backend/Provider regression coverage. Source commit `fe47ed2`; Backend full gate (56 suites/346), Backend build, Provider tests (14), TypeScript, and Expo web export passed. Linked sandbox lifecycle/GPS/notification/BOLA acceptance remains Phase 11; no visit was created or changed.

- [x] Phase 8 remediation batch AC — Facility staff-assignment integrity: replace free-text/direct staff assignment with a server-owned facility roster lookup and authorization check, retain immutable assignment audit state, reject cross-facility identities, and add focused Backend/Provider regression coverage. Source commit `6004620`; Backend full gate (57 suites/348) and build passed. A future roster-list UX remains intentionally unavailable until its typed endpoint/consumer is specified; linked sandbox roster/audit/BOLA acceptance remains Phase 11.

- [x] Phase 8 remediation batch AD — Admin refund/execution integrity: replace client-facing financial-success claims with an owned, idempotent server workflow; require refund eligibility and a verified gateway/ledger transition before terminal state; preserve maker-checker constraints and focused Admin/Backend regression coverage without calling a payment gateway. Source commit `4128f99`; Admin refund contract and full Next build (34 routes) passed. Linked sandbox approval/refund/ledger/notification/BOLA acceptance remains Phase 11 and Moyasar is deferred.

- [x] Phase 8 remediation batch AE — Ambulance emergency-record integrity: require a verified backend incident identity and assigned ambulance/facility ownership before queue, location or completion actions; contain any placeholder records or unverified emergency state; add focused Backend/Provider regression coverage while preserving owner-approved SOS/QR fail-closed boundaries. Backend `claim()` now requires an approved, available vehicle owned by the authenticated provider and binds the vehicle ID (not caller ID); driver missions expose only approved fleet records; unit tracking rechecks vehicle assignment. Provider AmbulanceDashboard selects/passes the vehicle and shared non-ambulance SOS/GPS views are fail-closed. Focused Backend 3/3, full Backend 58 suites/351, Backend build, Provider contracts 15/15, Provider TypeScript and Expo web export passed. Archive commit `ad4fcae`; linked sandbox emergency acceptance remains Phase 11.

- [x] Phase 8 remediation batch AF — Doctor clinical-record and communications integrity: require the owned provider-request guard before prescription/lab retrieval, clinical completion and medical report issuance; derive report patient and insurance policy/price from server-owned request/profile records; reject foreign patients/non-progress completion/missing policy; remove wallet/chat/pre-visit/inbound-report fixtures and non-acknowledged sends; contain unapproved insurance, calendar, video and QR-accreditation claims; require successful waiting-room response before positive action state. Backend focused 5/5, full gate 59 suites/356, Backend build, Provider contracts 16/16, TypeScript and Expo web export passed. Archive commit `7ea7d4f`; private-report listing, approved video/calendar/insurance integration and sandbox ownership/clinical-transition acceptance remain Phase 11.

- [x] Phase 8 remediation batch AG — Admin governance/maintenance integrity: require admin role metadata for governance routes; remove caller-supplied admin identity and prevent any configuration mutation or operational-success claim when audited infrastructure dispatch, immutable audit attribution, dual approval and recovery verification are absent; contain browser SLA/maintenance controls behind an explicit unavailable state; add focused Backend/Admin regression coverage. Backend focused 1/1, full gate 60 suites/357, Backend build, Admin contract 1/1 and clean-environment Next production build (34 routes) passed. Archive commit `91688ab`; owner-approved maintenance runbook/infrastructure, authorized audit/fraud acceptance and deployment verification remain Phase 11/owner work.

- [x] Phase 8 remediation batch AH — Admin campaign delivery governance: derive campaign/broadcast creator identity from authenticated admin session; require explicit audience confirmation for bulk segments; allowlist segments and safe in-app deep links; validate schedule window and target user; prevent empty-audience terminal success; require acknowledged server responses before client success/refresh; remove manual browser retargeting pending privacy/review policy; add focused Backend/Admin regression coverage. Backend focused 4/4, full gate 61 suites/361, Backend build, Admin contracts 2/2 and clean-environment Next production build (34 routes) passed. Archive commit `2436a06`; maker-checker campaign approval/audit retention, push-provider delivery, consent/suppression and sandbox outreach acceptance remain Phase 11/owner work.

- [x] Phase 8 remediation batch AI — Admin SOS privacy and dispatch containment: preserve admin role metadata but fail closed before list/detail PHI/location exposure, manual hospital assignment, dispatch or terminal resolution while emergency/location/consent/closure contracts remain unapproved; replace the browser SOS monitor with an explicit unavailable state; add focused Backend/Admin regression coverage. Backend focused 1/1, full gate 62 suites/362, Backend build, Admin contracts 3/3 and clean-environment Next production build (34 routes) passed. Archive commit `4f73d5c`; owner-approved emergency protocol, dispatch roster/vehicle/facility verification, narrow audited administrative visibility and reviewer-authorized sandbox acceptance remain Phase 11/owner work.

- [x] Phase 8 remediation batch AJ — Patient locale technical-key containment: merge feature locale keys across all six supported languages; ensure missing secondary-locale keys render an exact reviewed Arabic source fallback rather than a raw technical key; add central contract coverage for every shared/feature key and dynamic exact translation; run patient tests, TypeScript and production web export. Patient i18n focused 2/2, full test/export gate passed, and archive integrity passed. Archive commit `8d7ca1d`; human linguistic/medical review, full screen-by-screen RTL/LTR/device evidence, plural/date/assistive-technology acceptance and remaining premium design-system rollout remain Phase 9–11 work.

- [x] Phase 8 remediation batch AK — Admin AI/PHI governance containment: preserve admin role metadata but fail closed before reading model routing/usage or mutating provider/mode state while health-data governance, retention policy, immutable change audit and operational review are unapproved; replace browser AI control with explicit unavailable state; add focused Backend/Admin regression coverage. Backend focused 1/1, full gate 63 suites/363, Backend build, Admin contracts 4/4 and clean-environment Next production build (34 routes) passed. Archive commit `f71110b`; owner-approved AI governance, PHI minimization/retention, audited configuration change, safety evaluation and reviewer-authorized sandbox acceptance remain Phase 11/owner work.

- [x] Phase 8 remediation batch AL — Provider shared UI accessibility/RTL foundation: improve the central `NBtn` used by provider workflows with semantic accessibility role/label/state, touch target expansion, controlled native-only haptic feedback, RTL-aware content flow and primary visual elevation; add source contract coverage and run Provider tests, TypeScript and production web export. Provider contracts 17/17, TypeScript and Expo web export passed, and archive integrity passed. Archive commit `a7ed9fa`; screen-by-screen visual audit, all six-language provider coverage, device accessibility testing and remaining premium token/icon rollout remain Phase 9–11 work.

- [x] Phase 8 remediation batch AM — Patient shared UI accessibility/RTL foundation: improve central patient buttons/cards with language-aware content direction, semantic button role/state, touch target expansion and accessible interactive cards; add source contract coverage and run Patient tests, TypeScript and production web export. Patient focused contracts 3/3, full test/export gate passed, and archive integrity passed. Archive commit `339404f`; screen-by-screen visual audit, contrast/theme/device accessibility evidence and human six-language review remain Phase 9–11 work.

- [x] Phase 8 remediation batch AN — Admin nursing-operation privacy/assignment containment: preserve admin role metadata but fail closed before listing unassigned home-care requests with address/PHI or directly assigning an arbitrary provider while eligible-provider scope, nurse acceptance, minimum-PHI visibility and immutable audit workflow are unapproved; replace browser nursing portal with explicit unavailable state; add focused Backend/Admin regression coverage. Backend focused 1/1, full gate 64 suites/364, Backend build, Admin contracts 5/5 and clean-environment Next production build (34 routes) passed. Archive commit `64ab8dc`; owner-approved nursing assignment/reassignment/acceptance/audit workflow and reviewer-authorized sandbox acceptance remain Phase 11/owner work.

- [x] Phase 8 remediation batch AO — Admin dispute/financial decision containment: preserve admin role metadata but fail closed before listing dispute/support facts or invoking an order force-cancel from a generic dispute decision while evidence/reason/appeal, maker-checker, typed receipt, refund authorization/execution and ledger reconciliation workflows are unapproved; replace browser dispute portal with explicit unavailable state; add Admin regression coverage. Backend full gate 64 suites/364, Backend build, Admin contracts 6/6 and clean-environment Next production build (34 routes) passed. Archive commit `6b24887`; owner-approved dispute/refund case workflow and reviewer-authorized sandbox acceptance remain Phase 11/owner work.

- [x] Phase 8 remediation batch AP — Admin service-catalog publication containment: fail closed before creating, changing or retiring laboratory, radiology or nursing catalog entries while versioned clinical/operations/finance approval, dependency-aware retirement/rollback, approved media sourcing and typed service constraints are unapproved; replace browser catalog manager with explicit unavailable state; add Admin regression coverage. Backend full gate 64 suites/364, Backend build, Admin contracts 7/7 and clean-environment Next production build (34 routes) passed. Archive commit `7dd7466`; owner-approved catalog governance and reviewer-authorized sandbox acceptance remain Phase 11/owner work.

- [x] Phase 8 source-remediation double-check — Replayed unified current-source gates after AE–AP: Backend 64 suites/364 plus build; Admin contracts 7/7 plus clean Next build/34 static routes; Provider contracts 17/17, TypeScript and Expo web export; Patient full Jest suite, TypeScript and Expo web export. All four archives passed ZIP integrity. Result: source remediation and containment evidence are internally consistent; **not a production-release approval**. Blockers retained explicitly: owner legal/product approval for SOS/QR/consent/location, Moyasar live activation/testing, reviewer-authorized sandbox E2E, Android/iOS real-device builds/tests, human six-language/RTL review, comprehensive screen-by-screen premium design audit, and deployment/rollback owner action.

## Phase 11 sandbox acceptance follow-up — 2026-08-19

- [ ] P1 candidate: obtain reviewer-authorized deployment and post-deployment sandbox proof for the fixed `GET /prescriptions/:id` authorization path. The current Patient1 sandbox list has no prescription record, so a live BOLA proof is not yet available.
- [x] P1 source remediation: `GET /prescriptions/:id` now passes the authenticated caller into a participant/privileged-admin authorization check that existence-hides foreign records; focused 6/6 plus full Backend 65 suites/370 tests and `nest build` passed, and archive SHA-256 is `2b47f9e7f5c289d3d35d9b211fe0de07f931aa39c08c0006c90cc4e08bdcfac3`.
- [x] Rechecked the transient read timeout for `GET /unified-bookings/mine` with an explicit eight-second request bound: Patient1 owner list returned `200` and Patient2 foreign detail returned `404`; the timeout did not reproduce and is retained as an inconclusive transport observation, not an accepted availability defect.
- [x] Phase 11 bounded sandbox acceptance: Wave 1/2 read-only and negative authorization evidence, archive remediation for prescription-detail ownership, current archive integrity and blockers were double-checked in `NABDAH_PHASE11_FINAL_DOUBLE_CHECK_20260819.md`. This closes the bounded acceptance phase, not production release.
- [x] Phase 12: prepared the final production-readiness report, owner/reviewer deployment decision package, rollback and post-deployment smoke checklist in `NABDAH_PHASE12_FINAL_PRODUCTION_READINESS_REPORT_20260819.md` without executing a deployment; verdict is NO-GO until the documented blockers close.

## Readiness resumption — 2026-08-19

- [x] Reconciled every remaining release blocker against its current package locks, evidence, owner dependency and required acceptance proof in `NABDAH_READINESS_RESUMPTION_BLOCKER_RECONCILIATION_20260819.md`; classified each as source-fixable, externally gated or deployment-gated.
- [x] Performed controlled dependency remediation for Backend Nest/XLSX and Patient/Provider Expo SDK findings with lockfile integrity, clean gates and no force upgrades. Backend is now 0 high/critical; Patient/Provider remain blocked only by current Expo/RN upstream advisory paths that have no safe current fix. Final double-check: `NABDAH_DEPENDENCY_REMEDIATION_FINAL_DOUBLE_CHECK_20260819.md`.
- [x] Backend dependency remediation: replaced SheetJS with ExcelJS in the two actual spreadsheet contracts, migrated the coherent Nest ecosystem to 11, updated Google Vision and the bounded glob lock resolution, and preserved JWT duration typing. Focused 3/3, full Backend 67 suites/373 tests, Nest build and clean install passed; current audit is 28 moderate with zero high/critical. Archive SHA-256 `82b8d667a147d8fe1b771e2c837940738d5e92e7906daf23ecad25cb1d96837e`; evidence is `NABDAH_BACKEND_DEPENDENCY_MIGRATION_20260819.md`.
- [x] Patient Expo migration: removed the stale `expo.sdkVersion` configuration, completed incremental 54→55→56→57 migration, and ran diagnostics/full source gates; archive evidence is `NABDAH_PATIENT_EXPO_SDK57_MIGRATION_20260819.md`.
- [x] Patient SDK 56 gate repair: restored explicit Jest/Node test types, removed the now-unnecessary direct React Navigation dependency after converting the unconsumed deep-link type to a local structural contract, and replaced all observed `StyleSheet.absoluteFillObject` uses with supported layout styles.
- [x] Patient SDK 56 gate repair: aligned `@react-native/jest-preset` with the upgraded React Native line and restored the Jest suite before final SDK 57 verification.
- [x] Patient SDK 56 Expo Doctor repair: moved splash branding to `expo-splash-screen` plugin, removed schema-invalid/direct Expo packages and installed `expo-asset`; config, typecheck, tests and export passed.
- [ ] Patient native compatibility: validate `react-native-callkeep` and `react-native-webrtc` on Android/iOS signed builds and two physical devices before release; Expo Doctor retains this New Architecture warning and it must not be excluded without evidence.
- [x] Provider Expo migration: removed schema-invalid configuration, retained the genuinely used DateTimePicker runtime package without peer bypass, and completed incremental SDK 54→55→56→57 with clean diagnostics and source gates; evidence is `NABDAH_PROVIDER_EXPO_SDK57_MIGRATION_20260819.md`.
- [x] Provider SDK 55 gate repair: aligned React test renderer, React/Jest types and Jest Expo with React 19.2, and used clean installs to resolve stale package state without `--force` or `--legacy-peer-deps`.
- [x] Provider SDK 55 correction: the original unused-DateTimePicker hypothesis was disproved by three active imports; the package was restored, its optional Windows-only peer was omitted through project install policy, and Android/iOS/Web export then passed.
- [x] Provider SDK 55 gate repair: normalized `ColorSchemeName` before light/dark state update.
- [x] Provider SDK 56 gate repair: replaced removed StyleSheet APIs, installed required vector icons, and removed the unconfigured DateTimePicker config plugin while retaining the runtime package.
- [x] Provider SDK 57 gate repair: rebuilt a clean React Native 0.86.2 tree with the required Jest preset, removed unused Expo Router from dependency/config, and eliminated schema-invalid Android cleartext configuration.
- [x] Provider SDK 57 Expo Doctor repair: deduplicated Expo Image Loader through controlled `npm dedupe` and clean install; final Expo Doctor is 21/21.
- [x] Provider SDK 57 native remediation: migrated active scanner paths to the already used Expo Camera contract, migrated alerts from expo-av to Expo Audio, added Expo Asset peer dependency and regression contracts; source gates passed.
- [ ] Provider native compatibility: validate camera barcode scans, Expo Audio alert behavior, LiveKit/WebRTC, push, GPS, background state, RTL and accessibility on signed Android/iOS builds and physical devices before release; source gates cannot replace this evidence.
- [x] Provider Expo SDK 57 source migration: `npm ci`, TypeScript, 1 suite/19 tests, Android/iOS/Web export and Expo Doctor 21/21 passed. Archive SHA-256 `6aaf4f74806eb4c79d95805fcd52a15a802abb3ea8885cc3b7701f54bcdfc711`; audit remains 8 moderate/16 high/0 critical because current Expo/RN upstream fixes would require an unsafe downgrade, documented in `NABDAH_PROVIDER_EXPO_SDK57_MIGRATION_20260819.md`.
- [ ] Re-audit remaining source-level UX, six-locale translation, RTL/LTR, accessibility and truthful-data contracts; fix only confirmed defects, with source gates and archive evidence.
- [ ] Provider six-locale localization P0: replace the AR/EN-only `lang === 'ar'` presentation model with a typed translation architecture covering Arabic, English, Urdu, Hindi, Bengali and Filipino; inventory and translate every provider screen, error and accessibility label before treating localization as release-ready.
- [x] Provider i18n foundation: extend `Lang`, persistent LanguageContext and typed shared `TR` keys to all six supported locales, including correct Arabic-only RTL behavior and a regression test for non-technical fallback keys before migrating individual screens. The shared 99-key dictionary has passed TypeScript, 20 contract tests and production web export; migration and human review of every screen remain open.
- [x] Provider six-locale shared dictionary: added Urdu, Hindi, Bengali and Filipino translations for all 99 shared keys, typed them in `src/i18n/sharedLocales.ts`, and made language persistence/device detection/cycling accept `ar/en/ur/hi/bn/fil` while forcing RTL only for Arabic. Evidence: `NABDAH_PROVIDER_SIX_LOCALE_FOUNDATION_20260819.md`; archive SHA-256 `8dbd573c4e3e83ccadb815a257b6692ed1d78d6a437506c4a8ccbb5e298818ac`.
- [x] Provider i18n source inventory: identified 49 source files with 5,299 AR/EN presentation branches; 3,755 human-text occurrences collapse to 2,810 unique Arabic/English pairs. Evidence: `NABDAH_PROVIDER_LOCALIZATION_INVENTORY_20260819.md`.
- [x] Provider static text six-locale migration: routed all 3,755 extracted direct Arabic/English text branches across 49 files through a generated, validated 2,810-pair resolver for `ar/en/ur/hi/bn/fil`; TypeScript, 25 contract tests and Expo web export passed. Evidence: `NABDAH_PROVIDER_FULL_LOCALE_STATIC_TEXT_MIGRATION_20260819.md`.
- [x] Provider dynamic template six-locale migration: routed 85 AR/EN templates with identical runtime expressions through a generated, validated 82-template resolver that preserves numbered placeholders; TypeScript, 26 contract tests and Expo web export passed. Evidence: `NABDAH_PROVIDER_TEMPLATE_LOCALE_MIGRATION_20260819.md`.
- [ ] Provider full screen localization: migrate all 2,810 unique provider UI text pairs and remaining non-text AR/EN direction branches to the six-language system, preserve Arabic-only RTL, add locale coverage tests per screen, and complete fluent human/UI accessibility review before release.
- [x] Provider ChatSystem truthfulness: removed fabricated message fallback and prevented unsent local messages or unavailable voice/video/attachment actions from appearing as completed user operations; the screen now fails closed with a clear error until an evidenced backend contract exists. TypeScript, 21 contract tests and web export passed; evidence: `NABDAH_PROVIDER_CHAT_TRUTHFULNESS_20260819.md`.
- [x] Provider PharmacyChatResponder truthfulness: replaced the unauthenticated Socket.IO connection, locally fabricated invoice/chat entries, Arabic-only UI and optimistic send with a fail-closed unavailable state; a participant-authenticated, persistent pharmacy-chat contract is required before reactivation. Evidence: `NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md`.
- [x] Provider shared operations truthfulness: contained `NotificationsCenter` local read-state mutation and `SupportCenter` hard-coded ticket data; neither now represents demo data or a local state change as a live operation without an evidenced backend contract. Evidence: `NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md`.
- [x] Provider DeviceManagement truthfulness: removed hard-coded linked-device identities and local 2FA/device-removal/logout-all success states; the surface is unavailable until secure device/session management contracts are evidenced end-to-end. Evidence: `NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md`.
- [ ] Provider shared-operation reactivation: design, implement and test real participant-authorized contracts for pharmacy chat, notification read state, support tickets, device/session management, attachments and calls before restoring those actions; do not replace fail-closed states with client-only UX.
- [x] Provider DoctorDashboard truthfulness: removed/contained the confirmed fixture appointments, referrals, patient/insurance fallbacks, locally generated credential records and public-profile media that could appear as clinical or operational data; preserved only backend responses or explicit unavailable states. TypeScript, 24 contract tests and web export passed; evidence: `NABDAH_PROVIDER_DOCTOR_TRUTHFULNESS_20260819.md`.
- [x] Provider clinical consultation and prescription truthfulness: contained the remaining local consultation chat/EHR fixtures, blocked prescription creation without verified appointment and patient identifiers, and removed local prescription templates/custom medicines/template-save success until each clinical contract is evidenced and persistent. Evidence: `NABDAH_PREPHASE13_DOCTOR_PRESCRIPTION_REMEDIATION_20260819.md`; reactivation remains separately governed by Phase 16 Sandbox proof.
- [x] Reviewer handover package: published a complete current-state summary of Phase 1–12 and post-Phase-12 source remediation, GitHub commits, archive integrity, verification gates, deployment candidates, and unresolved release blockers for reviewer approval before any server deployment. Evidence: `NABDAH_REVIEW_HANDOVER_CURRENT_STATE_20260819.md`; branch remains NO-GO pending reviewer/owner approval and operational proof.
- [x] Agent transition package: published an explicit unresolved-findings register and complete remaining-phase playbook, distinguishing fixed source findings from verified-but-unfixed, approval-blocked, and untested operational work before handing execution to another Agent. Evidence: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md`.
- [ ] Provider doctor-contract reactivation: verify and complete the backend contracts for schedule history, referral history, sick-leave issuance, professional documents and profile media (ownership, storage, audit, persistence and errors) before restoring these screens from their fail-closed states.
- [x] Provider agreement fail-closed: removed the hard-coded legal agreement and blocked electronic acceptance unless the versioned policy is loaded from the verified legal service; acceptance errors remain visible and never close the modal as success. TypeScript, 27 contract tests and Expo web export passed; evidence: `NABDAH_PROVIDER_AGREEMENT_FAIL_CLOSED_20260819.md`.
- [x] Provider LabDashboard truthfulness: replaced all `Nabdah Patient` and clinical/financial fallback values in queue, sample and result surfaces with explicit unknown or empty states; no sample or result now implies an identity, test, insurance, price, or time absent from the backend record. TypeScript, 24 contract tests and web export passed; evidence: `NABDAH_PROVIDER_LAB_TRUTHFULNESS_20260819.md`.
- [ ] Provider lab-contract reactivation: verify the provider inbox/sample/result contract end-to-end, including patient identity, test set, insurance/price visibility, sample state transitions, signed report access and BOLA protection before treating lab screens as operationally complete.
- [ ] Prepare a reviewer-ready Backend deployment candidate for the prescription-detail authorization patch, including rollback, post-deployment BOLA proof and explicitly deferred production actions.
- [ ] Prepare owner-facing prerequisite packages for Moyasar activation, SOS/QR/consent/location approval, real-device builds/test credentials and store-submission requirements without bypassing any external approval.
- [ ] Execute only reviewer-authorized post-deployment sandbox acceptance and real-device checks, then reissue the final GO/NO-GO decision with evidence.

## Pre-Phase 13 confirmed-source remediation — 2026-08-19

- [x] Resolve the independently confirmed Provider DoctorDashboard clinical truthfulness defects: contained local consultation chat and fixed EHR facts; removed `guest_patient`/default-diagnosis prescription fallbacks, unverified custom medicines, and local-only prescription template persistence/success; enforced a verified doctor–appointment–patient relationship and approved medicine catalogue in the Backend prescription contract; added negative/positive regressions, ran clean gates, and archived evidence in `NABDAH_PREPHASE13_DOCTOR_PRESCRIPTION_REMEDIATION_20260819.md`. Backend SHA-256 `8c0d63fb0a74d530580b5841cd6c29dde6df2a2a9c2610588c1f802db69f991e`; Provider SHA-256 `b5e5431de7fffcb9139d07faf41132cc94429a1c3a50a6b68dfb672684b2c1cc`.

## Phase 13 — contract inventory and confirmed follow-on work — 2026-08-19

- [x] Phase 13 static contract inventory: classified 238 unique API consumer contracts across Patient, Provider and Admin against 1,342 observed Backend routes; recorded source locations and initial `WIRED_CANDIDATE`/`STALE`/`MISSING`/`INCONCLUSIVE` status in `NABDAH_PHASE13_CONTRACT_CLASSIFICATION_20260819.md` and its raw inventory artifacts. This is not live E2E or an ownership acceptance.
- [x] Phase 14 Provider legal-agreement route remediation: aligned ContractModal with verified `GET /legal/policy/:key?lang` and `POST /legal/accept/:key` contracts, preserved fail-closed handling, and added regression coverage for load/accept/error without local success. Evidence: `NABDAH_PHASE14_PROVIDER_CONTRACT_REMEDIATION_20260819.md`.
- [x] Phase 14 Provider nursing route remediation: aligned NursingDashboard with owned `GET/POST /nursing/visits` contracts and contained SOAP note entry until its required `patient_id`/`booking_id` contract is explicitly mapped and tested for ownership and transition errors. Evidence: `NABDAH_PHASE14_PROVIDER_CONTRACT_REMEDIATION_20260819.md`.
- [x] Phase 14 Provider doctor-chat remediation: replaced stale `/chats/provider` and `/chats/:id/messages` with thread contracts and contained missing `/provider/chat/send`; no message may display as sent before participant-authorized server persistence. Evidence: `NABDAH_PHASE14_PROVIDER_CONTRACT_REMEDIATION_20260819.md`.
- [x] Phase 14 Pharmacy expiry surface: kept the expiry view fail-closed until an owned, audited inventory-expiry Backend contract is implemented and tested; no status is inferred from a schema alone. Evidence: `NABDAH_PHASE14_PROVIDER_CONTRACT_REMEDIATION_20260819.md`; Provider SHA-256 `a89fe6379ad2587a8eeff75c1e0a08368fefc3cbe6c935750996c2bc35188c40`.

## Phase 15 — reviewer candidate and governance package — 2026-08-19

- [x] Phase 15 reviewer deployment candidate: prepared the commit/archives SHA manifest, clean-gate evidence, dependency-audit summary, migration/index preflight, rollback/post-deploy smoke+BOLA plan, and owner/reviewer prerequisite requests in `NABDAH_PHASE15_REVIEWER_DEPLOYMENT_CANDIDATE_20260819.md`. No Sandbox or production deployment was requested or performed; current status remains NO-GO pending explicit reviewer authorization.
