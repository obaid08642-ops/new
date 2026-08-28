# مرجع منصة نبض الصحية — Project Reference

**الإصدار:** 2026-08-17

**المؤلف:** Manus AI

**الفرع المرجعي:** `manus/on-live-reconciliation`

**آخر رأس موثق في GitHub عند إعداد هذا المرجع:** `9fb6feba9197402e1a533badcd204f2b0b820c5f`

> هذا الملف هو مرجع هندسي وتشغيلي للمشروع، وليس بديلاً عن source code أو عقود API الرسمية أو مراجعة الأمن والخصوصية والقانون. يشرح ما تم العثور عليه في المصدر والأرشيفات والتقارير، ويفصل دائماً بين **وجود الكود** و**نجاح الاختبار المحلي** و**الإثبات الحي** و**الاعتماد التشغيلي**.

## 1. كيف يُستخدم هذا المرجع

يقرأ المبرمج أو المهندس هذا الملف قبل لمس الكود حتى يفهم بنية النظام، حدود كل تطبيق، نماذج الصلاحيات، مسارات البيانات، أماكن الشاشات، الوحدات الخلفية، الاختبارات، والمخاطر المفتوحة. عند الحاجة إلى تغيير ميزة، يبدأ من جدول المكوّن والملف، ثم يتتبع العقد الخلفي، ثم الواجهة، ثم الاختبار، ثم التقرير. لا يجوز اعتبار شاشة موجودة دليلاً على أن مسارها موصول بالكامل؛ يجب الرجوع إلى حالة التحقق الموضحة في نهاية كل قسم.

مصادر الحقيقة المستخدمة في إعداد المرجع هي: المصدر المفكوك للتطبيقات، أرشيفات GitHub الأربعة، تقارير التدقيق الموجودة في `audit-artifacts/`، نتائج build/test وE2E الموثقة، وسجل `todo.md`. الأرشيفات قد تكون تمثيلاً مجمعاً للمشروع وليست مستودعات مستقلة؛ لذلك يجب مطابقة أي تعديل جديد مع المصدر الذي سيُبنى ويُنشر فعلياً.

## 2. ملخص المنتج ونطاقه

نبض منصة صحة رقمية متعددة الأطراف تربط المريض بمقدمي الخدمات الصحية، وتشمل الاستشارات، الحجز، الدواء والصيدلية، المختبرات، الأشعة، التمريض والرعاية المنزلية، المستشفيات والمنشآت، الطوارئ، المحفظة والدفع، الإشعارات، الدردشة والمكالمات، المحتوى الصحي، الذكاء الاصطناعي، الأسرة، التأمين، البرامج الصحية، والولاء.

المشروع يتكون من أربعة مكونات تسليم رئيسية:

| المكوّن | الغرض | التقنية/الهيكل المرجعي | ملاحظة الحالة |
|---|---|---|---|
| Backend + Database | المصادقة، الصلاحيات، العقود، الأعمال، التخزين، الإشعارات، الدفع، الدردشة، LiveKit، والعمليات | NestJS/TypeScript، MongoDB، Redis/BullMQ، WebSocket/LiveKit، FastAPI مكمّل | build وtests محلية ناجحة في آخر جولات، مع بنود E2E تشغيلية متبقية |
| Patient App | تجربة المريض على الهاتف والويب حيث تدعمها Expo | React Native/Expo Router | تشمل عددًا كبيرًا من مسارات الصحة والحجز والدفع والاتصال |
| Provider App | تجربة الطبيب والصيدلية والمختبر والأشعة والتمريض والمستشفى | React Native/Expo | سلوك الواجهة يتغير حسب provider type وpermissions |
| Admin Dashboard | الإدارة، الرقابة، الكتالوج، المال، الأمن، المزودون، الدعم والتحليلات | Next.js Pages Router | production build تحقق سابقاً من 34 صفحة، وتبقى جولة RTL/تعدد لغوي مستقلة |

## 3. المعمارية العامة

المريض أو المزود أو المدير يتصل بالواجهة المناسبة، والواجهة تستخدم API contracts وauthentication/session state للوصول إلى backend. الخلفية تتحقق من JWT، الدور، نوع المزود، الملكية، حالة المورد، والقيود التشغيلية قبل القراءة أو التعديل. MongoDB تحفظ موارد الأعمال، Redis تستخدم للجلسات المؤقتة وOTP والـqueues والـrate limiting، وBullMQ لمعالجة الأعمال المؤجلة، بينما LiveKit وRealtime Gateway يغطيان المكالمات والإشارات والأحداث الحية. Push service يربط device tokens بالأحداث، وتستخدم تطبيقات الهاتف deep links للوصول إلى chat أو call أو order.

مسار العمل المعياري هو:

```text
Client screen
  -> auth/session + typed request
  -> controller/gateway
  -> guard: JWT + roles + provider_type + ownership
  -> service/policy
  -> Mongo/Redis/external provider
  -> normalized response/event/push
  -> client state, navigation, notification, or audit record
```

في أي تعديل جديد يجب أن يبقى هذا التسلسل واضحاً. لا يجوز أن تنشئ الواجهة نجاحاً محلياً أو order/payment/call وهمياً إذا لم يعطِ backend معرفاً وحالة حقيقية.

## 4. الهوية والأدوار والصلاحيات

الأدوار الرئيسية هي patient، provider، admin، مع provider types تشمل doctor، pharmacy، laboratory، radiology، nursing/home care، hospital، وغيرها. إصلاح FIX2 وحّد الأدوار الفعالة بحيث ينظر الحارس إلى `role` و`provider_type` وaliases مثل `laboratory/lab` بدلاً من الاعتماد على `role='provider'` وحده. هذا مهم لأن حساب المزود قد يحمل `role=provider` بينما يحدد `provider_type` صلاحياته العملية.

قاعدة الصلاحية ليست الدور فقط. يجب أيضاً فحص ملكية المورد، عضوية thread، ارتباط provider بالمريض أو الموعد، تعيين الصيدلية، حالة الطلب، وحالة العملية. لذلك فإن `admin` ليس بديلاً عن تدقيق ownership في كل mutation، وpatient2 لا يجوز له قراءة أو تعديل order patient1 حتى لو كان كلاهما patient.

مسارات المصادقة تشمل تسجيل دخول المريض، تسجيل دخول المزود من `/provider/auth/login`، وتسجيل دخول الإدارة مع 2FA/OTP عندما يتطلب الحساب ذلك. يجب عدم وضع JWT أو OTP في logs أو التقارير. حدود rate limiting جزء من العقد التشغيلي وليست مجرد واجهة.

## 5. Backend وقاعدة البيانات

### 5.1 الوحدات الخلفية الرئيسية

الوحدات المكتشفة تشمل المصادقة والمستخدمين، الحسابات والملفات، provider profiles، appointments/bookings، orders/pharmacy، payments/wallet/billing، labs، radiology، nursing/home care، hospital/facility، chat، realtime، livekit، push/notifications، emergency/SOS، support، insurance، family، articles/content، medicines/catalog، analytics/ops، security/audit، config، and compatibility modules.

كل وحدة تتكون عادة من module/controller/service/schema/model/spec. الـcontroller يعرّف routes، الـguard يطبق authentication/roles، الـservice يطبق business policy، وMongo schemas/models تمثل البيانات. يجب استخدام هذه الطبقات بدلاً من وضع authorization في الواجهة أو إضافة استعلام مباشر متكرر في controller.

### 5.2 موارد البيانات الأساسية

الموارد الرئيسية التي يجب أن يفهمها المطور هي user/account، provider profile، appointment، order، payment/ledger/wallet record، chat thread/message، call session، push token/log، notification، facility/hospital staff، lab/radiology sample أو request، home-care request، insurance claim، family group، audit record، وconfiguration. بعض المعرفات business UUID (`id`) وبعضها Mongo `_id/ObjectId`. الخلط بينهما سبب سابقاً مشكلة `markNoShow`؛ القاعدة هي استعمال business `id` عندما يعيد العقد UUID، وعدم تحويل UUID إلى ObjectId.

قاعدة البيانات ليست مجرد مخزن للواجهة. الانتقال بين الحالات يجب أن يحفظ history/ledger عندما يكون ذلك جزءاً من العقد، ويجب أن تكون mutations idempotent حيث يمكن تكرار webhook أو طلب العميل.

### 5.3 الدردشة والاتصالات

ChatService يدير thread membership، الرسائل، read/delivered state، reactions، pin/edit/delete، المرفقات، والإشعارات. ChatGateway يتعامل مع Socket.IO events. بعد إصلاح P0، يوجد `chat.service.ts` مستقل لتجنب circular dependency، و`join_thread` يفحص membership قبل `socket.join` ويرجع ACK صريحاً `{error:'not_participant'}` عند الرفض.

