# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `todo.md`
- **Member SHA-256:** `4872dc609678db5e2083f9f1088be8fec09a78585cde90f1f942e0b50a60c72d`
- **Line count:** 1104
- **Read range:** `1-1104`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: - [x] Phase 3: معالجة checkout وQR والبيانات التركيبية ومسار الطوارئ.`
- `29: لا يُختبر أو يُعدّل الإنتاج. لا تُنشأ بيانات أو أسرار اختبار داخل Git أو التقرير. لا تُفعّل واجهة أو عقداً حساساً بمجرد نجاح البناء؛ يلزم مصدر حي، backend، route، schema، مستهلك واجهة، ثم اختبار staging موثق.`
- `38: [1]: ../audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"`
- `44: [1]: audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"`
- `54: - [x] إزالة `lastLogin: 'اليوم'` و`NBD-*`/`NBD-F000` المصطنعة من عرض الموظفين؛ يعرض consumer حقول backend أو عبارة إدارة الخادم.`
- `60: - [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.`
- `70: - [ ] إعادة نشر backend المصحح إلى staging قبل إعادة التحقق؛ `labs/provider/inbox` و`labs/samples` أعادا 403 رغم نجاح provider login، ما يرجح أن الإصلاح غير منشور أو أن عقد JWT في staging مختلف.`
- `71: - [ ] معالجة/تفسير `GET /hospital/staff` على staging؛ provider login نجح لكن endpoint أعاد 500، ويجب جمع stack trace من staging بعد نشر UUID fix.`
- `72: - [ ] استخدام العقد الفعلي لمسار nursing: `/nursing/visits?provider_id=...`؛ محاولة المسار غير الموجود `/home-care/provider/bookings` أعادت 404 ولا تُعد فشل صلاحية.`
- `73: - [ ] تنفيذ BOLA mutation حقيقي على staging بعد توفير/تحديد order قابل للإلغاء، مع actor المريض وactor غير المالك، وتوثيق عدم حدوث refund أو transition للرافض.`
- `80: - [ ] إعادة تدقيق تطبيق المريض وتطبيق المزود ولوحة الإدارة للبيانات الوهمية والـplaceholders والـroutes والأزرار والترجمة الستية.`
- `90: - [x] إصلاح حدود RefundService عند 24/4 ساعة لتثبيت العقد الزمني.`
### backend_consumers_or_contracts
- `5: - [x] Phase 2: تقوية الإعدادات والشبكة، CORS، JWT، WebSocket، وعملاء API.`
- `14: - [ ] فحص العقود الحساسة المتبقية: consent/QR verifier، موقع الطوارئ، أكواد أخطاء API، وعقد WebSocket/LiveKit.`
- `23: - [ ] تنفيذ E2E للأدوار والملكية وOTP/2FA وWebSocket وQR/consent والحجز والصيدلية وOCR والدفع والويبهوك.`
- `60: - [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.`
- `72: - [ ] استخدام العقد الفعلي لمسار nursing: `/nursing/visits?provider_id=...`؛ محاولة المسار غير الموجود `/home-care/provider/bookings` أعادت 404 ولا تُعد فشل صلاحية.`
- `79: - [ ] استكمال الإصلاحات المصدرية المفتوحة في consent/QR/location/error-codes/WebSocket/LiveKit والتخزين والدفع وFastAPI بعد فحص العقود الفعلية.`
- `82: - [ ] استكمال staging/E2E لجميع الأدوار والملكية وOTP/2FA والحجز والصيدلية وOCR والدفع والويبهوك وWebSocket وQR/consent.`
- `97: - [ ] Provider: إصلاح cast غير الآمن للـreadonly insurance catalog في `src/api/catalogs.ts` دون تغيير بيانات شركات التأمين أو إنشاء بيانات وهمية.`
- `188: - [x] فحص وإصلاح `join_thread` للتحقق من عضوية المستخدم قبل `socket.join` ومنع تسريب typing/new_message.`
- `214: - [ ] إعداد وتشغيل E2E staging للدفع وwebhook وidempotency في refunds/wallet/billing/pharmacy.`
- `215: - [ ] إعداد وتشغيل E2E staging لـWebSocket origin وtoken impersonation وroom membership — source patch أُنجز، إعادة التحقق الحي بعد redeploy مطلوبة.`
- `220: ## WebSocket staging finding — 2026-08-17`
### auth_ownership
- `23: - [ ] تنفيذ E2E للأدوار والملكية وOTP/2FA وWebSocket وQR/consent والحجز والصيدلية وOCR والدفع والويبهوك.`
- `48: - [x] إصلاح عدم تطابق شاشة FacilityDashboard مع عقد `HospitalStaffModule`: استبدال `/provider/features/staff` بـ`/hospital/staff`، وتمرير `staff_role`، واستخدام `id` العائد من backend بدلاً من `NBD-` المحلي؛ بوابة المزوّد 3/3 وتصدير iOS ناج`
- `54: - [x] إزالة `lastLogin: 'اليوم'` و`NBD-*`/`NBD-F000` المصطنعة من عرض الموظفين؛ يعرض consumer حقول backend أو عبارة إدارة الخادم.`
- `70: - [ ] إعادة نشر backend المصحح إلى staging قبل إعادة التحقق؛ `labs/provider/inbox` و`labs/samples` أعادا 403 رغم نجاح provider login، ما يرجح أن الإصلاح غير منشور أو أن عقد JWT في staging مختلف.`
- `71: - [ ] معالجة/تفسير `GET /hospital/staff` على staging؛ provider login نجح لكن endpoint أعاد 500، ويجب جمع stack trace من staging بعد نشر UUID fix.`
- `82: - [ ] استكمال staging/E2E لجميع الأدوار والملكية وOTP/2FA والحجز والصيدلية وOCR والدفع والويبهوك وWebSocket وQR/consent.`
- `89: - [x] إضافة provider ownership وrole checks إلى simulated provider features، ومنع `FILE-${Date.now()}` وpublish بلا report.`
- `106: - [x] Admin: production Next build ناجح بعد تنظيف `.next`، مع توليد 34 صفحة.`
- `111: - [ ] تدقيق وتوحيد automatic system light/dark mode مع إمكانية التغيير اليدوي في patient/provider/admin، والتحقق من كل شاشة ومقاس واتجاه.`
- `113: - [ ] تنفيذ التحقق المتخصص للاتصالات: chat، voice، video، signaling، persistence، ownership، reconnect، push، deep links، والقنوات الصوتية.`
- `124: - [ ] LiveKit: فرض ownership/participant authorization على join/end/reject/metrics/getSession، ومنع رفض أو قراءة جلسة مستخدم آخر.`
- `125: - [ ] LiveKit: تقييد admin rooms/analytics/participants/mute/remove بـadmin role والتحقق من room ownership أو صلاحية الإدارة.`
### state_transitions
- `60: - [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.`
- `66: - [ ] تدوير اعتماد R2 وإعادة بناء صورة FastAPI وإغلاق عقود consent/QR/location/error-codes قبل حكم الإنتاج.`
- `73: - [ ] تنفيذ BOLA mutation حقيقي على staging بعد توفير/تحديد order قابل للإلغاء، مع actor المريض وactor غير المالك، وتوثيق عدم حدوث refund أو transition للرافض.`
- `79: - [ ] استكمال الإصلاحات المصدرية المفتوحة في consent/QR/location/error-codes/WebSocket/LiveKit والتخزين والدفع وFastAPI بعد فحص العقود الفعلية.`
- `90: - [x] إصلاح حدود RefundService عند 24/4 ساعة لتثبيت العقد الزمني.`
- `114: - [ ] بناء Communications Implementation Matrix من frontend إلى backend إلى realtime/database/storage ثم العودة إلى state UI.`
- `132: - [ ] تحسين structured data للدواء بإضافة وصف/صورة وoffers فقط عند وجود سعر حقيقي، وavailability مبنية على availability_status لا على قيمة مخترعة.`
- `137: ## Product track completed source fixes — 2026-08-17`
- `168: - [x] فحص مركز كامل لمسارات chat/realtime بين patient/provider، الملكية، persistence، read state، reconnect، والمرفقات إن كانت مدعومة.`
- `170: - [x] فحص push notifications للمريض والمزوّد والإدارة، device tokens، targeting، deep links، lifecycle، retry، channels، ومنع التكرار.`
- `189: - [x] فحص وإصلاح `markNoShow` ليستخدم appointment business `id` UUID بدلاً من `_id`.`
- `192: - [ ] تدقيق عقود consent وQR verifier وسياسة موقع الطوارئ وerror-code registry، وتوثيق ما يمكن بناؤه وما يحتاج اعتماداً قبل التفعيل.`
### payment_insurance_relevance
- `22: - [ ] نشر فرع المصالحة في staging منفصلة مع Mongo وRedis وJWT وOrigins وstorage/payment test sinks.`
- `73: - [ ] تنفيذ BOLA mutation حقيقي على staging بعد توفير/تحديد order قابل للإلغاء، مع actor المريض وactor غير المالك، وتوثيق عدم حدوث refund أو transition للرافض.`
- `90: - [x] إصلاح حدود RefundService عند 24/4 ساعة لتثبيت العقد الزمني.`
- `97: - [ ] Provider: إصلاح cast غير الآمن للـreadonly insurance catalog في `src/api/catalogs.ts` دون تغيير بيانات شركات التأمين أو إنشاء بيانات وهمية.`
- `103: - [x] Provider: تصحيح readonly insurance catalog cast.`
- `132: - [ ] تحسين structured data للدواء بإضافة وصف/صورة وoffers فقط عند وجود سعر حقيقي، وavailability مبنية على availability_status لا على قيمة مخترعة.`
- `153: - [ ] Admin Next build: إزالة/تصحيح import `Html/Head/Body/Main/NextScript` خارج pages/_document، وتحديد المستهلك غير المباشر في `/admin/ai-control` و`/admin/payouts`.`
- `209: - [x] إعداد وثيقة مراجعة مستقلة لعقد QR verifier: payload، signature، expiry، nonce/replay، binding، وfail-closed behavior.`
- `211: - [x] إعداد وثيقة مراجعة مستقلة لسجل error-code registry: taxonomy، stable codes، localization، HTTP mapping، وcorrelation.`
- `214: - [ ] إعداد وتشغيل E2E staging للدفع وwebhook وidempotency في refunds/wallet/billing/pharmacy.`
- `231: - [ ] تشخيص 500 في payment intent عبر logs المعتمدة، وإصلاح السبب فقط إذا كان المصدر/الإعداد sandbox آمناً، ثم اختبار payment/webhook signature/idempotency/refund sandbox.`
- `240: - [ ] بعد نشر `dac6f3c` فقط: إعادة اختبار BOLA/payment/WebSocket/OTP على production sandbox؛ لم تُنفذ mutations المالية في الجولة الحالية.`
### error_empty_loading_retry_cancel
- `60: - [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.`
- `66: - [ ] تدوير اعتماد R2 وإعادة بناء صورة FastAPI وإغلاق عقود consent/QR/location/error-codes قبل حكم الإنتاج.`
- `79: - [ ] استكمال الإصلاحات المصدرية المفتوحة في consent/QR/location/error-codes/WebSocket/LiveKit والتخزين والدفع وFastAPI بعد فحص العقود الفعلية.`
- `170: - [x] فحص push notifications للمريض والمزوّد والإدارة، device tokens، targeting، deep links، lifecycle، retry، channels، ومنع التكرار.`
- `192: - [ ] تدقيق عقود consent وQR verifier وسياسة موقع الطوارئ وerror-code registry، وتوثيق ما يمكن بناؤه وما يحتاج اعتماداً قبل التفعيل.`
- `200: - [x] تغيير رفض `join_thread` إلى ACK صريح `{ error: 'not_participant' }` دون إسقاط الاستثناء للعميل.`
- `211: - [x] إعداد وثيقة مراجعة مستقلة لسجل error-code registry: taxonomy، stable codes، localization، HTTP mapping، وcorrelation.`
- `230: - [ ] إنشاء order sandbox من patient.sandbox وتسجيل الحالة والـledger قبل/بعد، ثم اختبار cancel/track/update من patient2.sandbox مع توقع 403/404.`
- `243: ## Production origin-direct retry — 2026-08-17`
- `252: - [x] إصلاح مسار `POST /orders/:id/cancel` ليشترط ملكية المريض أو pharmacy assignment أو admin، وألا يعتمد على role وحده.`
- `254: - [x] إضافة اختبار BOLA بين patient1/patient2 يغطي read/track/cancel/update ويثبت state وpayment/ledger before-after.`
- `255: - [x] توثيق order sandbox `91047ef2-ad36-422a-a184-629693e7c729`: قبل `ESCALATED_TO_ADMIN/pending`، وبعد إلغاء patient2 أصبح `CANCELLED/pending`؛ لا تُنفذ mutations مالية قبل إصلاح P0.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
