# تقرير التسليم المفصل: ما بُني وأُصلح وما رُفع إلى GitHub

**التاريخ:** 2026-08-22
**المستودع:** [`obaid08642-ops/new`](https://github.com/obaid08642-ops/new)
**سياسة الدمج:** لا يوجد دمج إلى `main` ولا force-push. كل العمل موثق على فروع مستقلة قابلة للمراجعة.
**الحكم الحالي:** **NO-GO**؛ ما هو مثبت أدناه محلي ومدفوع إلى GitHub، ولا توجد دعوى نجاح Sandbox أو إنتاج.

> هذا التقرير يصف ما تم تنفيذه فعلياً في السورس المتتبع، مع تحديد مواقع الملفات والـcommits. لا يعني مرور build أو Jest أو boot test المعزول أن البيئة منشورة أو جاهزة للإنتاج.

## 1. الفروع والرؤوس المدفوعة

| النطاق | الفرع | رابط GitHub للمراجعة | الرأس المتحقق قبل إضافة هذا التقرير | حالة الدفع |
|---|---|---|---|---|
| Backend Contract Pack V1 | `backend/contract-pack-v1` | <https://github.com/obaid08642-ops/new/pull/new/backend/contract-pack-v1> | `7c259bfe0bf0c10d1d44a4355acb4e2e71be5825` | الرأس المحلي والبعيد متطابقان وقت إعداد التقرير. |
| Mobile P1 defensive fixes | `agent/mobile-p1-fixes-20260822` | <https://github.com/obaid08642-ops/new/pull/new/agent/mobile-p1-fixes-20260822> | `c1d7b01bcb93d774d6a6696d419b6ae308c993c5` | الرأس المحلي والبعيد متطابقان. |

## 2. ما بُني وأُصلح في Backend

### 2.1 تأسيس السورس والعقد المرجعي

تم استيراد السورس الكامل للـbackend في Git بدلاً من الاعتماد على ZIP فقط. العقد المرجعي موجود في:

| الملف في Git | الغرض |
|---|---|
| `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md` | العقد الملزم لرحلات المريض: DTOs، الملكية، idempotency، TTL، الحجوزات، checkout، chat، media وغيرها. |
| `audit-artifacts/nabd-patient-api-openapi.json` | ملف OpenAPI المتتبع، وقد حُدّث للواجهات المنفذة في الدفعات الجديدة. |
| `audit-artifacts/CONTRACT_PACK_V1_REMAINING_GAP_MATRIX_20260822.md` | مصفوفة فجوات باقية ذات أولوية، ولا تعتبر الحزمة مكتملة. |

### 2.2 الهوية، OTP، الجلسات، والتسجيل

| Commit | الملفات الرئيسية | ما تم تنفيذه |
|---|---|---|
| `a7d94b6` | `src/modules/auth/auth.service.ts`، `src/modules/auth/auth.controller.ts` | جسر OTP: `POST /auth/otp/request` و`POST /auth/otp/verify` و`POST /auth/session/exchange`؛ exchange وحيد الاستخدام/60 ثانية ويعيد controller `{authenticated:true}` فقط مع cookies. |
| `00ec850` | `src/modules/auth/auth.service.ts`، `src/modules/auth/patient-web-auth.contract.spec.ts` | مواءمة TTL للـrefresh session إلى 14 يوماً في JWT/Redis. |
| `e4ee7b3` | `src/modules/auth/auth.service.ts`، `src/modules/auth/auth.controller.ts`، `src/modules/auth/patient-web-auth.contract.spec.ts` | جسر تسجيل المريض داخل `/auth/register` بالـpayload العقدي، حفظ consents، وبدء OTP من دون token في body. |
| `5a06b34` و`f2ce163` | الملفات السابقة نفسها | حفظ `policy_id` ضمن consent واستخدام UUID خارجي `id` بدلاً من معرف Mongo داخلي للسجل. |

**ملفات الاختبار ذات الصلة:** `src/modules/auth/patient-web-auth.contract.spec.ts`.

**حد قائم:** تظل مسارات التسجيل الموروثة موجودة إلى جانب bridge؛ حقيقة قناة OTP عند fallback push ليست مثبتة كـSMS حي.

### 2.3 الملف الصحي، القياسات، والعائلة

| Commit | الملفات/الوحدات | ما تم بناؤه |
|---|---|---|
| `c599af4` | وحدات `src/modules/users/`، `src/modules/health/`، `src/modules/family/`، وملفات الاختبارات العقدية | جسور للملف الصحي والـvitals والتذكيرات والعائلة مع منطق ملكية وإخفاء مورد الغير وفق 404 حيث يطلب العقد ذلك. |
| `199e186` | `src/common/idempotency.interceptor.ts`، `src/app.module.ts`، `src/modules/cart/cart.module.ts` | تسجيل `IdempotencyInterceptor` عالمياً، وربط metadata للمسارات العقدية ذات mutations. |
| `bf807b0` | اختبارات contract/idempotency | اختبار رجعي يثبت رفض mutation المطلوبة عند غياب `Idempotency-Key` قبل handler. |

### 2.4 السلة وcheckout النقدي المحدود

| Commit | الملفات الرئيسية | ما تم تنفيذه |
|---|---|---|
| `ea094b7` | `src/modules/cart/cart.module.ts`، `src/modules/cart/cart.contract.spec.ts` | ربط عناصر السلة بمصدر catalog خادمي، وعدم قبول السعر من العميل كحقيقة تنفيذية. |
| `199e186` و`bf807b0` | `src/modules/cart/cart.module.ts`، `src/common/idempotency.interceptor.ts` | idempotency لمسارات `POST/PATCH/DELETE /cart/items`. |
| `be22b8e` | `src/modules/cart/cart.module.ts`، `src/modules/cart/cart.contract.spec.ts` | `POST /cart/checkout` محدود: cash فقط، العنوان والخطوط من السلة/الملف الخادميين، مسح السلة بعد نجاح إنشاء order فقط، ورفض payment غير cash أو prescription media غير المدعومة. |

**الحدود الصريحة للـcheckout:** لا يوجد card/payment intent، ولا mapping مثبت لـ409 stock أو422 coupon أو402 payment، ولا media ownership binding أو Sandbox payment. لذلك لا يسمى checkout V1 كاملاً.

### 2.5 الحجوزات، إعادة الجدولة، وcall-token

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `4c3b7ba` | `src/modules/slot-locks/`، وحدات booking واختباراتها | قفل slot مدته 10 دقائق في المصدر القائم. |
| `67152d5` | `src/modules/unified-bookings/unified-bookings.module.ts`، `src/modules/unified-bookings/unified-bookings.contract.spec.ts`، `src/modules/care/slot.service.ts`، `src/modules/care/appointments.service.ts` | جسر root محدود للحجز النقدي، `slot_id` canonical، ملكية 404، idempotency لمسارات mutation، وإصلاح ترتيب إعادة الجدولة لحماية الأصل عند فشل البديل. |
| `780b84f` | `src/modules/livekit/livekit.service.ts`، `src/modules/livekit/livekit.followup.spec.ts`، `src/modules/unified-bookings/unified-bookings.module.ts` | `GET /unified-bookings/{id}/call-token` محكوم بملكية المريض/الطبيب، نوع video، نافذة الموعد ±15 دقيقة، وTTL 10 دقائق؛ يفشل مغلقاً عند غياب إعداد LiveKit. |

**الحدود الصريحة للحجوزات:** لا يثبت الجسر ربط قفل 10 دقائق بدفع card أو payment intent؛ ولا توجد رحلة Sandbox لحجز/تعارض/replay أو اتصال LiveKit حي.

### 2.6 Chat وMedia الخاصة

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `8110130` | `src/modules/chat/chat.schemas.ts`، `chat.service.ts`، `chat.module.ts`، `chat.gateway.ts`، `chat.contract.spec.ts`، `chat.gateway.followup.spec.ts` | `media_ids` في الرسائل، تحقق المالك/المحادثة، 404 للغريب، read marker، dedupe مقيد بالمرسل والمحادثة، rt-token قصير مقيد بالغرفة، وidempotency لمسار الرسالة. |
| `8110130` | `src/modules/media/media.schema.ts`، `media.service.ts`، `media.controller.ts`، `media.module.ts`، `media.contract.spec.ts` | `MediaAsset` مملوك مع purpose وthread، تخزين خاص fail-closed، وURL موقّع 15 دقيقة للمصرح له بدلاً من رابط عام. |

**الحدود الصريحة:** لم يُختبر S3/R2 أو Socket.IO أو Redis حياً؛ تحذير S3 الغائب ظهر في الاختبارات، ولا يساوي readiness للتخزين الفعلي.

### 2.7 إعدادات المستخدم والجلسات

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `7de3ed1` | `src/modules/users/users.service.ts`، `users.controller.ts`، `users.contract.spec.ts` | allowlist خادمي لفئات notification settings، رفض مفاتيح أو قيم غير صحيحة، PATCH آمن، 404 لجلسة غير مملوكة، وidempotency لـPATCH settings وحذف الجلسة. |

### 2.8 الوصفات والرعاية المنزلية والمقالات

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `e81fc28` | `src/modules/prescriptions/prescriptions.module.ts`، `prescriptions.service.ts`، `prescriptions.authorization.spec.ts` | DTO قراءة وصفة محدود، يحجب `diagnosis` و`notes`، ويرطّب اسم/تخصص الطبيب من `ProviderProfile` حيث يتوفر، مع 404 لغير المشارك. |
| `24727d7` | `src/modules/home-care/home-care.controller.ts`، `home-care.module.ts`، `home-care.contract.spec.ts` | `GET /home-care/bookings/{id}` بDTO محدود للمالك فقط وإخفاء العنوان والملاحظات والبيانات السريرية الداخلية. |
| `1fac194` | `src/modules/articles/articles.module.ts`، `articles.contract.spec.ts` | `POST/DELETE /articles/{id}/bookmark` مع upsert مملوك، منع المقال غير المنشور، وidempotency. |

### 2.9 Idempotency لمسارات الطلبات

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `eca8a4c` | `src/modules/orders/orders.controller.ts`، `orders.idempotency.contract.spec.ts` | إلزام `Idempotency-Key` على `reorder` و`reorder-partial` و`cancel` وإثبات metadata محلياً. |

**حد صريح:** تنفيذ reorder الموروث لم يتحول بهذه الدفعة إلى عقد «إنشاء سلة جديدة»؛ تم توثيق ذلك بدلاً من الادعاء باكتماله.

### 2.10 الاكتشاف العام وكتالوج fragments

| Commit | الملفات الرئيسية | ما تم بناؤه |
|---|---|---|
| `0b8b17e` | `src/modules/care/care.service.ts`، `care.controller.ts`، `care.module.ts`، `tests/public-discovery.spec.ts` | إصلاح مطابقة specialty بالـslug، إضافة `published_provider_count`، و`GET /public/specialties` مع عدّ providers النشطين والمراجعين والمنشورين فقط. |
| `9016cd1` | `src/modules/medicines/medicines.service.ts`، `medicines.controller.ts`، `medicines.module.ts`، `medicines.public-catalog.contract.spec.ts` | `GET /public/catalog/{locale}/{category}.json` لـ`ar,en,ur,hi,bn,fil`، locale shaping من translations الخادمية، فحص category، وإرجاع DTO card محدود. |

مسار catalog لا يعرض سوى medicines التي تحقق: `is_deleted != true` و`public_eligibility: true` و`indexing_eligibility: true` و`medical_review_status: approved`.

**حد صريح:** لا يوجد توليد CDN/static assets أو cache invalidation end-to-end أو التحقق من اكتمال translations على بيانات حية.

## 3. ما أُصلح في تطبيق الموبايل React Native

السورس في المجلد المتتبع: `nabd_plus_patient_app/` على فرع `agent/mobile-p1-fixes-20260822`.

| Commit | الملفات الرئيسية | الإصلاح الفعلي |
|---|---|---|
| `099d37f` | `nabd_plus_patient_app/src/services/HttpClient.ts`، مسارات auth/navigation والاختبارات | منع guest/token المصطنع، رفض HTTP 200 غير JSON كـ`ApiContractError`، والاحتفاظ بكلمة المرور في transaction in-memory بدلاً من navigation. |
| `e04c04f` | `src/services/HttpClient.ts`، `src/services/SyncManager.ts` والاختبارات | منع replay/retry للmutations، وإيقاف mutation queue غير المتعاقد عليه. GET/HEAD فقط يمكن إعادة محاولتهما. |
| `8652d82` | `src/store/persistence/SecureStorageAdapter.ts` | Redux persistence encryption fail-closed؛ لا fallback key ولا RNG غير آمن. |
| `1e5e148` | `src/utils/` وطبقة API الموروثة | إغلاق fallbacks غير الآمنة لتخزين session/API. |
| `d43f932` | `src/utils/offlineQueue.ts` | تعطيل offline message queue ومسح legacy key بدلاً من حفظ رسائل بلا عقد أو idempotency. |
| `33404a4` | Welcome/root bootstrap ومسارات auth | منع `/auth/guest` ومسار guest الموروث. |
| `c1d7b01` | `nabd_plus_patient_app/audit-artifacts/verification/` | أدلة P1 الخام وخطة التحقق وبصماتها. |

**الحدود الصريحة للموبايل:** لا device E2E أو Sandbox، وoffline queues معطلة عمداً بانتظار عقد منشور. تشغيل اختبارات P1 منفردة نجح؛ Jest المجمع قد يخرج code 1 بسبب تحذير Expo متأخر `Cannot log after tests are done` رغم assertions الناجحة، وهو موثق ولا يوصف كبوابة خضراء مجمعة.

## 4. أدلة الاختبار ومكانها في Git

### Backend

جميع أدلة backend داخل: `audit-artifacts/verification/`.

| ملف دليل | النتيجة أو الغرض |
|---|---|
| `BACKEND_PUBLIC_CATALOG_FRAGMENT_FULL_TEST_20260822.txt` | آخر جناح Jest للكود: **86 suites / 472 tests passed**. SHA-256: `6e36e4017ac203f71a96fb1be50b3ce3e2b13257084abc6fa600c610b3d01270`. |
| `BACKEND_PUBLIC_CATALOG_FRAGMENT_BUILD_20260822.txt` | `npm run build` ناجح. SHA-256: `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388`. |
| `BACKEND_PUBLIC_CATALOG_FRAGMENT_BOOT_TEST_20260822.txt` | `npm run test:boot`: 1 suite/1 test؛ boot test معزول فقط. SHA-256: `bc2db208813e320bdb12b98b802697afcfa65e4d2022e7c399148a3ac52d8644`. |
| `BACKEND_REAL_NEST_BOOT_ATTEMPT_20260822.txt` | محاولة فعلية `node dist/main.js` فشلت exit 1 لغياب `JWT_SECRET`. SHA-256: `babbb77e94733f725113ec376e9585b8306b644462ac813e094f3d5aee78c253`. |
| `BACKEND_REAL_NEST_BOOT_ATTEMPT_20260822.md` | شرح صريح لسبب failure ولعدم تجاوز الحارس بإعداد مزيف. |
| `BACKEND_*_VERIFICATION_20260822.md` | سجلات دفعات auth/cart/bookings/call-token/chat-media/users/prescriptions/home-care/bookmarks/orders/public-specialties/public-catalog مع الأوامر والبصمات والحدود. |
| `CONTRACT_PACK_V1_DELIVERY_STATUS_UPDATE_20260822.md` | تقرير الحالة السابق والـNO-GO وشروط رفعه. |

### Mobile

جميع أدلة P1 داخل: `nabd_plus_patient_app/audit-artifacts/verification/`.

| ملف دليل | النتيجة أو الغرض |
|---|---|
| `MOBILE_P1_TARGETED_REGRESSION_GATE_20260822.txt` | 9 أوامر Jest معزولة و12 assertion ناجحة؛ SHA-256: `90cd51582d93971fb2a951606d1ecbf4c0716f4db1379c6ecea0d6339e295ab4`. |
| `MOBILE_P1_TYPECHECK_20260822.txt` | `tsc --noEmit` ناجح؛ SHA-256: `112d574c3d4f4eee73efeefa7c9e83c50e62108d821c907521d91fc857284fa9`. |
| `MOBILE_P1_EXECUTION_VERIFICATION_20260822.md` | ربط الإصلاحات بالاختبارات والبصمات والقيود. |

## 5. الإقلاع التشغيلي وسبب بقاء NO-GO

تم تنفيذ محاولة حقيقية ومحدودة زمنياً:

```text
timeout 25s node dist/main.js
```

بدأ Nest تهيئة التطبيق ثم توقف fail-closed عند:

```text
FATAL: JWT_SECRET must be configured
```

لذلك لا يوجد سطر `Nest application successfully started` ولا route count. كما ظهرت رسائل أن media storage وmail delivery غير مهيئين في هذه البيئة. لم يُضف أي secret إلى السورس أو Git لتجاوز ذلك.

| المطلوب للانتقال من NO-GO | ما يلزم تقديمه أو تنفيذه |
|---|---|
| إقلاع بيئة معتمدة | env آمن يحتوي `JWT_SECRET` وباقي الإعدادات، مع Mongo/Redis، ومزودات S3/mail/LiveKit عند تفعيلها؛ الأسرار في env فقط. |
| Sandbox | رابط OpenAPI حي وحسابات مصرح بها، ثم اختبار success/failure/owner/unauth/replay لكل mutation. |
| Checkout وحجز card | payment provider معتمد وpayment intent، mapping 409/422/402، وربط قفل slot بعملية الدفع. |
| Chat/media حي | Redis وSocket.IO وS3/R2 وupload scanning وروابط موقعة في Sandbox. |
| Mobile GO | مواءمة mobile OTP/register مع العقد الحي، device E2E، وSandbox checks. |
| Production | خطة release ومراقبة وsecrets وموافقة تشغيل بعد تحقق Sandbox؛ غير منفذ الآن. |

## 6. خريطة المسارات السريعة داخل المستودع

| المجال | المسار في Git |
|---|---|
| عقد المريض | `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md` |
| OpenAPI المتتبع | `audit-artifacts/nabd-patient-api-openapi.json` |
| مصفوفة الفجوات | `audit-artifacts/CONTRACT_PACK_V1_REMAINING_GAP_MATRIX_20260822.md` |
| backend auth | `src/modules/auth/` |
| السلة وcheckout | `src/modules/cart/` و`src/modules/orders/` |
| idempotency | `src/common/idempotency.interceptor.ts` و`src/app.module.ts` |
| الحجوزات | `src/modules/unified-bookings/` و`src/modules/care/` و`src/modules/slot-locks/` |
| LiveKit | `src/modules/livekit/` |
| chat | `src/modules/chat/` |
| media | `src/modules/media/` |
| إعدادات المستخدم | `src/modules/users/` |
| الوصفات | `src/modules/prescriptions/` |
| home-care | `src/modules/home-care/` |
| bookmarks | `src/modules/articles/` |
| medicines/public catalog | `src/modules/medicines/` |
| public specialties | `src/modules/care/` |
| أدلة backend | `audit-artifacts/verification/` |
| سورس الموبايل | `nabd_plus_patient_app/` على فرع mobile المستقل |
| أدلة الموبايل | `nabd_plus_patient_app/audit-artifacts/verification/` |

## 7. خلاصة صريحة للمراجع

يمكن مراجعة كل ما سبق عبر GitHub باستخدام الفرعين والـSHA المذكورة وملفات الأدلة المتتبعة. نطاق التنفيذ يشمل إصلاحات أمنية دفاعية للموبايل وجسور عقدية متدرجة للـbackend، مع اختبارات محلية مدفوعة وOpenAPI محدّث للمسارات المنفذة. لكنه **ليس إعلان نشر أو صلاحية إنتاج**: لا توجد أدلة Sandbox أو إنتاج، ومحاولة الإقلاع الفعلية محجوبة بصورة صحيحة بغياب أسرار وإعدادات البيئة المعتمدة.