Realtime Gateway ينقل typing وmessage/call signaling، لكن النقل لا يساوي authorization: يجب أن تكون العضوية والجلسة الحقيقية معروفة قبل relay. LiveKitService يشتق أطراف المكالمة من appointment/call session، ويفرض ownership في initiate/join/end/reject/metrics/no-show. Push payloads الموحدة تشمل chat message وincoming call وsession id وcaller name وcall type.

### 5.4 الطلبات والملكية

order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersController` يطبقان owner/pharmacy/admin authorization، وأضيفت اختبارات foreign-patient.

أثبت اختبار الإنتاج السابق وجود BOLA في النسخة القديمة: patient2 قرأ order patient1 بنتيجة 200 وألغاه بنتيجة 201. هذا order sandbox موثق بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`، قبل الاختبار `ESCALATED_TO_ADMIN/pending` وبعده `CANCELLED/pending`، دون payment transaction. الإصلاح موجود في GitHub لكنه يحتاج deployment وإعادة تحقق حي قبل إعلان الإغلاق.

### 5.5 الدفع والدفاتر

توجد مسارات payment intent وwebhook وwallet/billing وpharmacy mutations وrefund. الاختبار المالي يجب أن يستخدم sandbox gateway، يتحقق من signature، يمنع replay/idempotency duplication، ويثبت ledger before/after. في آخر محاولة production origin-direct أعاد payment intent `500` قبل إغلاق BOLA، ولذلك أُوقفت بقية الـmutations المالية ولم يُعلن نجاح payment أو refund.

### 5.6 العقود الحساسة غير المفعلة

أُنشئت وثائق مستقلة وعقد backend توثيقي fail-closed للعناصر التالية:

| العقد | ما يصفه | الحالة |
|---|---|---|
| consent | grant/revoke/scope، الإصدار، الانتهاء، actor، audit trail، أقل صلاحية | مسودة مراجعة وغير مفعلة |
| QR verifier | signature، key id، expiry، nonce/jti، replay، resource binding، owner | fail-closed وغير مفعّل |
| emergency location | أقل بيانات، precision، consent، retention، access log، رفض الإذن | مسودة مراجعة وغير مفعلة |
| error-code registry | stable codes، HTTP mapping، localization، correlation، عدم تسريب stack/PII | مسودة مراجعة وغير مفعلة |

لا توجد واجهة أو endpoint يجب أن تمنح صلاحية اعتماداً على هذه المسودات قبل اعتماد Gatekeeper والمراجعة القانونية/المنتجية.

## 6. تطبيق المريض

تطبيق المريض مبني حول Expo Router، وفيه layouts ومجموعات مسارات متعددة. الشاشة ليست فقط ملفاً؛ يجب فهم ما تقرأه وما تكتبه، والحساب المستخدم، وحالة loading/empty/error، وربطها بالـdeep links والإشعارات.

### 6.1 البوابات الأساسية

تشمل onboarding، auth/login/OTP، tabs الرئيسية، profile، settings، notifications، support، search، articles، offers، community، reviews، wallet، payments، loyalty، family، health records، reports، وservices. التهيئة تدعم كشف اللغة والثيم من الجهاز مع تغيير يدوي لاحقاً، لكن مراجعة كل اللغات والـRTL على الأجهزة الحقيقية ما زالت جزءاً من القبول النهائي.

### 6.2 الاستشارات والحجز

مجموعة consultations تشمل دليل الطبيب، تفاصيل الطبيب، اختيار نوع الاستشارة، فتحات المواعيد، clinic location، video call، chat-with-doctor، incoming call، وسجل/تفاصيل الاستشارة. المسار الصحيح هو اختيار provider حقيقي، جلب slots من backend، إنشاء appointment، إظهار tracking/state حقيقي، ثم فتح chat أو LiveKit session إذا أعاد backend عقداً صالحاً. لا يجوز أن يكون timer المحلي أو اسم افتراضي دليلاً على أن المكالمة أو الحجز موجود فعلياً.

### 6.3 الصيدلية والدواء

مجموعة pharmacy وorders وdelivery وreturns وpayments تغطي البحث عن الدواء، السلة، checkout، اختيار delivery أو pickup، الموقع عند الحاجة، إنشاء الطلب، عروض الصيدليات/bids، التتبع، الدفع، والاسترجاع. القاعدة المهمة هي عدم إنشاء order قبل اكتمال الحقول المطلوبة، وعدم اعتبار قبول الواجهة أو إظهار رقم محلي نجاحاً حتى يعيد backend order id وحالة وledger.

### 6.4 المختبرات والأشعة والتشخيص

مجموعات diagnostics وhealth تتعامل مع طلبات المختبر والأشعة، اختيار الخدمة والمنشأة أو المزود، رفع/قراءة النتائج، الحالات والمواعيد، وربط التقارير بحساب المريض. صلاحيات provider في backend يجب أن تطابق provider_type normalized، ولا يكفي إخفاء زر الواجهة.

### 6.5 الرعاية المنزلية والطوارئ

مجموعات nursing وemergency وmap وshared/location-picker تغطي طلب الرعاية المنزلية، متابعة الموقع، SOS، موقع الحالة، ومشاركة الموقع. سياسة emergency location الحالية لا تعتبر مفعلة؛ يلزم اعتماد الحد الأدنى للبيانات، الإذن، الدقة، مدة الاحتفاظ، ومن يرى البيانات.

### 6.6 الصحة والبرامج المساندة

توجد مسارات maternity للحمل، nutrition للتغذية، mental-health، ai وai-assistant، drug-scanner، wearables، programs، health، reports، family، community، articles، loyalty، وoffers. هذه الميزات يجب تقسيمها إلى: مصدر backend حقيقي، مصدر محلي للعرض فقط، أو مسار يحتاج عقداً/تكاملاً قبل إعلان الجاهزية. لا ينبغي اعتبار وجود صفحة AI أو scanner دليلاً على تشخيص طبي أو تكامل سريري معتمد.

### 6.7 الخرائط وقاعدة البيانات المحلية

تمت إضافة `MapPrimitives.native.tsx` و`MapPrimitives.web.tsx` حتى لا يستورد Expo web مكونات native-only، مع إبقاء `react-native-maps` الحقيقي على iOS/Android. كما تم فصل `DatabaseProvider.native.ts` عن `DatabaseProvider.web.ts` لمنع `expo-sqlite/wa-sqlite.wasm` في web export. هذا إصلاح build وليس بديلاً عن اختبار GPS والأذونات وسلوك الخرائط على أجهزة فعلية.

## 7. تطبيق مزود الخدمة

تطبيق المزود تطبيق واحد متعدد الأنواع؛ provider type يغير القوائم والمسارات والعمليات. الأنواع المكتشفة تشمل doctor، pharmacy، laboratory، radiology، nursing/home care، hospital، مع مراعاة أن كل نوع لا يرى إلا capabilities الخاصة به.

### 7.1 المسارات العامة

تشمل auth/provider login، onboarding/profile، dashboard، availability/working hours، bookings/appointments، notifications، chat، calls، earnings/wallet/payout، settings/security، support، وprofile verification. يجب أن تأتي الحالات والأرقام من backend، لا من arrays ثابتة أو local success.

### 7.2 الطبيب

مسارات الطبيب تتعامل مع الجدول والفتحات، قبول أو رفض المواعيد، تفاصيل المريض المسموحة، clinic/online/video consultation، chat، incoming call، LiveKit، الوصفات أو المخرجات السريرية حيث يدعمها العقد، وسجل العمل. كل مسار حساس يحتاج appointment ownership وaudit مناسب.

### 7.3 الصيدلية

الصيدلية تدير الطلبات، bids/accept، تجهيز الدواء، حالات delivery، التواصل مع المريض، الدفع/التسوية، وسجل العمليات. pharmacy assignment جزء من ownership في order policy لكنه لا يمنح الصيدلية وصولاً إلى كل order.

### 7.4 المختبر والأشعة

المختبر يتعامل مع samples/inbox والطلبات والنتائج، والأشعة مع provider inbox والطلبات والتقارير. إصلاح FIX2 جعل `provider_type=laboratory` وaliases صالحة للحارس، وجعل radiology paths تستفيد من effective roles بدلاً من مقارنة `role=provider` فقط. تم تأكيد هذه النقطة حياً سابقاً، لكن كل deployment جديد يحتاج إعادة تحقق.

### 7.5 التمريض والمستشفى

التمريض يتعامل مع home-care assignments والزيارات والتتبع، والمستشفى مع staff/facility والطلبات والأطباء. UUID/ObjectId يجب أن يبقى متسقاً في staff والappointments؛ أي تحويل غير صحيح قد يعيد 500 أو يخفي بيانات.

### 7.6 الإشعارات والمكالمات

Provider PushNotifications يسجل device token، يعالج foreground/background/terminated، ويحوّل deep links إلى chat/call/order. الصوت والقنوات وCallKeep تحتاج اختبار packaging فعلي على iOS/Android؛ وجود config أو asset لا يثبت أن الصوت يعمل في كل حالة.

