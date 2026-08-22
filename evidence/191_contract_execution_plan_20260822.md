# خطة تنفيذ الرحلات المحجوبة وعقودها — للمراجعة فقط

**الحالة:** مسودة تنفيذية لا تتضمن أي شفرة أو تغيير لمستودع الويب أو الموبايل.  
**المرجع العقدي الملزم:** `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md`، والنسخة المقروءة في مساحة التدقيق: `evidence/latest_main_contracts/PATIENT_WEB_CONTRACT_PACK_V1.md`.  
**قيد الفرع:** يبقى `agent/web-complete-20260821` دون دمج إلى `main`.  
**حد المالك:** هذه الخطة تخص **ويب المريض فقط**. لا تعديل أو مراجعة أو إيداع في مستودع React Native/Expo.

> **تصحيح نطاقي مهم:** رقم **72** في مصفوفة التكافؤ هو عدد *أسطح الموبايل المفقودة كلياً من الويب*، لا عدد mutations جاهزة للبناء. عقود الحزمة الحالية تغطي جزءاً فقط من هذه الأسطح، كما تغطي عمليات كتابة محجوبة داخل شاشات ويب موجودة مثل السلة والملف والقياسات. لذلك تفصل هذه الخطة بين: (أ) الـ72 سطحاً، و(ب) عمليات الويب المتعاقد عليها التي تُنفذ بعد نشر الباك إند.

## 1. قواعد البدء غير القابلة للتفاوض

لن يبدأ أي بناء فور «نشر الباك إند» بالاسم فقط. يجب أن يصل إصدار Sandbox قابل للوصول وموسوم بإصدار/commit، وأن تنشر معه OpenAPI المطابق فعلياً. تُجرى مقارنة تلقائية بين OpenAPI والحزمة قبل كتابة أول parser أو واجهة. أي اختلاف في DTO أو status أو security أو idempotency يحوّل العنصر إلى **حظر تعاقدي**، لا إلى اجتهاد واجهة.

| شرط البدء | دليل القبول قبل أول دفعة | نتيجة غيابه |
|---|---|---|
| OpenAPI منشور ومؤرخ لنفس نشر Sandbox | رابط specification، رقم إصدار/commit، وفرق عقدي مسجل مقابل الحزمة | لا بناء للرحلة المخالفة. |
| حسابا Sandbox مريضان منفصلان وبيانات ملكية مرجعية | هوية المالك والغريب ومورد مملوك لكل منهما، مع طريقة تنظيف متفق عليها | لا اختبار owner/stranger ولا mutation حساسة. |
| سياسة idempotency لكل mutation | هيدر مقبول، TTL، شكل replay، وcode ثابت للتعارض/الانتهاء | لا زر تنفيذ ولا إعادة تلقائية. |
| سجل أخطاء ثابت | `{ message, code, statusCode }` لكل فشل، بلا نصوص عمل حرجة | لا ترجمة أو عرض خطأ نهائي. |
| مبدأ الموارد الحساسة | Cookies `httpOnly` فقط، وعدم وضع PII/رموز في URL أو التخزين المحلي | يوقف الدمج. |

تُطبق قاعدة الحزمة على الملكية: المالك يحصل على النجاح المسموح، والغريب يحصل على `404` للمورد المملوك، وغير المصادق على `401`، باستثناء استثناءات الدور الموثقة صراحةً مثل صلاحيات مجموعة العائلة. تمنع الواجهة التكرار العرضي لكنها لا تثق به وحده؛ الخادم هو مصدر صحة idempotency والملكية.

## 2. بروتوكول اختبار موحد لكل mutation

لكل صف mutation أدناه تُنشأ **أربعة** اختبارات، لا ثلاثة فقط: نجاح المالك، فشل وظيفي موثق، عزل المالك/غير المصادق، ثم إعادة استخدام المفتاح نفسه. يطلب المستخدم على وجه الخصوص نجاحاً وفشلاً وreplay؛ ويظل اختبار الملكية إلزاماً موروثاً من الحزمة.

