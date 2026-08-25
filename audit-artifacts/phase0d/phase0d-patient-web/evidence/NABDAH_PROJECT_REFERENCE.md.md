# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `NABDAH_PROJECT_REFERENCE.md`
- **Member SHA-256:** `cfeda7126d562bbf26a35af5913e2507421939522445fd33d17b544a3665ada0`
- **Line count:** 1800
- **Read range:** `1-1800`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `28: | Patient App | تجربة المريض على الهاتف والويب حيث تدعمها Expo | React Native/Expo Router | تشمل عددًا كبيرًا من مسارات الصحة والحجز والدفع والاتصال |`
- `30: | Admin Dashboard | الإدارة، الرقابة، الكتالوج، المال، الأمن، المزودون، الدعم والتحليلات | Next.js Pages Router | production build تحقق سابقاً من 34 صفحة، وتبقى جولة RTL/تعدد لغوي مستقلة |`
- `39: Client screen`
- `57: مسارات المصادقة تشمل تسجيل دخول المريض، تسجيل دخول المزود من `/provider/auth/login`، وتسجيل دخول الإدارة مع 2FA/OTP عندما يتطلب الحساب ذلك. يجب عدم وضع JWT أو OTP في logs أو التقارير. حدود rate limiting جزء من العقد التشغيلي وليست مجرد واجه`
- `63: الوحدات المكتشفة تشمل المصادقة والمستخدمين، الحسابات والملفات، provider profiles، appointments/bookings، orders/pharmacy، payments/wallet/billing، labs، radiology، nursing/home care، hospital/facility، chat، realtime، livekit، push/notifica`
- `65: كل وحدة تتكون عادة من module/controller/service/schema/model/spec. الـcontroller يعرّف routes، الـguard يطبق authentication/roles، الـservice يطبق business policy، وMongo schemas/models تمثل البيانات. يجب استخدام هذه الطبقات بدلاً من وضع au`
- `81: order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersControl`
- `83: أثبت اختبار الإنتاج السابق وجود BOLA في النسخة القديمة: patient2 قرأ order patient1 بنتيجة 200 وألغاه بنتيجة 201. هذا order sandbox موثق بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`، قبل الاختبار `ESCALATED_TO_ADMIN/pending` وبعده `CANCEL`
- `87: توجد مسارات payment intent وwebhook وwallet/billing وpharmacy mutations وrefund. الاختبار المالي يجب أن يستخدم sandbox gateway، يتحقق من signature، يمنع replay/idempotency duplication، ويثبت ledger before/after. في آخر محاولة production ori`
- `104: تطبيق المريض مبني حول Expo Router، وفيه layouts ومجموعات مسارات متعددة. الشاشة ليست فقط ملفاً؛ يجب فهم ما تقرأه وما تكتبه، والحساب المستخدم، وحالة loading/empty/error، وربطها بالـdeep links والإشعارات.`
- `108: تشمل onboarding، auth/login/OTP، tabs الرئيسية، profile، settings، notifications، support، search، articles، offers، community، reviews، wallet، payments، loyalty، family، health records، reports، وservices. التهيئة تدعم كشف اللغة والثيم من`
- `116: مجموعة pharmacy وorders وdelivery وreturns وpayments تغطي البحث عن الدواء، السلة، checkout، اختيار delivery أو pickup، الموقع عند الحاجة، إنشاء الطلب، عروض الصيدليات/bids، التتبع، الدفع، والاسترجاع. القاعدة المهمة هي عدم إنشاء order قبل اكت`
### backend_consumers_or_contracts
- `27: | Backend + Database | المصادقة، الصلاحيات، العقود، الأعمال، التخزين، الإشعارات، الدفع، الدردشة، LiveKit، والعمليات | NestJS/TypeScript، MongoDB، Redis/BullMQ، WebSocket/LiveKit، FastAPI مكمّل | build وtests محلية ناجحة في آخر جولات، مع بنو`
- `57: مسارات المصادقة تشمل تسجيل دخول المريض، تسجيل دخول المزود من `/provider/auth/login`، وتسجيل دخول الإدارة مع 2FA/OTP عندما يتطلب الحساب ذلك. يجب عدم وضع JWT أو OTP في logs أو التقارير. حدود rate limiting جزء من العقد التشغيلي وليست مجرد واجه`
- `63: الوحدات المكتشفة تشمل المصادقة والمستخدمين، الحسابات والملفات، provider profiles، appointments/bookings، orders/pharmacy، payments/wallet/billing، labs، radiology، nursing/home care، hospital/facility، chat، realtime، livekit، push/notifica`
- `69: الموارد الرئيسية التي يجب أن يفهمها المطور هي user/account، provider profile، appointment، order، payment/ledger/wallet record، chat thread/message، call session، push token/log، notification، facility/hospital staff، lab/radiology sample أ`
- `75: ChatService يدير thread membership، الرسائل، read/delivered state، reactions، pin/edit/delete، المرفقات، والإشعارات. ChatGateway يتعامل مع Socket.IO events. بعد إصلاح P0، يوجد `chat.service.ts` مستقل لتجنب circular dependency، و`join_thread`
- `81: order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersControl`
- `140: تشمل auth/provider login، onboarding/profile، dashboard، availability/working hours، bookings/appointments، notifications، chat، calls، earnings/wallet/payout، settings/security، support، وprofile verification. يجب أن تأتي الحالات والأرقام `
- `189: | تسجيل provider | `/provider/auth/login` | role/provider_type صحيحان، profile approved، وصلاحياته محدودة |`
- `194: | order | checkout → create → tracking/cancel | owner/pharmacy/admin فقط، وledger متسق |`
- `214: | `5bb20b5` | عقود Phase 6 fail-closed ووثائقها وWebSocket CORS |`
- `224: 3. إعادة اختبار WebSocket بعد CORS fail-closed مع انتظار disconnect للـtoken المعدل ورفض Origin غير موثوق وعدم استقبال events.`
- `265: تطبيق المزود يضم shared screens وcomponents وapi/services/context/security. يجب قراءة provider type والpermission قبل اعتبار أي screen متاحة لكل المزودين.`
### auth_ownership
- `29: | Provider App | تجربة الطبيب والصيدلية والمختبر والأشعة والتمريض والمستشفى | React Native/Expo | سلوك الواجهة يتغير حسب provider type وpermissions |`
- `30: | Admin Dashboard | الإدارة، الرقابة، الكتالوج، المال، الأمن، المزودون، الدعم والتحليلات | Next.js Pages Router | production build تحقق سابقاً من 34 صفحة، وتبقى جولة RTL/تعدد لغوي مستقلة |`
- `34: المريض أو المزود أو المدير يتصل بالواجهة المناسبة، والواجهة تستخدم API contracts وauthentication/session state للوصول إلى backend. الخلفية تتحقق من JWT، الدور، نوع المزود، الملكية، حالة المورد، والقيود التشغيلية قبل القراءة أو التعديل. Mong`
- `40: -> auth/session + typed request`
- `42: -> guard: JWT + roles + provider_type + ownership`
- `53: الأدوار الرئيسية هي patient، provider، admin، مع provider types تشمل doctor، pharmacy، laboratory، radiology، nursing/home care، hospital، وغيرها. إصلاح FIX2 وحّد الأدوار الفعالة بحيث ينظر الحارس إلى `role` و`provider_type` وaliases مثل `la`
- `55: قاعدة الصلاحية ليست الدور فقط. يجب أيضاً فحص ملكية المورد، عضوية thread، ارتباط provider بالمريض أو الموعد، تعيين الصيدلية، حالة الطلب، وحالة العملية. لذلك فإن `admin` ليس بديلاً عن تدقيق ownership في كل mutation، وpatient2 لا يجوز له قراءة`
- `57: مسارات المصادقة تشمل تسجيل دخول المريض، تسجيل دخول المزود من `/provider/auth/login`، وتسجيل دخول الإدارة مع 2FA/OTP عندما يتطلب الحساب ذلك. يجب عدم وضع JWT أو OTP في logs أو التقارير. حدود rate limiting جزء من العقد التشغيلي وليست مجرد واجه`
- `65: كل وحدة تتكون عادة من module/controller/service/schema/model/spec. الـcontroller يعرّف routes، الـguard يطبق authentication/roles، الـservice يطبق business policy، وMongo schemas/models تمثل البيانات. يجب استخدام هذه الطبقات بدلاً من وضع au`
- `69: الموارد الرئيسية التي يجب أن يفهمها المطور هي user/account، provider profile، appointment، order، payment/ledger/wallet record، chat thread/message، call session، push token/log، notification، facility/hospital staff، lab/radiology sample أ`
- `77: Realtime Gateway ينقل typing وmessage/call signaling، لكن النقل لا يساوي authorization: يجب أن تكون العضوية والجلسة الحقيقية معروفة قبل relay. LiveKitService يشتق أطراف المكالمة من appointment/call session، ويفرض ownership في initiate/join/`
- `81: order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersControl`
### state_transitions
- `34: المريض أو المزود أو المدير يتصل بالواجهة المناسبة، والواجهة تستخدم API contracts وauthentication/session state للوصول إلى backend. الخلفية تتحقق من JWT، الدور، نوع المزود، الملكية، حالة المورد، والقيود التشغيلية قبل القراءة أو التعديل. Mong`
- `46: -> client state, navigation, notification, or audit record`
- `69: الموارد الرئيسية التي يجب أن يفهمها المطور هي user/account، provider profile، appointment، order، payment/ledger/wallet record، chat thread/message، call session، push token/log، notification، facility/hospital staff، lab/radiology sample أ`
- `75: ChatService يدير thread membership، الرسائل، read/delivered state، reactions، pin/edit/delete، المرفقات، والإشعارات. ChatGateway يتعامل مع Socket.IO events. بعد إصلاح P0، يوجد `chat.service.ts` مستقل لتجنب circular dependency، و`join_thread`
- `77: Realtime Gateway ينقل typing وmessage/call signaling، لكن النقل لا يساوي authorization: يجب أن تكون العضوية والجلسة الحقيقية معروفة قبل relay. LiveKitService يشتق أطراف المكالمة من appointment/call session، ويفرض ownership في initiate/join/`
- `81: order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersControl`
- `83: أثبت اختبار الإنتاج السابق وجود BOLA في النسخة القديمة: patient2 قرأ order patient1 بنتيجة 200 وألغاه بنتيجة 201. هذا order sandbox موثق بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`، قبل الاختبار `ESCALATED_TO_ADMIN/pending` وبعده `CANCEL`
- `87: توجد مسارات payment intent وwebhook وwallet/billing وpharmacy mutations وrefund. الاختبار المالي يجب أن يستخدم sandbox gateway، يتحقق من signature، يمنع replay/idempotency duplication، ويثبت ledger before/after. في آخر محاولة production ori`
- `98: | error-code registry | stable codes، HTTP mapping، localization، correlation، عدم تسريب stack/PII | مسودة مراجعة وغير مفعلة |`
- `104: تطبيق المريض مبني حول Expo Router، وفيه layouts ومجموعات مسارات متعددة. الشاشة ليست فقط ملفاً؛ يجب فهم ما تقرأه وما تكتبه، والحساب المستخدم، وحالة loading/empty/error، وربطها بالـdeep links والإشعارات.`
- `112: مجموعة consultations تشمل دليل الطبيب، تفاصيل الطبيب، اختيار نوع الاستشارة، فتحات المواعيد، clinic location، video call، chat-with-doctor، incoming call، وسجل/تفاصيل الاستشارة. المسار الصحيح هو اختيار provider حقيقي، جلب slots من backend، إ`
- `140: تشمل auth/provider login، onboarding/profile، dashboard، availability/working hours، bookings/appointments، notifications، chat، calls، earnings/wallet/payout، settings/security، support، وprofile verification. يجب أن تأتي الحالات والأرقام `
### payment_insurance_relevance
- `49: في أي تعديل جديد يجب أن يبقى هذا التسلسل واضحاً. لا يجوز أن تنشئ الواجهة نجاحاً محلياً أو order/payment/call وهمياً إذا لم يعطِ backend معرفاً وحالة حقيقية.`
- `63: الوحدات المكتشفة تشمل المصادقة والمستخدمين، الحسابات والملفات، provider profiles، appointments/bookings، orders/pharmacy، payments/wallet/billing، labs، radiology، nursing/home care، hospital/facility، chat، realtime، livekit، push/notifica`
- `69: الموارد الرئيسية التي يجب أن يفهمها المطور هي user/account، provider profile، appointment، order، payment/ledger/wallet record، chat thread/message، call session، push token/log، notification، facility/hospital staff، lab/radiology sample أ`
- `77: Realtime Gateway ينقل typing وmessage/call signaling، لكن النقل لا يساوي authorization: يجب أن تكون العضوية والجلسة الحقيقية معروفة قبل relay. LiveKitService يشتق أطراف المكالمة من appointment/call session، ويفرض ownership في initiate/join/`
- `83: أثبت اختبار الإنتاج السابق وجود BOLA في النسخة القديمة: patient2 قرأ order patient1 بنتيجة 200 وألغاه بنتيجة 201. هذا order sandbox موثق بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`، قبل الاختبار `ESCALATED_TO_ADMIN/pending` وبعده `CANCEL`
- `87: توجد مسارات payment intent وwebhook وwallet/billing وpharmacy mutations وrefund. الاختبار المالي يجب أن يستخدم sandbox gateway، يتحقق من signature، يمنع replay/idempotency duplication، ويثبت ledger before/after. في آخر محاولة production ori`
- `108: تشمل onboarding، auth/login/OTP، tabs الرئيسية، profile، settings، notifications، support، search، articles، offers، community، reviews، wallet، payments، loyalty، family، health records، reports، وservices. التهيئة تدعم كشف اللغة والثيم من`
- `116: مجموعة pharmacy وorders وdelivery وreturns وpayments تغطي البحث عن الدواء، السلة، checkout، اختيار delivery أو pickup، الموقع عند الحاجة، إنشاء الطلب، عروض الصيدليات/bids، التتبع، الدفع، والاسترجاع. القاعدة المهمة هي عدم إنشاء order قبل اكت`
- `128: توجد مسارات maternity للحمل، nutrition للتغذية، mental-health، ai وai-assistant، drug-scanner، wearables، programs، health، reports، family، community، articles، loyalty، وoffers. هذه الميزات يجب تقسيمها إلى: مصدر backend حقيقي، مصدر محلي ل`
- `140: تشمل auth/provider login، onboarding/profile، dashboard، availability/working hours، bookings/appointments، notifications، chat، calls، earnings/wallet/payout، settings/security، support، وprofile verification. يجب أن تأتي الحالات والأرقام `
- `171: | المال | financial-ledger، payouts، order-detail |`
- `174: | التأمين والسياسات | insurance-companies، insurance-queue، legal-policies |`
### error_empty_loading_retry_cancel
- `75: ChatService يدير thread membership، الرسائل، read/delivered state، reactions، pin/edit/delete، المرفقات، والإشعارات. ChatGateway يتعامل مع Socket.IO events. بعد إصلاح P0، يوجد `chat.service.ts` مستقل لتجنب circular dependency، و`join_thread`
- `81: order يمر عادة من الإنشاء إلى حالة تشغيلية مثل pending أو escalated أو assigned ثم transitions أخرى حتى delivered/cancelled. cancel وtracking وread/update ليست متاحة لأي مستخدم يملك المعرف. الإصلاح الأخير جعل `OrdersService` و`OrdersControl`
- `83: أثبت اختبار الإنتاج السابق وجود BOLA في النسخة القديمة: patient2 قرأ order patient1 بنتيجة 200 وألغاه بنتيجة 201. هذا order sandbox موثق بالمعرف `91047ef2-ad36-422a-a184-629693e7c729`، قبل الاختبار `ESCALATED_TO_ADMIN/pending` وبعده `CANCEL`
- `98: | error-code registry | stable codes، HTTP mapping، localization، correlation، عدم تسريب stack/PII | مسودة مراجعة وغير مفعلة |`
- `104: تطبيق المريض مبني حول Expo Router، وفيه layouts ومجموعات مسارات متعددة. الشاشة ليست فقط ملفاً؛ يجب فهم ما تقرأه وما تكتبه، والحساب المستخدم، وحالة loading/empty/error، وربطها بالـdeep links والإشعارات.`
- `192: | دردشة | thread membership → send/read/delivered | foreign user مرفوض وoffline replay مطابق للعقد |`
- `194: | order | checkout → create → tracking/cancel | owner/pharmacy/admin فقط، وledger متسق |`
- `226: 5. مراجعة واعتماد عقود consent وQR وemergency location وerror-code registry؛ تبقى كلها fail-closed وغير مفعلة.`
- `233: قبل إضافة feature، حدد actor وresource وstate machine والعقد وقواعد ownership. افحص المكونات الموجودة قبل إعادة البناء. اكتب الاختبار السلبي قبل mutation الحساس. لا تضف mock data أو success placeholder. لا تضع الأسرار في Git أو logs. استخدم`
- `246: 6. `audit-artifacts/ERROR_CODE_REGISTRY_REVIEW_DRAFT_20260817.md` — مسودة سجل أكواد الأخطاء.`
- `261: تُقرأ الشاشات بحسب Expo Router path. المسار بين قوسين يعني مجموعة layout أو route group. على المبرمج تتبع كل شاشة إلى API call، auth state، mutation، loading/error/empty، deep link، وtranslation key.`
- `727: /home/ubuntu/nabdah-live-extracted/backend/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