## 8. لوحة الإدارة

لوحة الإدارة Next.js Pages Router وتحتوي صفحات عامة ومحمية تحت `src/pages/admin/`. الصفحات المكتشفة هي:

| المجال | الصفحات |
|---|---|
| الإدارة العامة | dashboard، analytics، health-dashboard، config-portal، audit-logs، security، RBAC |
| المستخدمون والمزودون | users-management، provider-moderation، provider-audits، nursing-portal |
| التجارة والكتالوج | catalog-manager، medicines-catalog، pharmacy-procurement، shortage-reports، commissions |
| المال | financial-ledger، payouts، order-detail |
| الدعم والنزاعات | support-tickets، disputes، notification-center |
| السلامة والعمليات | sos-monitor، ambulance-fleet، fraud-monitoring |
| التأمين والسياسات | insurance-companies، insurance-queue، legal-policies |
| المحتوى العام | articles، doctors، facilities، home-care-services، lab-services، medicines، dynamic `[type]/[slug]` |
| الدخول | login |

إصلاح build الخاص بـ`<Html>` كان متعلقاً بعزل `next/document` في `_document.tsx` وتشغيل production build بإعداد صحيح؛ لا يجوز استيراد `Html/Head/Main/NextScript` في صفحة عادية. تم التحقق سابقاً من توليد 34 صفحة.

اللوحة مسؤولة عن مراجعة المزودين، إدارة المستخدمين، الكتالوج، الطلبات، الدفاتر، المدفوعات، النزاعات، الأمن، الدعم، الإشعارات، والمراقبة. أي زر إداري يغير المال أو الصلاحيات يحتاج server-side guard وaudit؛ إخفاء الزر وحده ليس حماية.

المتعدد اللغوي وRTL والثيمات في لوحة الإدارة يحتاج جولة مستقلة، ولا ينبغي مساواة نجاح build بقبول UX أو accessibility.

## 9. مصفوفة السيناريوهات الحرجة

| السيناريو | المسار المتوقع | معيار القبول |
|---|---|---|
| تسجيل patient | login ثم refresh/logout | جلسة صحيحة، لا token في logs، وحالة auth متسقة |
| تسجيل provider | `/provider/auth/login` | role/provider_type صحيحان، profile approved، وصلاحياته محدودة |
| admin 2FA | login → requires_2fa → verify | success/failure/expiry/attempts/rate-limit موثقة |
| حجز طبيب | doctor → slots → appointment | ids وحالات حقيقية، ولا slot مزدوج |
| دردشة | thread membership → send/read/delivered | foreign user مرفوض وoffline replay مطابق للعقد |
| مكالمة | appointment → initiate → join/end | participant ownership وLiveKit session حقيقية |
| order | checkout → create → tracking/cancel | owner/pharmacy/admin فقط، وledger متسق |
| payment | intent → gateway → webhook | signature وidempotency وledger state قبل/بعد |
| مختبر/أشعة | provider inbox/sample | provider_type normalized، و403 للنوع الخطأ |
| طوارئ | SOS → location policy | أقل بيانات، إذن، سجل وصول، وعدم مشاركة غير مصرح بها |
| QR | scan → verifier | fail-closed حتى اعتماد contract، لا allowUnsigned أو replay |
| push | register token → event → deep link | targeting صحيح، no duplicates، foreground/background/terminated |

## 10. نتائج الاختبارات والنسخ

النتائج المحلية الموثقة عبر الجولات تشمل backend build ناجحاً، و30 suites/231 tests بعد إصلاح BOLA الأخير، وboot test 1/1، إضافة إلى نتائج سابقة للـcommunications وPhase 6. Patient وProvider typechecks والاختبارات المحلية وExpo web export وAdmin production build تحققت في جولات سابقة موثقة.

هذه الأرقام لا تعني أن كل شاشة وكل جهاز وكل تكامل خارجي قُبل. القبول التشغيلي يحتاج deployment محدد، evidence حي، حسابات sandbox، أجهزة حقيقية، credentials sandbox، وbefore/after لكل mutation.

التاريخ المرجعي للـcommits المهمة:

| Commit | المعنى |
|---|---|
| `9fb6feb` | توثيق نتيجة BOLA الإنتاجية والإصلاح المطلوب |
| `dac6f3c` | إصلاح ownership لمسارات orders/إغلاق BOLA مصدرّياً |
| `3aa5b2c` | توثيق حاجز الوصول إلى Cloudflare قبل origin direct |
| `5bb20b5` | عقود Phase 6 fail-closed ووثائقها وWebSocket CORS |
| `ba0ca17` | فصل ChatService وإزالة circular dependency واختبار boot |
| `1a72d42` | توثيق handoff للجولة السابقة |

## 11. الحالة الحالية والقرارات المفتوحة

الحالة الحالية ليست حكماً بأن المشروع جاهز للإطلاق. الإصلاحات المصدرية كثيرة، والـbuild/test المحلي قوي نسبياً، لكن نقاط الإغلاق التالية تظل مهمة:

1. نشر `dac6f3c` أو رأس الفرع الأحدث على production ثم إعادة اختبار BOLA بقراءة وإلغاء وتعديل patient2 مع state/ledger before-after.
2. تشخيص payment intent 500 من logs المعتمدة قبل تنفيذ sandbox payment/webhook/idempotency/refund.
3. إعادة اختبار WebSocket بعد CORS fail-closed مع انتظار disconnect للـtoken المعدل ورفض Origin غير موثوق وعدم استقبال events.
4. تنفيذ مصفوفة OTP/2FA وrate limiting دون تخمين OTP أو تجاوز حدود المحاولات.
5. مراجعة واعتماد عقود consent وQR وemergency location وerror-code registry؛ تبقى كلها fail-closed وغير مفعلة.
6. اختبار الأجهزة الفعلية، RTL/accessibility، اللغات الست، background/terminated push، الصوت، CallKeep، GPS، والخرائط.
7. تدوير R2 credentials التاريخية، إعادة بناء FastAPI image القديمة، وتوثيق Redis adapter للتوسع متعدد النسخ.
8. اختبار الضغط وobservability وbackup/restore وrollback قبل أي ادعاء تحمل آلاف أو ملايين المستخدمين.

## 12. قواعد التطوير للمبرمج الجديد

قبل إضافة feature، حدد actor وresource وstate machine والعقد وقواعد ownership. افحص المكونات الموجودة قبل إعادة البناء. اكتب الاختبار السلبي قبل mutation الحساس. لا تضف mock data أو success placeholder. لا تضع الأسرار في Git أو logs. استخدم business UUID أو ObjectId بحسب schema ولا تخلطهما. طبّق authorization في backend، ثم اربط الواجهة بحالات loading/empty/error الحقيقية. شغّل typecheck/build/unit/boot، ثم E2E على بيئة مصرح بها، ثم حدّث التقرير و`todo.md`، ثم commit على الفرع المحدد فقط.

## 13. فهرس الملفات والشاشات والوحدات

الفهارس الكاملة المولدة من المصدر مرفقة في هذا المرجع بعد هذا القسم: backend modules/routes، patient app screens، provider app screens، admin pages، وتقارير التدقيق. هذه الفهارس تحفظ أسماء المسارات الفعلية حتى يستطيع المبرمج القفز من الميزة إلى الملف بدلاً من البحث من الصفر.

## 14. مراجع المشروع

1. `audit-artifacts/NABDAH_FULL_PLAN_STATUS_20260817.md` — التقرير الجامع للحالة والإصلاحات والقيود.
2. `audit-artifacts/PHASE6_STAGING_E2E_MATRIX_20260817.md` — مصفوفة E2E والعقود والحواجز التشغيلية.
3. `audit-artifacts/CONSENT_CONTRACT_REVIEW_DRAFT_20260817.md` — مسودة عقد consent.
4. `audit-artifacts/QR_VERIFIER_CONTRACT_REVIEW_DRAFT_20260817.md` — مسودة عقد QR.
5. `audit-artifacts/EMERGENCY_LOCATION_POLICY_REVIEW_DRAFT_20260817.md` — مسودة سياسة الموقع.
6. `audit-artifacts/ERROR_CODE_REGISTRY_REVIEW_DRAFT_20260817.md` — مسودة سجل أكواد الأخطاء.
7. `todo.md` — سجل التنفيذ التاريخي والعناصر المفتوحة.
8. `nabdah-backend.zip` — أرشيف backend المرفوع في الفرع.
9. `nabd_plus_patient_app.zip` — أرشيف تطبيق المريض.
10. `NabdProvider-provider.zip` — أرشيف تطبيق مزود الخدمة.
11. `Napd-admin-dashboard.zip` — أرشيف لوحة الإدارة.

---

# الملحق A — فهرس Backend وقاعدة البيانات