| الحالة | الإجراء | القبول |
|---|---|---|
| نجاح | تنفيذ DTO صحيح من حساب المالك مع `Idempotency-Key` فريد | status المتعاقد عليه وDTO مقيد، وتحديث واجهة مؤكد بالخادم. |
| فشل | إدخال غير صالح أو انتقال حالة غير مسموح أو slot/mخزون/قيد عمل متعمد | code مترجم، حالة واجهة صادقة، ولا optimistic success ولا قيمة بديلة. |
| ملكية/مصادقة | المورد نفسه من حساب Sandbox آخر ثم بلا جلسة | `404` للغريب أو الاستثناء الموثق، و`401` لغير المصادق؛ لا كشف وجود المورد. |
| replay | إرسال **نفس** body و**نفس** المفتاح مرتين | نتيجة أصلية واحدة؛ في العمليات التي تنص الحزمة عليها صراحةً: `200` و`idempotent_replay:true`، ومن دون إنشاء طلب/حجز/رسالة/سجل ثان. |

**تعزيز مطلوب قبل التنفيذ:** تنص الحزمة صراحةً على idempotency للحجوزات والماليات، لكن هذه الخطة تفرض اختبار replay على **كل mutation ويب**. إن لم ينشر الباك إند دعماً موحداً لهيدر `Idempotency-Key` في `PATCH` و`DELETE` وPOST غير المالي، يضاف ذلك إلى OpenAPI أولاً أو يعرّف عقد replay طبيعي دقيق ومختبر؛ لا نخمن السلوك من HTTP method.

## 3. مصفوفة الـ72 سطحاً المفقوداً من الويب

الحالة المصدرية لكل الصفوف أدناه هي `MISSING / FEATURE_GAP_REQUIRES_CONTRACT_REVIEW` في `110_web_mobile_atomic_parity_v2.tsv`. «لا عقد في الحزمة» لا يعني أن الرحلة ستُبنى لاحقاً تلقائياً؛ يعني أنها **خارج دفعات التنفيذ** إلى أن يوافق المنتج والطب والقانون والباك إند على عقد مستقل.

