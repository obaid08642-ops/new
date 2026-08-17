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