هذا الملحق يُولد من المسارات الفعلية في `backend/nabdah-backend/src` ويضم controllers، services، gateways، modules، schemas/models، وعقود routes. وجود الملف في الفهرس يعني أنه جزء من source inventory، ولا يعني وحده أن كل endpoint مقبول E2E.

# الملحق B — فهرس شاشات تطبيق المريض

تُقرأ الشاشات بحسب Expo Router path. المسار بين قوسين يعني مجموعة layout أو route group. على المبرمج تتبع كل شاشة إلى API call، auth state، mutation، loading/error/empty، deep link، وtranslation key.

# الملحق C — فهرس شاشات تطبيق مزود الخدمة

تطبيق المزود يضم shared screens وcomponents وapi/services/context/security. يجب قراءة provider type والpermission قبل اعتبار أي screen متاحة لكل المزودين.

# الملحق D — فهرس لوحة الإدارة

صفحات Next.js الظاهرة في manifest هي نقطة الدخول لكل تجربة. الصفحات الإدارية يجب أن تُقرأ مع guards وAPI client وaudit behavior، لا بصرياً فقط.

# الملحق E — قاموس الحالة

**SOURCE-VERIFIED:** أثبته فحص المصدر أو اختبار محلي محدد.

**BUILD-VERIFIED:** نجح build/typecheck دون أن يثبت التكامل الحي.

**E2E-VERIFIED:** أثبته اختبار حي مع evidence منقح.

**FAIL-CLOSED:** المسار يرفض أو لا يمنح صلاحية عند غياب العقد أو الإعداد.

**OPEN:** يحتاج تنفيذ أو اعتماد أو دليل.

**NOT-A-PROOF:** وجود route أو button أو schema ليس دليلاً على أن العملية التجارية مكتملة.

## A.1 الفهرس الفعلي لوحدات Backend ومساراته