| # | رحلة الموبايل المفقودة | بند الحزمة/حالة العقد | DTO المتوقع الآن | نجاح/فشل/replay في الخطة |
|---:|---|---|---|---|
| 1 | `(auth)/forgot-password` | §1 `POST /auth/password/forgot` و`/reset` | forgot: `{identifier}`؛ reset: `{reset_token,new_password}` | لا كشف وجود الحساب؛ reset ناجح مرة واحدة، `401` للرمز المنتهي/المستهلك؛ يعاد اختبار request لاختلاف الرد لا لإثبات وجود الحساب. |
| 2 | `(auth)/otp` | §1 `otp/request` و`otp/verify` و`session/exchange` | request `{identifier}`؛ verify `{identifier,code,device_id?}`؛ exchange `{exchange_token}` | 200 قناة/انتهاء، ثم cookie فقط؛ `401 otp_invalid`، `410 otp_expired`، `429` قفل؛ replay للـexchange يرفض الرمز المستهلك. |
| 3 | `(auth)/privacy` | §1 register consents فقط؛ وثيقة/privacy endpoint غير موجود | لا DTO كافٍ | لا بناء حتى عقد policy/version ومحتوى قانوني بست لغات. |
| 4 | `(auth)/provider-info` | لا عقد | لا DTO | حظر؛ يلزم مصدر مزود/جهة موثق. |
| 5 | `(auth)/register` | §1 `POST /auth/register` | `{name,identifier,password,locale,consents:[{policy_id,version}]}` | `201 {registered:true}` وبدء OTP؛ فشل allowlist/consent؛ replay لا ينشئ حساباً ثانياً. |
| 6 | `(auth)/reset-password` | §1 forgot/reset | `{reset_token,new_password}` | نجاح reset لمرة واحدة؛ token منتهي/مستهلك؛ replay يرفض ولا يغير كلمة المرور ثانية. |
| 7 | `(auth)/terms` | §1 consents مرجعية فقط؛ لا عقد جلب شروط | لا DTO كافٍ | حظر حتى endpoint وثائق قانونية versioned ومراجعة قانونية. |
| 8 | `(auth)/welcome` | لا عقد | لا DTO | رحلة عرض فقط تحتاج قرار منتج، لا mutation. |
| 9 | `(onboarding)/index` | لا عقد | لا DTO | حظر حتى تعريف حالة onboarding server-authoritative. |
| 10 | `(onboarding)/language` | §2 `PATCH /users/me` للـ`locale` بعد الجلسة | `{locale}` ضمن allowlist | نجاح DTO عرض مقيد؛ `400` لقيمة غير مسموحة؛ replay لا ينشئ تغييراً إضافياً. |
| 11 | `(onboarding)/permissions` | لا عقد لتصريح OS أو حفظ تفضيل | لا DTO | حظر؛ يحتاج فصل permission المحلي عن consent الخادمي. |
| 12 | `ai/chat-doctor` | لا عقد AI/سريري | لا DTO | حظر طبي/قانوني؛ لا دردشة تشخيصية مفترضة. |
| 13 | `ai/monthly-report` | لا عقد | لا DTO | حظر؛ يحتاج مصادر بيانات، تفسير سريري، وموافقة. |
| 14 | `ai/prescription-translator` | لا عقد | لا DTO | حظر؛ لا ترجمة جرعات أو بدائل دواء مولدة. |
| 15 | `ai/skin-analysis` | لا عقد؛ مثبت كحاجز موافقة/احتفاظ | لا DTO | حظر حتى نموذج سريري typed وموافقة واحتفاظ وتصعيد. |
| 16 | `ai/symptom-checker` | لا عقد | لا DTO | حظر؛ يحتاج triage حوكمي وإخلاء مسؤولية ومسار طوارئ. |
| 17 | `ai/symptom-timeline` | لا عقد | لا DTO | حظر حتى DTO تاريخ أعراض ومصدره وملكيته. |
| 18 | `ai/triage` | لا عقد | لا DTO | حظر طبي عالي الخطورة. |
| 19 | `ai-assistant` | لا عقد | لا DTO | حظر حتى الحدود والاحتفاظ والمراقبة والتصعيد. |
| 20 | `community/hub` | لا عقد مجتمع | لا DTO | حظر حتى moderation/role/reporting وprivacy. |
| 21 | `community/post-detail` | لا عقد مجتمع | لا DTO | حظر حتى عقد قراءة/تعليق/إبلاغ وملكية. |
| 22 | `drug-scanner/index` | لا عقد OCR/دواء | لا DTO | حظر حتى موافقة صورة ووصفة/صيدلي وسجل تحقق. |
| 23 | `emergency/tracking` | لا عقد تتبع طارئ | لا DTO | حظر؛ لا تمثيل لحالة طوارئ أو موقع بلا عقد وسلامة. |
| 24 | `loyalty/challenges` | لا عقد loyalty | لا DTO | حظر حتى نقاط/ledger/claim ذرية ومراجعة شروط. |
| 25 | `loyalty/hub` | لا عقد loyalty | لا DTO | الحظر نفسه. |
| 26 | `loyalty/leaderboard` | لا عقد loyalty/privacy | لا DTO | حظر حتى إخفاء الهوية وموافقة المنافسة. |
| 27 | `loyalty/referrals` | لا عقد loyalty/referral | لا DTO | حظر حتى referral token مملوك وآمن ومنتهي. |
| 28 | `loyalty/rewards` | لا عقد loyalty | لا DTO | حظر حتى stock/points/ledger/claim atomic. |
| 29 | `map/index` | لا عقد خريطة/موقع | لا DTO | حظر حتى source/consent وغايات الموقع. |
| 30 | `maternity/baby-development` | لا عقد أمومة | لا DTO | حظر طبي حتى schema ومراجعة سريرية. |
| 31 | `maternity/baby-growth` | لا عقد أمومة | لا DTO | الحظر نفسه. |
| 32 | `maternity/fetus-data` | لا عقد أمومة | لا DTO | الحظر نفسه. |
| 33 | `maternity/hub` | لا عقد أمومة | لا DTO | الحظر نفسه. |
| 34 | `maternity/maternity-setup` | لا عقد أمومة | لا DTO | الحظر نفسه. |
| 35 | `maternity/ovulation-tracker` | لا عقد أمومة/خصوبة | لا DTO | حظر حتى موافقة حساسة واحتفاظ وسلامة. |
| 36 | `maternity/pregnancy-tracker` | لا عقد أمومة | لا DTO | الحظر نفسه. |
| 37 | `nutrition/ai-meal-planner` | لا عقد nutrition/AI | لا DTO | حظر حتى بيانات غذائية ومراجعة طبية. |
| 38 | `nutrition/ai-plan-builder` | لا عقد nutrition/AI | لا DTO | الحظر نفسه. |
| 39 | `nutrition/body-composition` | لا عقد nutrition | لا DTO | حظر حتى مصادر القياس ووحداته. |
| 40 | `nutrition/body-target` | لا عقد nutrition | لا DTO | حظر حتى goals/treatment safeguards. |
| 41 | `nutrition/calorie-analyzer` | لا عقد nutrition | لا DTO | حظر حتى مصادر التحليل وحدود التوصية. |
| 42 | `nutrition/daily-tracker` | لا عقد nutrition log | لا DTO | حظر حتى DTO سجل وموافقة واحتفاظ. |
| 43 | `nutrition/exercise-plan` | لا عقد nutrition | لا DTO | حظر حتى حدود صحية ومصدر الخطة. |
| 44 | `nutrition/food-scanner` | لا عقد OCR/food | لا DTO | حظر حتى موافقة صورة ودقة وتحقق. |
| 45 | `nutrition/hub` | لا عقد nutrition | لا DTO | الحظر نفسه. |
| 46 | `nutrition/index` | لا عقد nutrition | لا DTO | الحظر نفسه. |
| 47 | `nutrition/log-meal` | لا عقد nutrition log | لا DTO | الحظر نفسه. |
| 48 | `nutrition/nutrition-plan` | لا عقد nutrition | لا DTO | الحظر نفسه. |
| 49 | `nutrition/water-tracker` | لا عقد nutrition log | لا DTO | الحظر نفسه. |
| 50 | `offers/[id]` | لا عقد عروض مملوكة/عامة | لا DTO | حظر حتى eligibility ومدة وقواعد سعر. |
| 51 | `offers/index` | لا عقد عروض | لا DTO | الحظر نفسه. |
| 52 | `payments/failed` | §6 checkout يعرّف `402` فقط؛ لا عقد UI return-state | `{message,code,statusCode}` | تبنى بعد تعريف failure correlation الآمن؛ لا نجاح بديل أو تسريب دفع. |
| 53 | `payments/failure` | §6 checkout، كما سبق | `{message,code,statusCode}` | الحالة نفسها. |
| 54 | `payments/processing` | §6 checkout يعرّف `payment_intent?`؛ polling/return غير محدد | `{order_id,status,total,payment_intent?}` | حظر حتى status contract؛ لا polling عشوائي. |
| 55 | `payments/success` | §6 checkout + webhook خادمي فقط | `{order_id,status,total}` | تبنى فقط عندما يؤكد server حالة الدفع؛ replay يعيد نفس order لا دفعاً جديداً. |
| 56 | `programs/active` | لا عقد برامج | لا DTO | حظر حتى تعريف برنامج ومشاركة. |
| 57 | `returns/detail` | لا عقد returns | لا DTO | حظر حتى state machine وملكية. |
| 58 | `returns/hub` | لا عقد returns | لا DTO | الحظر نفسه. |
| 59 | `returns/new-request` | لا عقد returns mutation | لا DTO | حظر حتى DTO وidempotency وقواعد صيدلية. |
| 60 | `reviews/index` | لا عقد مراجعات | لا DTO | حظر حتى eligibility/moderation. |
| 61 | `room/[id]` | §9 token دردشة فقط؛ لا عقد room UI عام | token `{provider,token,room}` غير منشور للـroom | حظر حتى يربط العقد room بالمشارك وTTL والـcapabilities. |
| 62 | `s/[type]/[slug]` | لا عقد generic share | لا DTO | حظر حتى allowlist public/owner-safe. |
| 63 | `search/index` | §11 catalog fragments فقط، لا search عام | لا DTO عام | حظر حتى contract بحث public/خاص وحدود indexing. |
| 64 | `services/index` | §11 `/public/specialties` جزئي فقط | `{published_provider_count}` ضمن DTO التخصص | لا يبنى hub خدمات حتى يحدد OpenAPI جميع الخدمة/التصفية. |
| 65 | `shared/location-picker` | §6 يستهلك `address_id` لكن لا عقد عناوين | لا DTO عنوان | حظر حتى CRUD العنوان/الموقع/mapping وconsent. |
| 66 | `support/ticket` | لا عقد دعم | لا DTO | حظر حتى ticket lifecycle وprivacy. |
| 67 | `voice/index` | لا عقد صوت/نسخ/احتفاظ | لا DTO | حظر حتى consent واحتفاظ وتفريغ. |
| 68 | `wallet/cards` | لا عقد محفظة | لا DTO | حظر مالي حتى PCI/مزود/ملكية. |
| 69 | `wallet/hub` | لا عقد محفظة | لا DTO | الحظر نفسه. |
| 70 | `wallet/topup` | لا عقد محفظة/top-up | لا DTO | حظر مالي؛ لا payment intent مفترض. |
| 71 | `wallet/transactions` | لا عقد محفظة/ledger | لا DTO | حظر حتى ledger مملوك وغير قابل للتلاعب. |
| 72 | `wallet/transfer` | لا عقد محفظة/تحويل | لا DTO | حظر مالي عالٍ حتى recipient/limits/AML/idempotency. |