```text
--- backend modules/controllers/services/models ---
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/app.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/health.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-command-center/admin-command-center.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/b2b.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/system-config.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/admin-web-core.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/audit-log.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/commission-ledger.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/fraud-alert.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/heatmap-data.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/procurement-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/provider-delta.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/provider.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/system-config-extended.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/schemas/withdrawal-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai-gateway.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai-provider.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/analytics/analytics.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/api-security/api-security.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/articles/articles.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/articles/seo.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/device-trust.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/schemas/passkey-credential.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/schemas/trusted-device.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/billing/billing.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/billing/billing.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/business-rules/business-rules.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-integration.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-referrals.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/schemas/doctor-profile-extended.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/schemas/encounter-record.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/schemas/encounter-referrals.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/slot.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/cart/cart.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/chat/chat.gateway.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/chat/chat.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/chat/chat.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/compat/admin-spa.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/compat/compat.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/config/config.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/config/config.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/config/config.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/consistency/consistency.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/coturn/coturn.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/coturn/coturn.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/coturn/coturn.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/device-trust/device-trust.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/doctors/doctors.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/events/event-bus.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/events/events.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/events/system-event.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flag.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health-dashboard.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/schemas/home-care-booking.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/schemas/home-care-nurse.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/schemas/medical-supply-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/hospital.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/schemas/hospital-branch.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/schemas/hospital-department.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/schemas/hospital-invitation.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/schemas/hospital-staff.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/services/hospital.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/i18n/i18n.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/i18n/i18n.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/i18n/i18n.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/insurance/insurance.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/insurance/insurance.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-pdf.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/schemas/lab-booking.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/schemas/lab-catalog.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legacy/legacy.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mail/mail.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/moyasar/moyasar.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/moyasar/moyasar.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notification/notification.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notification/notification.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ocr/ocr.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ops/ops.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ops/ops.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/dispatch.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/payments.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/schemas/pharmacy.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/schemas/procurement-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/schemas/quotation.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-broadcast.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-chat.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-inventory-ext.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-notification.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-order.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-orders-provider.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-seed.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/pharmacy-shortage.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/procurement.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/services/smart-split.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/presence/presence.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/presence/presence.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider-onboarding/contract-pdf.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/leave-requests.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/provider.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/schemas/capabilities.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/schemas/delta.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/schemas/requests.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/assignment-strategy.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/geo-engine.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-admin.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-auth.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-dashboard.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-image-processor.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-mailer.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-matching.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-notifications.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-operators.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-otp.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-profile.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-request-engine.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-schedule.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-scoring.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/provider-seed.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/scheduling-engine.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/services/service-capability.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/schemas/hospital-sub-entity.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/schemas/provider-delta.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/push/push.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/schemas/radiology-booking.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ratings/ratings.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/realtime/realtime.gateway.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/realtime/realtime.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/realtime/realtime.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/recruitment/recruitment.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/redis/redis.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/redis/redis.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/referral/referral.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/referral/referral.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/referral/referral.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/security/security.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seed/seed.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seed/seed.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo-search/seo-search.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/sms/sms.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/sms/sms.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/socket/socket.gateway.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/storage/storage.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/system-health/system-health.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/system-health/system-health.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/timeline/timeline.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/timeline/timeline.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/timeline/timeline.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/tour/tour.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/tour/tour.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/tour/tour.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/unified-bookings/unified-bookings.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/unified-bookings/unified-bookings.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/data-retention.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/user.insurance.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.addresses.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.insurance.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.controller.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.service.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/ad-placement.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/ambulance-vehicle.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/analytics-event.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/appointment.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/approval-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/article.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/audit-log.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/b2b-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/callmetric.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/callsession.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/chat-session.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/corporate-account.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/custom-service.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/delivery.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/driver-shift.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/drug-rejection-log.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/emergency.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/facility.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/feature-flag.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/fraud-alert.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/health.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/home-care.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/hospital-operations.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/image-processing-job.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/insurance.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/inventory.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/job-board.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/lab-result.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/lab.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/leave-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/maternity.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/medical-profile.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/medical-report.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/medicine.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/mental-health.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/notification.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/nutrition.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/order.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/outbound-referral.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/patient-crm-tag.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/patient-profile.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/pharmacy-chat.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/pharmacy-inventory.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/prescription.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/profile-image-audit-log.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/profile-image-metadata.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/promotion-campaign.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/provider-availability.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/provider-branch.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/provider-profile.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/push-token.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/radiology.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/referral.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/refund-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/return-request.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/returns.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/review.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/sla-log.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/slot-lock.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/support.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/system-config.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/systemevent.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/transaction.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/treatment-program.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/universal-activity.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/user.schema.ts
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/schemas/wallet.schema.ts
--- backend routes decorators ---
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:11:  @Get('me/profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:16:  @Patch('me/profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:21:  @Get('me/wishlist')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:26:  @Post('me/wishlist/:itemId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:32:  @Get('me/notification-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:37:  @Patch('me/notification-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:42:  @Get('me/storage')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:47:  @Get('me/privacy-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:52:  @Patch('me/privacy-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:57:  @Get('me/security-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:62:  @Patch('me/security-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:67:  @Post('me/change-password')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:72:  @Get('me/sessions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:76:  @Delete('me/sessions/:jti')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:80:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:86:  @Post(':id/toggle')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.controller.ts:92:  @Delete(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/user.insurance.controller.ts:12:  @Get('insurance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.addresses.controller.ts:11:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.addresses.controller.ts:17:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.addresses.controller.ts:34:  @Patch(':addressId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.addresses.controller.ts:52:  @Delete(':addressId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.insurance.controller.ts:10:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/users/users.insurance.controller.ts:16:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:11:  @Post('requests') create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:13:  @Post('tickets') createTicket(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:14:  @Get('requests/mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:15:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:16:  @Post('requests/:id/reply') reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reply(u, id, b.message); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:23:  @Get('tickets')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:29:  @Get('faqs')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:34:  @Post('feedback')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:39:  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/support/support.controller.ts:40:  @Patch('settings') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.updateSettings(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:14:  @Post('moyasar')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:24:  @Post('paytabs')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:34:  @Post('sms')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:42:  @Post('livekit')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:16:  @Get('posts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:26:  @Post('posts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:31:  @Get('posts/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:36:  @Post('posts/:id/comment')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:41:  @Put('posts/:id/vote')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:46:  @Delete('posts/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:58:  @Put('admin/:id/moderate')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:65:  @Get('live-sessions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:70:  @Post('live-sessions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:75:  @Put('live-sessions/:id/join')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:80:  @Put('live-sessions/:id/status')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:14:  @Get('prescriptions/:rxNumber') async byRxNumber(@CurrentUser() u: any, @Param('rxNumber') rx: string) {
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:26:  @Post('reports/eod') async eod(@CurrentUser() u: any) {
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:42:  @Get('orders/incoming') incoming(@CurrentUser() u: any) { return this.svc.incoming(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:43:  @Get('orders/preparing') preparing(@CurrentUser() u: any) { return this.svc.preparing(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:44:  @Get('orders/ready') ready(@CurrentUser() u: any) { return this.svc.ready(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:45:  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:46:  @Get('orders/basket-review') basketReview(@CurrentUser() u: any) { return this.svc.basketReview(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:47:  @Get('orders/awaiting-approval') awaitingApproval(@CurrentUser() u: any) { return this.svc.awaitingApproval(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:48:  @Get('orders/refills') refills(@CurrentUser() u: any) { return this.svc.refillOrders(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:51:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:52:  @Post('orders/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { reason?: string }) { return this.ordersSvc.reject(id, u, b?.reason || ''); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:53:  @Post('orders/:id/preparing') preparingAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markPreparing(id, u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:54:  @Post('orders/:id/ready') readyAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markReady(id, u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:55:  @Post('orders/:id/partial') partial(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { unavailable_medicine_ids: string[] }) { return this.ordersSvc.markPartial(id, u, b.unavailable_medicine_ids || []); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:58:  @Get('inventory') inventory(@CurrentUser() u: any) { return this.svc.getInventory(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:59:  @Post('inventory/stock') stock(@CurrentUser() u: any, @Body() b: { medicine_id: string; stock_qty: number; is_available?: boolean }) { return this.svc.updateStock(u, b.medicine_id, b.stock_qty, b.is_available !== false); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:60:  @Post('inventory/add') addMed(@CurrentUser() u: any, @Body() b: any) { return this.svc.addMedicineToInventory(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:63:  @Get('orders/:id') orderDetail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.orderDetail(u, id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:64:  @Post('orders/:id/items/:idx/unavailable') itemUnavailable(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.markItemUnavailable(u, id, parseInt(idx, 10)); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:65:  @Post('orders/:id/items/:idx/restore') itemRestore(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.restoreItem(u, id, parseInt(idx, 10)); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:66:  @Post('orders/:id/items/:idx/qty') itemQty(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { qty: number }) { return this.svc.updateItemQty(u, id, parseInt(idx, 10), b.qty); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:67:  @Post('orders/:id/items/:idx/substitute') itemSub(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { name_ar: string; name_en?: string; medicine_id?: string; qty?: number; price?: number; note?: string }) { return this.svc.substituteItem(u, id, parseInt(idx, 10), b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:70:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { note?: string }) { return this.svc.submitBasket(u, id, b?.note); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:88:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:89:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.submitBasket(u, id, b?.note); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:90:  @Post('orders/:id/insurance') insurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:93:  @Post('orders/:id/dispatch') dispatch(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:8:  @Get('sla')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:19:  @Put('sla')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:6:  @Get('liveness')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:19:  @Get('readiness')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:22:  @Put('trigger-emergency-maintenance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:50:  @Get('fraud-alerts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:57:  @Get('audit-logs')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12:  @Get('procurement/pending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:22:  @Patch('issue-quote/:procurementId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:45:  @Post('provider-deltas')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51:  @Post('provider-deltas/:id/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:82:  @Post('provider-deltas/:id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts:36:  @Get('heatmaps')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:31:  @Get('commissions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:37:  @Get('withdrawals/pending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:70:  @Post('withdrawals/:id/execute')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:119:  @Post('withdrawals/:id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.controller.ts:20:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.controller.ts:25:  @Delete(':value')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/bans/bans.controller.ts:30:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.controller.ts:16:  @Post('upload')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.controller.ts:46:  @Post('presigned')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/media/media.controller.ts:124:  @Delete(':key(*)')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:14:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:25:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:31:  @Post(':key')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:19:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:31:  @Put()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:15:  @Get('requests')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:24:  @Post('requests/:id/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:34:  @Post('requests/:id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:13:  @Get('config')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:22:  @Get('account')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:28:  @Get('transactions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:34:  @Get('leaderboard')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:40:  @Get('challenges')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:46:  @Post('challenges/:id/join')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:52:  @Get('rewards')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:58:  @Post('rewards/:id/claim')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:64:  @Get('rewards/claimed')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:12:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:45:  @Get('autocomplete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:51:  @Post('lookup-barcode')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:57:  @Get('by-barcode/:code')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:63:  @Get('categories')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:69:  @Get('filters')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:75:  @Post('compare')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:85:  @Get('hot')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:92:  @Get('search/did-you-mean')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:99:  @Get('search/trending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:105:  @Get('search/recent')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:111:  @Post('admin/hot/regenerate')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:118:  @Post(':id/report-shortage')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:124:  @Get('admin/shortage-reports')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:131:  @Post('admin/shortage-reports/:reportId/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:138:  @Post('admin/shortage-reports/:reportId/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:145:  @Post('admin/catalog/:id/clear-shortage-badge')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:152:  @Post('admin/catalog/:id/availability')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:161:  @Post(':id/suggest-image')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:167:  @Get('admin/image-suggestions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:174:  @Post('admin/image-suggestions/:suggestionId/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:181:  @Post('admin/image-suggestions/:suggestionId/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:189:  @Post(':id/suggest-change')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:196:  @Post('suggest-new-item')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:202:  @Get('admin/change-requests')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:209:  @Post('admin/change-requests/:requestId/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:216:  @Post('admin/change-requests/:requestId/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:223:  @Patch('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:230:  @Get('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:247:  @Post('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:254:  @Post('admin/catalog/:id/delete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:261:  @Get('admin/reports')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:268:  @Get('me/recently-viewed')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:274:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:280:  @Get(':id/details')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:289:  @Get(':id/alternatives')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:294:  @Post('manual-entry')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:299:  @Get('admin/pending-review')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:305:  @Post('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:311:  @Delete('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:317:  @Post(':id/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:323:  @Post(':id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:329:  @Patch(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:336:  @Post('admin/import-json')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medicines/medicines.controller.ts:342:  @Post('admin/import-csv')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:19:  @Get('resolve/:type/:slug')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:28:  @Get('meta/:type/:slug')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:35:  @Get('build/:type/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:45:  @Get('sitemap.xml')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:58:  @Get('llms.txt')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/seo/seo.controller.ts:70:  @Get('robots.txt')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/timeline/timeline.controller.ts:17:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/timeline/timeline.controller.ts:35:  @Get('summary')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:14:  @Get('config')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:20:  @Post('config')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:27:  @Get('admin/gateway')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:34:  @Post('admin/gateway/provider/:key')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:41:  @Post('admin/gateway/mode')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:48:  @Get('admin/usage')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:56:  @Post('triage')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:61:  @Get('triage/history')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:66:  @Post('voice-to-order')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:85:  @Post('prescription-ocr')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:91:  @Post('parse-excel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:107:  @Post('copilot/suggest')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:113:  @Post('triage/chat')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:120:  @Post('ocr-translate')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:125:  @Post('skin-analysis')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:130:  @Post('medicine-image-search')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:135:  @Post('barcode-lookup')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:140:  @Post('analyze-meal')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:150:  @Post('analyze-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:156:  @Post('generate-exercise-plan')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ai/ai.controller.ts:161:  @Post('generate-diet-plan')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.controller.ts:10:  @Get('offers')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.controller.ts:15:  @Get('upcoming-appointment')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home/home.controller.ts:20:  @Get('search')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:12:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:22:  @Post('register-token')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:36:  @Post(':id/read')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:41:  @Post('read-all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:46:  @Post('admin/send')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:53:  @Post('admin/schedule')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/notifications/notifications.controller.ts:61:  @Get('admin/delivery-stats')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/referral/referral.controller.ts:16:  @Get('my')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/referral/referral.controller.ts:22:  @Post('apply')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:52:  @Post('register')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:59:  @Post('login')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:85:  @Post('guest')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:90:  @Post('convert-guest')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('login/verify-2fa')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:119:  @Get('me')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:127:  @Get('trusted-devices')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:133:  @Delete('trusted-devices/:deviceId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:139:  @Post('heartbeat')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:150:  @Get('sessions/online')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:157:  @Post('refresh')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:163:  @Post('logout-all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:169:  @Post('consent')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:179:  @Post('logout')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:192:  @Post('send-otp')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:200:  @Post('verify-otp')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:208:  @Post('reset-password')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/auth.controller.ts:217:  @Post('social-login')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts:19:  @Post('enroll/options')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts:24:  @Post('enroll/verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts:30:  @Get('devices')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts:36:  @Delete('devices/:credentialId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/auth/passkey.controller.ts:44:  @Post('login/verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/i18n/i18n.controller.ts:13:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/i18n/i18n.controller.ts:19:  @Get('all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts:19:  @Get('patients')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts:25:  @Get('appointments')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts:31:  @Get('orders')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts:37:  @Get('transactions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/export/export.controller.ts:43:  @Get('audit-logs')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:13:  @Get() get(@CurrentUser() u: any) { return this.svc.getOrCreate(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:14:  @Get('passport-token')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:20:  @Patch() update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:22:  @Post('chronic-diseases') addCd(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'chronic_diseases', b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:23:  @Delete('chronic-diseases/:id') delCd(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'chronic_diseases', id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:25:  @Post('allergies') addAl(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'allergies', b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:26:  @Delete('allergies/:id') delAl(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'allergies', id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:28:  @Post('surgeries') addS(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'surgeries', b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:29:  @Delete('surgeries/:id') delS(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'surgeries', id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:31:  @Post('long-term-medications') addLm(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'long_term_medications', b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:32:  @Delete('long-term-medications/:id') delLm(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'long_term_medications', id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:35:  @Get('provider/:patientId') byPatient(@CurrentUser() u: any, @Param('patientId') pid: string) { return this.svc.getForPatient(u, pid); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/tour/tour.controller.ts:10:  @Get('status')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/tour/tour.controller.ts:15:  @Post('complete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:12:  @Get('vitals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:16:  @Get('vitals/chart')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:19:  @Get('vitals/recent')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:22:  @Get('vitals/latest')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:25:  @Get('vitals/summary')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:28:  @Get('score')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:30:  @Post('vitals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:32:  @Patch('vitals/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:34:  @Delete('vitals/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:37:  @Get('reminders')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:39:  @Post('reminders')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:41:  @Post('reminders/:id/log')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:45:  @Post('reminders/:id/refill')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:47:  @Post('reminders/:id/refill/snooze')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:49:  @Post('reminders/:id/refill/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:51:  @Patch('reminders/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:55:  @Delete('reminders/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:58:  @Get('sleep')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:62:  @Post('sleep')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:68:  @Get('reports')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:73:  @Get('medications/reminders')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:78:  @Get('prescriptions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:83:  @Get('emergency-contacts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:88:  @Post('emergency-contacts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:93:  @Delete('emergency-contacts/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:98:  @Get('chronic-diseases')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:103:  @Get('chronic-meds')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health.controller.ts:108:  @Get('trends')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/health/health-dashboard.controller.ts:31:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:25:  @Post('mood')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:33:  @Get('mood')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:44:  @Get('mood/stats')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:54:  @Post('meditation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:62:  @Get('meditation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:70:  @Get('meditation/stats')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:80:  @Post('breathing')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:88:  @Get('breathing')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:98:  @Post('assessment')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:106:  @Get('assessment')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:116:  @Get('crisis-contacts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:124:  @Post('crisis-contacts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:132:  @Delete('crisis-contacts/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:142:  @Get('dashboard')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:9:  @Public() @Get('services')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:29:  @Public() @Get('packages')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:32:  @Public() @Get('categories')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:35:  @Public() @Get('services/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:38:  @Post('bookings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:41:  @Get('bookings/mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:44:  @Get('bookings/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:55:  @Post('bookings/:id/documents')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:70:  @Get('provider/inbox')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:75:  @Post('bookings/:id/assign-technician')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:80:  @Post('bookings/:id/upload-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:86:  @Patch('bookings/:id/reschedule')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:91:  @Post('bookings/:id/gps')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:96:  @Get('bookings/:id/tracking')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:101:  @Post('bookings/:id/emergency')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:106:  @Post('bookings/:id/reassign')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:111:  @Get('admin/all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:124:  @Post('samples/register')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:130:  @Patch('samples/:id/stage')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:136:  @Get('samples')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:143:  @Post('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:149:  @Put('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:155:  @Delete('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:168:  @Public() @Get('packages/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/labs.controller.ts:173:  @Public() @Get('compatible-providers')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:14:  @Get('queue')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:23:  @Post(':id/respond')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:42:  @Post('collect-sample/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:70:  @Post('finalize-test/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:100:  @Get('catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:106:  @Post('catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:121:  @Get('wallet')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.controller.ts:11:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.controller.ts:12:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mineFor(u); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.controller.ts:13:  @Get('by-booking/:bid') byBkg(@CurrentUser() u: any, @Param('bid') bid: string) { return this.svc.byBooking(u, bid); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/labs/lab-results.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:11:  @Post('create')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:17:  @Post('upload')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:22:  @Post('manual-entry')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:28:  @Post(':id/send')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:34:  @Post(':id/transition')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:39:  @Post(':id/substitute')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:45:  @Get('active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:48:  @Get('mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:53:  @Get('doctor/mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:59:  @Get('pharmacy/queue')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:65:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/articles/seo.controller.ts:15:  @Get('resolve/:type/:slug')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:13:  @Post('apply')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:20:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:33:  @Get('map')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:39:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:45:  @Get('me/profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:58:  @Post('admin/create')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:64:  @Get('admin/all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:70:  @Get('admin/pending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:76:  @Post(':id/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:82:  @Post(':id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:88:  @Post(':id/suspend')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/providers.controller.ts:95:  @Post('admin/seed-demo')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:19:  @Post('provision-sub-provider')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:49:  @Get('branch-staff/:hospitalId/:branchId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:70:  @Post('branch-financials/:hospitalId/:branchId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:34:  @Post('request')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:85:  @Get('mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:91:  @Get('balance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/config/config.controller.ts:13:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:12:  @Get('profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:18:  @Get('content')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:24:  @Post('profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:31:  @Post('kicks')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:38:  @Post('contractions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:45:  @Put('checkups/:week/toggle')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/maternity/maternity.controller.ts:52:  @Post('infant-growth')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:13:  @Post('create')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:20:  @Get('mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:25:  @Post(':id/reorder')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:30:  @Post(':id/reorder-partial')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:35:  @Post(':id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:41:  @Post(':id/approve-basket')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:45:  @Post(':id/reject-basket')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:50:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:55:  @Get(':id/report.pdf')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:67:  @Get(':id/tracking')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:72:  @Patch(':id/items/:itemId/opt-in-cash')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:79:  @Get('pharmacy/queue')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:85:  @Patch(':id/insurance-approval')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:91:  @Post(':id/accept')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:97:  @Post(':id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:103:  @Post(':id/preparing')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:109:  @Post(':id/ready')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:115:  @Post(':id/partial')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:122:  @Post(':id/assign-delivery')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:128:  @Post(':id/delivery/update')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:134:  @Post(':id/dispatch')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:140:  @Post(':id/delivered')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:147:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:153:  @Get('admin/escalated')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:159:  @Post(':id/admin/transition')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:165:  @Post('bids/place')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:171:  @Post('bids/:id/accept')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:176:  @Get('bids/request/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/orders/orders.controller.ts:181:  @Get('bids/pharmacy/mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:16:  @Patch('notifications/:id/read')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:24:  @Get('wallet/balance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:30:  @Post('wallet/credit')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:43:  @Post('wallet/debit')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:56:  @Post('referral/code')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:62:  @Post('referral/claim')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:69:  @Get('config/flags')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:74:  @Put('admin/config/flags')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:85:  @Get('patients/timeline')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:90:  @Get('patients/passport')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:95:  @Post('medical/programs/enroll')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:101:  @Get('medical/programs/active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:106:  @Post('medical/programs/complete-session')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:116:  @Post('provider/match/pharmacy')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:121:  @Post('provider/match/nurse')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:126:  @Get('provider/rankings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:132:  @Get('provider/fraud-alerts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:142:  @Post('nursing/attendance/verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:147:  @Get('nursing/visit/checklist')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:152:  @Post('pharmacy/broadcast/respond')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:158:  @Get('pharmacy/inventory/expiry')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:163:  @Post('labs/samples/barcode-verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:169:  @Post('labs/results/verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:178:  @Get('admin/analytics/heatmaps')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:184:  @Post('admin/ads/bid')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:190:  @Post('corporate/enroll')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:17:  @Get('profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:25:  @Post('profile')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:35:  @Post('meals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:43:  @Get('meals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:53:  @Get('daily-summary')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:63:  @Post('water')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:71:  @Get('water')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:81:  @Post('exercise')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:89:  @Get('exercise')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:99:  @Get('weekly-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:13:  @Get('provider/waiting-room')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:18:  @Post('provider/ping-patient')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:23:  @Post('provider/no-show')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:31:  @Post('webhook')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:37:  @Post('initiate')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:46:  @Post(':sessionId/join')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:51:  @Post(':sessionId/end')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:56:  @Post(':sessionId/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:61:  @Post(':sessionId/metrics')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:70:  @Get('history')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:75:  @Get('sessions/:sessionId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:81:  @Get('admin/rooms')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:87:  @Get('admin/analytics')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:93:  @Get('admin/rooms/:roomName/participants')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:99:  @Post('admin/rooms/:roomName/mute/:participantId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/livekit/livekit.controller.ts:109:  @Post('admin/rooms/:roomName/remove/:participantId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:39:  @Get('referrals/report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:100:  @Get('loyalty/overview')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:139:  @Get('users/:userId/overview')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:242:  @Get('disputes')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:272:  @Get('users')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:330:  @Get('users/stats')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:353:  @Get('sub-admins')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:369:  @Post('sub-admins')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:398:  @Patch('sub-admins/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:419:  @Delete('sub-admins/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:444:  @Post('providers/create')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:479:  @Post('users/:userId/ban')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:495:  @Post('users/:userId/unban')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:511:  @Delete('users/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:550:  @Post('approve/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:564:  @Post('suspend/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:578:  @Post('provider-deltas')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:584:  @Post('provider-deltas/:deltaId/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/admin/admin.controller.ts:598:  @Post('provider-deltas/:deltaId/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.controller.ts:14:  @Get('methods')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.controller.ts:19:  @Post('initiate')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/payments/paymob.controller.ts:25:  @Post('verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/system-health/system-health.controller.ts:13:  @Get('liveness')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/system-health/system-health.controller.ts:29:  @Get('readiness')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:28:  @Get('legal/policy/:key/pdf')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:44:  @Get('legal/archive/:id/pdf')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:56:  @Get('legal/archive/:id/verify')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:60:  @Get('admin/finance/commission-history')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:68:  @Get('admin/audit-log')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:76:  @Get('provider/settlements')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:82:  @Get('provider/settlements/excel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:91:  @Get('provider/settlements/pdf')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:101:  @Post('admin/providers/license-monitor/run')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:107:  @Get('provider/insurance-matrix')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:111:  @Put('provider/insurance-matrix')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:119:  @Get('provider/sla')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:126:  @Get('consents')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:130:  @Put('consents/:type')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:141:  @Get('admin/legal/policy/:key/diff')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/unified-bookings/unified-bookings.controller.ts:8:  @Post('checkout-cart')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ops/ops.controller.ts:39:  @Get('overview')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ops/ops.controller.ts:119:  @Get('requests')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/ops/ops.controller.ts:162:  @Get('traffic')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:16:  @Post('create')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:23:  @Get('my-group')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:29:  @Post('invite')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:35:  @Post('join')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:41:  @Post('leave')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:47:  @Patch('member/:userId/relation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:53:  @Patch('member/:userId/permissions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:59:  @Get('member-records/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:65:  @Delete('remove-member/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:71:  @Get('members')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:77:  @Get('member-health/:userId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:83:  @Get('emergency-contacts')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:91:  @Post('calendar/event')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:97:  @Get('calendar')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:103:  @Delete('calendar/event/:eventId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:111:  @Post('permissions/request')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:124:  @Get('permissions/pending')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/family/family.controller.ts:130:  @Put('permissions/respond/:requestId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:10:  @Post('verify-attendance/:bookingId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:43:  @Post('submit-supplies-request')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:21:  @Post('notes')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:45:  @Get('notes/:patientId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:53:  @Public() @Get('catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:59:  @Post('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:69:  @Put('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:80:  @Delete('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:90:  @Get('visits')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:96:  @Get('visits/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:105:  @Get('visits/:id/tracking')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:147:  @Post('visits/:id/respond')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:164:  @Post('visits/:id/transit')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:182:  @Post('visits/:id/arrive')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:214:  @Post('visits/:id/start-care')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:228:  @Post('visits/:id/no-show')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:247:  @Post('visits/:id/emergency-abort')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:262:  @Post('visits/:id/complete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/home-care/home-care.controller.ts:289:  @Get('wallet')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:11:  @Post('online')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:17:  @Post('offline')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:23:  @Get('shift')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:29:  @Post('location')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:35:  @Get(':driverId/location')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:40:  @Get('orders/available')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:46:  @Get('orders/active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:52:  @Get('orders/history')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:58:  @Post('orders/:id/accept')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:64:  @Post('orders/:id/pickup')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:70:  @Post('orders/:id/deliver')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:77:  @Get('admin/online')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/drivers/drivers.controller.ts:84:  @Get('available')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/coturn/coturn.controller.ts:10:  @Get('config')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/coturn/coturn.controller.ts:15:  @Get('credentials')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/leave-requests.controller.ts:14:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/leave-requests.controller.ts:23:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/leave-requests.controller.ts:48:  @Post('action')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:29:  @Post('promotions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:45:  @Get('promotions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:51:  @Post('referrals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:65:  @Get('referrals')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:72:  @Get('crm/patients')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:89:  @Get('crm/patients/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:107:  @Patch('crm/patients/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:128:  @Post('home-care/bookings/:id/check-in')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:147:  @Post('home-care/reports/:id/submit')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:169:  @Post('radiology/bookings/:id/upload-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/provider/simulated-features.controller.ts:187:  @Post('radiology/bookings/:id/publish-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-integration.controller.ts:14:  @Put('synchronize-settings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-integration.controller.ts:36:  @Post('finalize-encounter')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:14:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:19:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:24:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:29:  @Post('waitlist/join')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:34:  @Patch(':id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:39:  @Patch(':id/reschedule')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:45:  @Patch(':id/confirm')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:51:  @Patch(':id/check-in')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:57:  @Patch(':id/start')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:63:  @Patch(':id/complete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:69:  @Post(':id/finish')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/appointments.controller.ts:75:  @Get(':id/summary')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:29:  @Get('my-referrals/:doctorId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:66:  @Post('issue-referrals-and-prescription')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:94:  @Patch('diagnostic-callback/:appointmentId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:11:  @Get('specialties')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:17:  @Get('insurance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:23:  @Get('degrees')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:29:  @Get('doctors')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:60:  @Get('doctors/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:66:  @Get('doctors/:id/slots')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:76:  @Get('search')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:83:  @Get('facilities')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/care/care.controller.ts:95:  @Get('facilities/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:9:  @Public() @Get('services')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:31:  @Public() @Get('modalities')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:34:  @Public() @Get('services/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:37:  @Post('bookings')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:40:  @Get('bookings/mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:43:  @Get('bookings/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:46:  @Post('bookings/:id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:49:  @Patch('bookings/:id/state')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:54:  @Post('bookings/:id/publish-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:59:  @Get('reports/mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:62:  @Post('bookings/:id/documents')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:67:  @Patch('bookings/:id/insurance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:72:  @Get('provider/inbox')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:77:  @Post('bookings/:id/assign-technician')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:82:  @Post('bookings/:id/upload-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:88:  @Post('bookings/:id/checkin')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:93:  @Post('bookings/:id/start-scan')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:99:  @Post('bookings/:id/abort')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:105:  @Post('bookings/:id/submit-report-for-review')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:110:  @Post('bookings/:id/approve-report')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:116:  @Post('bookings/:id/insurance-approval')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:122:  @Patch('bookings/:id/reschedule')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:128:  @Get('bookings/:id/tracking')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:134:  @Post('catalog/delta-request')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:140:  @Post('bookings/:id/confirm-preparation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:145:  @Get('admin/all')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:159:  @Post('admin/catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:165:  @Put('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:171:  @Delete('admin/catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/radiology.controller.ts:178:  @Patch('admin/bookings/:id/force-state')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:22:  @Get('queue')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:37:  @Post(':id/respond')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:62:  @Post('allocate-machine/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:95:  @Post('finalize-scan/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:127:  @Get('wallet')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:164:  @Get('catalog')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:170:  @Post('catalog/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:181:  @Get('inventory')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:188:  @Post('inventory')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:21:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:62:  @Get('mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:70:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:82:  @Post('allocate-machine/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:112:  @Post('finalize-scan/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:16:  @Get('timeline')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:36:  @Get('mine')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:41:  @Get('track/:trackingId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:46:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:49:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:10:  @Get('balance')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:17:  @Get('transactions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:23:  @Get('spending-data')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:34:  @Post('topup')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:42:  @Post('topup/confirm')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:48:  @Get('topup/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:53:  @Post('transfer')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:61:  @Get('cards')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:68:  @Post('cards')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/wallet/wallet.controller.ts:75:  @Delete('cards/:id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:10:  @Post('branches')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:15:  @Get('branches')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:20:  @Post('departments')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:25:  @Get('departments')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:30:  @Post('staff')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:35:  @Get('staff')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:40:  @Post('doctors/onboard')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:45:  @Get('appointments')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:58:  @Get('wallet')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:66:  @Post('invitations')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:71:  @Get('invitations')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:76:  @Get('invitations/inbox')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:81:  @Post('invitations/:id/respond')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:11:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:16:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:21:  @Get('provider/list')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:27:  @Get('eligibility/:orderId')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:32:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/returns/returns.controller.ts:37:  @Post(':id/decide')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts:10:  @Get('shortage-flags/lookup')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:26:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:32:  @Get('summary')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:38:  @Get(':id/export')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:47:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:53:  @Patch(':id/review')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:59:  @Post(':id/quotation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:70:  @Get(':id/quotation')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:76:  @Patch(':id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:82:  @Patch(':id/complete')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:29:  @Post('submit-request')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:53:  @Get('my-requests')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:61:  @Post(':id/feedback')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:75:  @Post('analyze-file')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/insurance/insurance.controller.ts:11:  @Get('active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/insurance/insurance.controller.ts:22:  @Get('companies')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:95:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:101:  @Post()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:107:  @Patch(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:113:  @Delete(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:125:  @Get()
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:131:  @Post(':id/approve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:137:  @Post(':id/reject')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:11:  @Post('trigger')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:17:  @Get('my/active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:23:  @Post(':id/cancel')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:29:  @Get('driver/missions')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:35:  @Post(':id/claim')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:41:  @Get('tracking')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:47:  @Post(':id/track')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:52:  @Get('active')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:58:  @Get(':id')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:64:  @Post(':id/assign')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:71:  @Post(':id/auto-dispatch')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/emergency/emergency.controller.ts:77:  @Post(':id/resolve')
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:12:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:13:  @Get('mine') mine(@CurrentUser() u: any, @Query('kind') k?: string) { return this.svc.mine(u, k); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:17:  @Get('admin/list') list(@Query('kind') k?: string, @Query('status') s?: string) { return this.svc.adminList(k, s); }
/home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:18:  @Patch('admin/:id/status') updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateStatus(u, id, b.status, b.note); }
```

## B.1 الفهرس الفعلي لشاشات Patient App

```text
--- patient screens ---
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/forgot-password.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/login.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/otp.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/privacy.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/provider-info.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/register.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/reset-password.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/terms.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/welcome.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/language.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/permissions.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/consultations/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/diagnostics.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/health.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/nursing.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/pharmacy.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/services.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/chat-doctor.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/monthly-report.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/prescription-translator.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/skin-analysis.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/symptom-checker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/symptom-timeline.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/triage.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/articles/[slug].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/articles/bookmarks.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/articles/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/community/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/community/post-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/appointment-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/appointments.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/book/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/booking-confirm.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/booking-pending.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/booking-success.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/call-history.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/cancel-reschedule.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/chat-with-doctor.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/clinic-confirm.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/clinic-location.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/clinic/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/doctor-profile.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/doctor-search.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/doctor/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/follow-up.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/home-visit-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/incoming-call.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/offer/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/post-call-rating.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/prescription-from-doctor.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/share-report.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/specialty-select.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/summary.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/video-call.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/video/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/virtual-waiting-room.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/consultations/waiting-room.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/delivery/address-select.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/book-sample.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/booking-confirm.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/booking-success.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/cart.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/checkout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/insurance-approval.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/insurance-upload.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/lab-comparison.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/lab/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/my-results.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/order/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/orders.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/package-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/packages.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/results-history.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/sample-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/search.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/technician-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/test-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/upload-rx.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/drug-scanner/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/sos-active.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/sos.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/calendar.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/chat.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/emergency-contacts.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/invite.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/join.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/member-health.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/permission-request.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/permissions.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/scan.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/shared-calendar.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/actionable-order.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/add-family-member.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/chronic-disease.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/chronic-medications.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/conditions-allergies.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/edit-profile.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/emergency-contacts.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/family-calendar.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/family-chat.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/family-hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/family-member-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/health-id.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/medication-reminder-add.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/medication-reminder-list.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/medications.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/prescriptions.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/refills.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/reminders.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/reports.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/sleep-score.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/sleep-tracker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/smart-reminders.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/trends.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/vitals-log.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/vitals.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/health/wearables.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/add-policy.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/approval-pending.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/benefits-summary.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/claim-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/copay.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/coverage-check.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/network-providers.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/payment-split.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/policy-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/refund-status.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/submit-claim.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/challenges.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/leaderboard.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/referrals.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/rewards.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/map/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/baby-development.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/baby-growth.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/fetus-data.ts
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/maternity-setup.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/ovulation-tracker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/maternity/pregnancy-tracker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/breathing.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/crisis-support.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/meditation.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/mood-journal.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/self-assessment.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/therapist-match.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/notifications/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nursing/live-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nursing/nurse-profile.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nursing/service-details.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nursing/service-info.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/ai-meal-planner.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/ai-plan-builder.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/body-composition.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/body-target.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/calorie-analyzer.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/daily-tracker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/exercise-plan.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/food-scanner.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/log-meal.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/nutrition-plan.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/water-tracker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/offers/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/offers/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/orders/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/payments/failed.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/payments/failure.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/payments/processing.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/payments/success.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/barcode-scanner.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/broadcast-status.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/cart.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/chat-with-pharmacist.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/checkout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/custom-item.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/drug-not-found.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/filters.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/manual-order.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/medicine-compare.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/order-confirm.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/order-history.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/order-tracking.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/payment.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/pharmacist-chat.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/product-detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/product-search.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/reorder.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/rx-order.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/scan-prescription.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/waiting-for-pharmacy.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/pharmacy/wishlist.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/profile/addresses.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/profile/edit.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/profile/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/profile/insurance.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/programs/active.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/ai-analysis.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/passport.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/timeline.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/view-report.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/returns/detail.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/returns/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/returns/new-request.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reviews/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/room/[id].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/s/[type]/[slug].tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/search/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/services/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/about.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/data.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/feedback.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/help.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/language.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/notifications-settings.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/notifications.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/privacy.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/security.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/support-chat.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/terms.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/shared/location-picker.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/support/chat.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/support/ticket.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/voice/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wallet/cards.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wallet/hub.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wallet/topup.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wallet/transactions.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wallet/transfer.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/wearables/hub.tsx
--- patient navigation/layouts ---
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(onboarding)/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/consultations/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/_layout.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/articles/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/drug-scanner/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/family/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/map/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/notifications/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/offers/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/orders/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/profile/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reviews/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/search/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/services/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/settings/index.tsx
/home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/voice/index.tsx
```