## 4. عمليات ويب قائمة لكن محجوبة بعقود الحزمة

هذه هي الرحلات التي يجب أن تبدأ بها الدفعات بعد وصول OpenAPI؛ وهي لا تعد ضمن رقم 72 بالضرورة، لكنها مطلوبة لإزالة «محجوب بانتظار عقد» من الأسطح القائمة. كل صف يحدد DTO العقدي، ثم الاختبارات الأربعة في القسم 2.

| الدفعة | الرحلة / endpoint | بند الحزمة | DTO النجاح المقيد | الفشل والتكرار المطلوبان |
|---|---|---|---|---|
| A | OTP request | §1 | `{otp_sent,channel,expires_in}` | 429 بعد الحد؛ نفس الرد لغير المسجل؛ لا كشف حساب. |
| A | OTP verify | §1 | `{exchange_token,expires_in}` | 401 invalid، 410 expired، 429 lock؛ لا عرض token للمستخدم. |
| A | session exchange | §1 | `{authenticated:true}` وcookies httpOnly | 401 لمستهلك/منتهي؛ replay يرفض الاستعمال الثاني. |
| A | register | §1 | `{registered:true}` | 4xx للـallowlist/consents؛ replay لا يكرر الحساب. |
| A | forgot/reset | §1 | response غير كاشف ثم reset one-time | 401 للرمز؛ replay يرفض. |
| B | تعديل الملف `PATCH /users/me` | §2 | `{display_name,avatar_url,locale,member_since,health_id}` | 400 لحقل خارج allowlist؛ replay يثبت النتيجة نفسها بلا side effect ثان. |
| B | health ID | §2 read-only | `{health_id,qr_payload,issued_at}` | 401؛ QR قصير 5 دقائق، لا replay mutation. |
| B | vitals create/update/delete | §3 | POST `{id}`؛ GET `{items:[...]}` | 4xx validation و404 stranger؛ replay لا ينشئ قراءة أو حذفاً ثانياً. |
| B | wearable link/unlink | §3 | link response موثق من OpenAPI أو 501 صادق | 501 provider-disabled و404 stranger؛ replay بلا رابط مكرر. |
| B | reminders create/update/delete/log | §4 | `201` للإنشاء وDTO منشور للبقية | 4xx schedule/status و404 stranger؛ replay لا يضيف reminder/log ثانياً. |
| B | medication refill | §4 | مسودة طلب DTO منشور | فشل دوائي/ملكية؛ replay ينشئ مسودة واحدة فقط. |
| C | invite family | §5 | `{invite_sent:true,expires_in:86400}` | channel/target invalid؛ replay لا يرسل دعوات متعددة. |
| C | join family | §5 | success DTO منشور | 410 expired، 409 already member؛ replay يبقي عضواً واحداً. |
| C | permissions | §5 | DTO member محدود | 403 للعضو غير المالك، 404 unknown؛ replay لا يغير twice. |
| C | remove/leave family | §5 | DTO منشور أو 204 | role/state error؛ replay soft-removes مرة واحدة فقط. |
| D | cart add/update/delete | §6 | DTO cart منشور؛ input `{medicine_id|manual_name,quantity}` | PENDING_REVIEW للـmanual؛ stock/validation؛ **يلزم نشر idempotency صريح لكلها**. |
| D | checkout | §6 | `{order_id,status,total,payment_intent?}` | 409 stock، 422 coupon، 402 payment؛ replay `200,idempotent_replay:true` دون طلب/دفع ثان. |
| D | reorder/cancel | §6 | cart/order DTO منشور | 404 stranger و409 cancel state؛ replay مسودة/إلغاء واحد. |
| E | unified booking create | §7 | `{booking_id,status}` | 409 slot_taken؛ lock 10 دقائق؛ replay يعيد نفس الحجز. |
| E | cancel/reschedule booking | §7 | DTO booking منشور | 404 stranger، 409/24h rule؛ replay انتقال حالة واحد. |
| E | call token | §7 read-only | `{provider,token,room}` | 401/404 وخارج نافذة ±15min؛ token لا يسجل في URL. |
| E | home-care detail | §8 read-only | `{id,status,service_type,scheduled_at,nurse,timeline}` | 404 stranger؛ لا mutation. |
| F | prescription detail | §9 read-only | `{id,status,items,issued_at,doctor}` | 404 stranger؛ لا diagnosis/notes داخلية. |
| F | chat send/read | §9 | send `{body,media_ids?}`؛ read `{up_to_message_id}` | 404 non-participant؛ replay لا ينشئ رسالة/قراءة مزدوجة. |
| F | chat realtime token | §9 read-only | `{provider,token,room}` | 404 non-participant وTTL 10min؛ لا token في URL. |
| F | media upload/url | §10 | upload DTO منشور، URL signed 15min | purpose/owner_binding invalid؛ لا رابط عام؛ replay upload يحدد من OpenAPI. |
| F | bookmark add/remove | §12 | DTO bookmark منشور | 404 stranger؛ replay لا يكرر bookmark. |
| F | notification settings | §12 | allowlisted settings DTO منشور | 400 للـschema غير صالح؛ replay value stable. |
| F | revoke session | §12 | 204/DTO منشور | 404 not-owned؛ replay لا يضر جلسة أخرى. |