## C.1 الفهرس الفعلي لشاشات Provider App وملفاته

```text
--- provider screens ---
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/App.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/__tests__/ClinicalWorkflows.test.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/index.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/api/catalogs.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/api/client.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/api/otp.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/api/provider.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/ContractModal.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/LocationPickerModal.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/OtpModal.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/SignatureCanvasModal.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/SuccessScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/icons.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/components/ui.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/constants/index.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/context/index.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/polyfills.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/ambulance/AmbulanceDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/ambulance/AmbulanceRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/auth/AuthScreens.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/auth/PendingDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/DoctorDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/DoctorOpsScreens.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/DoctorRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/FacilityInvitationsScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/components/DoctorHeader.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/components/DoctorQueueList.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/components/DoctorStatsRow.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/doctor/components/DoctorUrgentRequests.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/DischargeSummaryScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityAnnouncementsScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityAuditLogScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityInternalChatScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityInvitationScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityLeaveRequestsScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityPatientTrackerScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityProfileConfigScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityResourcesScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/facility/FacilityUnifiedCalendarScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/lab/LabDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/lab/LabQcActions.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/lab/LabRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/nursing/NursingDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/nursing/NursingFieldOps.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/nursing/NursingRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/pharmacy/PharmacyRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/radiology/RadiologyDashboard.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/radiology/RadiologyRegistration.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/BlueprintScreens.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/FleetScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/InsuranceRequestsScreen.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/RealScreens.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/RealScreensExtended.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/RegistrationSuccess.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/SharedScreens.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/shared/VideoCallRoom.tsx
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/security/Security.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/services/HttpClient.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/services/NotificationService.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/types/FacilityTypes.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/types/contracts.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/utils/PushNotifications.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/utils/api.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/utils/dates.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/utils/imageUrl.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/utils/notifications.ts
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/utils/api.ts
--- provider navigation/layouts ---
/home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/context/index.tsx
```