## 5. ترتيب الدفعات بعد النشر

| دفعة | مجال التنفيذ | لا يبدأ إلا إذا | معيار الخروج قبل الدفعة التالية |
|---|---|---|---|
| 0 | عقد وبيئة | OpenAPI وSandbox accounts والـfixtures والسياسات جاهزة | فرق عقدي نظيف؛ suite عقود جديدة تلتقط status/DTO/header/replay. |
| A | الهوية والجلسة | §1 مطابق فعلياً | OTP/register/reset/exchange: اختبارات نجاح/فشل/ملكية/replay، وتحقق أن الرموز لا تظهر في body أو URL. |
| B | الملف والقياسات والتذكيرات | §2–4 مكتملة وidempotency موسع | parser/allowlist، اختبارات sandbox، SSR، وواجهة بست لغات. |
| C | العائلة | §5 مكتمل وfixture owner/member متاح | دعوة/انضمام/صلاحيات/مغادرة خضراء مع الاستثناء 403 الموثق. |
| D | السلة والطلبات والدفع | §6 + payment test account صالح | لا استخدام حساب Moyasar حي؛ checkout/reorder/cancel/replay، pending/ambiguity صادق. |
| E | الحجز والرعاية المنزلية | §7–8 وslot fixture قابل للتنظيف | lock/slot conflict/cancel-reschedule/call token واختبارات الملكية. |
| F | وصفة/دردشة/وسائط/إشعارات/مقالات | §9–12 مطابق | participant/owner safety وsigned URLs وreplay لجميع writes. |
| G | بقية أسطح parity | عقد مستقل **لكل** مجموعة من الـ72 | لا تنفيذ لعنصر من §3 إلا بعد التحول من «لا عقد» إلى OpenAPI مراجع. |

لكل دفعة: تكتب الاختبارات أولاً، ثم parser/allowlist، ثم BFF، ثم UI وحالات loading/empty/error، ثم تحقق Sandbox. لا تدفع الدفعة حتى تنجح `pnpm check && pnpm test && pnpm build`، وتوثق SHA وبصمات الأدلة. لا يمر عنصر إلى الدفعة التالية عند فشل واحد أو عند غموض نتيجة mutation.

## 6. لغة حركة موحدة مستخلصة من المراجع المرئية

فُحصت روابط Facebook الثلاثة كمراجع عامة. لا تتاح ملفات MP4 مباشرة، ولا تسمح أداة التحليل المتاحة بتحليل رابط Facebook؛ لذلك هذه مبادئ تطبيقية **وليست نسخاً frame-perfect**. الملاحظات المسجلة في `motion_reference_observations_20260822.md` تؤكد العناصر البصرية فقط: بطل واضح، محتوى ثانوي متتابع، بطاقات موجزة، وزر إجراء واحد بارز.

| عنصر | مواصفة ويب وموبايل موحدة بعد الموافقة | حد السلامة الصحية والوصولية |
|---|---|---|
| انتقال صفحة عادي | opacity من 0 إلى 1 مع إزاحة inline مقدارها 8px، 180ms، easing `cubic-bezier(0.23,1,0.32,1)`؛ تعكس الإزاحة منطقياً في RTL | لا يؤخر المحتوى الأساسي أو رسالة خطأ؛ فوري مع reduced motion. |
| ترويسة/بطل | البطل يظهر أولاً؛ المحتوى الأدنى بعده بفاصل 40ms لكل عنصر حتى 4 عناصر | لا صور أو حركة زخرفية في نتائج صحية أو تحذيرات. |
| بطاقات القائمة | opacity + translate block 8px، 160–200ms، stagger 35–50ms، حد 6 عناصر | لا حركة عند pagination أو بحث متكرر إن سببت ارتعاشاً. |
| الأيقونات | لا دوران متكرر؛ fade/scale من 0.96 إلى 1 خلال 140ms فقط عند دخول بطاقة أو نجاح مؤكد | لا تعتمد المعلومة على الحركة، وتبقى icon aria-hidden أو بتسمية صريحة. |
| زر الإجراء | active scale `0.98` لمدة 120ms، disabled/loading واضح | زر booking/payment يظل disabled أثناء الطلب؛ لا success animation قبل تأكيد الخادم. |
| نجاح mutation | أيقونة حالة ثابتة/انتقال قصير 160ms بعد رد الخادم فقط | replay أو حالة ambiguous تعرض معرف العملية/مسار استعادة، لا احتفال مضلل. |
| فشل أو تحذير | لا bounce أو shake؛ حدود لونية ونص code مترجم وfocus على التنبيه | أخطاء سريرية/دفع/OTP مرئية حتى مع reduced motion. |
| navigation mobile | انتقال منطقي حسب LTR/RTL، ولا shared-element بين موارد مرضى حساسة | يحترم Reduce Motion وإعدادات OS؛ لا autoplay ولا parallax طبي. |