## D.1 الفهرس الفعلي لصفحات Admin Dashboard

```text
--- admin pages/components ---
/home/ubuntu/admin-build-work/web-admin/src/pages/_app.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/_document.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/ai-control.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/ambulance-fleet.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/analytics.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/audit-logs.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/catalog-manager.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/commissions.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/config-portal.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/dashboard.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/disputes.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/financial-ledger.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/fraud-monitoring.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/health-dashboard.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/image-suggestions.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/insurance-companies.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/insurance-queue.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/legal-policies.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/medicines-catalog.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/notification-center.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/nursing-portal.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/order-detail.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/payouts.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/pharmacy-procurement.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/provider-audits.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/provider-moderation.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/rbac.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/security.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/shortage-reports.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/sos-monitor.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/support-tickets.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/admin/users-management.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/api/hello.ts
/home/ubuntu/admin-build-work/web-admin/src/pages/articles/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/doctors/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/facilities/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/home-care-services/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/lab-services/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/login.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/medicines/index.tsx
/home/ubuntu/admin-build-work/web-admin/src/pages/s/[type]/[slug].tsx
--- admin package/routes/config ---
/home/ubuntu/admin-build-work/web-admin/tsconfig.json
/home/ubuntu/admin-build-work/web-admin/next.config.ts
/home/ubuntu/admin-build-work/web-admin/package.json
```