لا يبدأ تطبيق الحركة مع دفعات mutations. تعالج كدفعة تصميم منفصلة بعد إغلاق عقد واحد على الأقل، وباختبارات reduced motion وfocus وRTL وصور مرجعية للويب فقط. ولتحليل مطابق للحركة في الفيديوهات، يرجى إرسال ملفات MP4 أو روابط YouTube/MP4 عامة؛ حينها يمكن استخراج جدول توقيت دقيق من كل فيديو.

## 7. قرار المراجعة المطلوب

اعتماد هذه الخطة يعني الموافقة على فصل ثلاثة مسارات: تنفيذ العقود المنشورة أولاً؛ إبقاء ما بلا عقد محجوباً؛ ثم اعتماد مواصفات الحركة كتصميم قابل للوصول لا كنسخ بصري من فيديو اجتماعي. لا يعني اعتمادها تفويضاً ببناء كود أو تغيير الموبايل أو الدمج إلى `main`.

## المراجع

[1] `evidence/latest_main_contracts/PATIENT_WEB_CONTRACT_PACK_V1.md` — الحزمة العقدية.

[2] `evidence/110_web_mobile_atomic_parity_v2.tsv` — مصفوفة الـ72 سطحاً المفقوداً.

[3] `evidence/113_web_complete_build_roadmap.md` — ترتيب الدفعات وحواجز التنفيذ.

[4] `motion_reference_observations_20260822.md` — الملاحظات المرئية للفيديوهات الثلاثة.

## 8. مقارنة مثبتة: حزمة العقود مقابل OpenAPI الحالية على `main`

تمت قراءة الملفين مباشرة من `main` في 22 أغسطس 2026، لا من نشر Sandbox: حزمة العقود ذات Git blob `65432be0a771f8d5f4d5d8ff7e3de935bcba3176` وبصمة SHA-256 `b773566e91fd9c2ce048639c17f8f3a4f2e4bd829c7d519fd5131e05a1df65eb`، وOpenAPI ذات Git blob `0e43445d23a540ffe4c5752f72ee1ad366b07b9d` وبصمة SHA-256 `dc42da005be00e9a70d397bb880ca880f913068ec187610b03669343fab677ff`.

> OpenAPI الحالية هي **مرجع مقارنة فقط**؛ لا تستخدم بديلاً للعقود الجديدة ولا تبرر بدء بناء. تظهر المسارات القديمة/المختلفة التالية بالاسم، ولذلك يمنع توصيل الواجهة بها من دون الـspec المنشورة المطابقة للحزمة.

| مجال الحزمة | العقد المطلوب | ما يظهر في OpenAPI الحالية | قرار التنفيذ قبل النشر |
|---|---|---|---|
| OTP والجلسة (§1) | `/auth/otp/request` و`/otp/verify` و`/session/exchange` | `/auth/send-otp` و`/auth/verify-otp`؛ لا exchange | **حظر**: اختلاف مسار وDTO وcookie contract. |
| التسجيل/الاستعادة (§1) | register مع consents، و`/auth/password/forgot` و`/reset` | `POST /auth/register` و`POST /auth/reset-password`؛ لا forgot بالمسار الملزم | **حظر**: لا يستنتج عدم كشف الحساب أو TTL من OpenAPI الحالية. |
| الملف وHealth ID (§2) | `GET /users/me/display`، `PATCH /users/me`، `/health-id` | `/users/me/profile` وخصوصية/أمان/جلسات منفصلة؛ لا display أو health-id | **حظر**: DTO العرض المقيد لم ينشر بعد. |
| القياسات (§3) | `/health/vitals-log` و`POST/PATCH/DELETE /health/vitals` وwearables | `GET/POST /health/vitals` و`PATCH/DELETE /health/vitals/{id}`؛ لا vitals-log أو wearables | **جزئي غير قابل للبناء**: لا synthetic defaults ولا idempotency مفترض. |
| التذكيرات (§4) | reminders وإعادة التعبئة في `/health/medications/{id}/refill` | reminders CRUD/log موجودة؛ refill ظاهر تحت `/health/reminders/{id}/refill` | **حظر**: اختلاف المورد/معنى ID والـDTO. |
| العائلة (§5) | `/family/my-group/members` و`/members/{id}/permissions` وremove | invite/join/leave موجودة، لكن members/permissions/remove بمسارات وأسماء مختلفة | **حظر جزئي**: لا تفترض 403/404 أو DTO محدوداً. |
| السلة والطلب (§6) | `/cart/items` و`/cart/checkout` POST وreorder/cancel | `/cart/lines` و`GET /cart/checkout`، مع `orders/{id}/reorder|cancel` | **حظر عالي**: اختلاف اسم المورد وmethod؛ لا مال أو طلب من OpenAPI قديمة. |
| الحجز (§7) | `POST /unified-bookings` وcancel/reschedule وcall-token | checkout-cart/match و`/{kind}/{id}` وcancel/reschedule؛ لا POST root أو call-token | **حظر عالي**: يلزم حسم kind وslot lock وTTL. |
| الرعاية المنزلية (§8) | `GET /home-care/bookings/{bookingId}` بـDTO مريض مقيد | list/create ومسارات تشغيلية داخلية؛ لا detail DTO المطلوب | **حظر**: لا تعرض nurse/timeline من DTO آخر. |
| الوصفة والدردشة (§9) | وصفة مملوكة، رسائل/read/rt-token للمشارك | وصفة `{id}` وmessages/read موجودة نسبياً؛ لا rt-token ولا ضمان DTO/ownership الملزم | **حظر جزئي**: لا تفتح mutation قبل تحقق participant/replay. |
| الوسائط (§10) | upload purpose/owner_binding، URL موقع 15min | upload/presigned وDELETE key فقط | **حظر**: لا رابط عام ولا استعمال raw key. |
| المقالات والتفضيلات (§12) | bookmarks وnotification PATCH وsession revoke | notification settings وsessions موجودة؛ bookmark غائب | **جزئي غير قابل للبناء**: يحتاج allowlist وreplay وDTO منشور. |

تحدد هذه المقارنة أول فحص تلقائي عند وصول الـspec الحية: المسار، method، security، parameters، request schema، response schema، جميع status codes، هيدر `Idempotency-Key`، والـTTL/replay. لا تكفي مطابقة الاسم وحدها.
