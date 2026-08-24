# سجل البناء المتبقي: رحلات المستخدم والمزوّد الكاملة

**الحالة:** مرجع إلزامي لوكيل البناء والمراجعة.
**المصدر:** قواعد الأعمال الملزمة، تدقيق الرحلات، فحص المصدر السابق، ونتيجة E2E المعزولة.
**قاعدة قراءة مهمة:** `PASS` في E2E الضيق لا يعني أن المجال صار كاملًا. هذا السجل يصف ما لم يُبنَ أو ما بقي غير موحد أو غير مثبت.

## دلالات الحالة

| الحالة | المعنى العملي |
|---|---|
| **MISSING** | لا يوجد عقد أو شاشة أو workflow صالح يحقق منطق المنتج المطلوب. |
| **INCONSISTENT** | يوجد أكثر من مسار أو نموذج أو سلوك متعارض، ولا يمكن اعتماد أي منها كعقد واحد. |
| **PARTIAL** | يوجد جزء عامل، لكنه لا يغطي الأدوار أو الحالات أو الدفع أو النتيجة كاملة. |
| **UNVERIFIED** | يوجد مصدر أو واجهة، لكن لا يوجد اختبار قبول مثبت للحالة المطلوبة. |
| **BLOCKED** | يجب ألا يبنى success زائف؛ يحتاج اعتماد خارجي أو قرار منتج أو تهيئة تشغيلية. |

## أولوية البناء

| المعرف | المجال | الحالة | الأولوية | سبب الأولوية |
|---|---|---:|---:|---|
| CORE-01 | نموذج طلب/عرض/قبول موحد | **MISSING** | P0 | لا يمكن تنفيذ الصيدلية أو الدفع المؤجل أو التأمين الموحد بلا مصدر حقيقة واحد. |
| INS-01 | دورة تأمين عامة حسب الطلب والبند | **PARTIAL** | P0 | منطق المستخدم يلزم قرارًا بعد الإرسال وpartial/co-pay وبنود متعددة لكل خدمة. |
| PHARM-01 | broadcast عروض الصيدليات واختيار المريض | **MISSING** | P0 | السلة والطلب الحاليان لا يحققان سوق العروض قبل الدفع. |
| PAY-01 | PSP sandbox + webhook + حالات الدفع | **BLOCKED** | P0 | لا يجوز إعلان card أو paid قبل تحقق sandbox ومفاتيح وwebhook موقّع. |
| UX-01 | حالات الشاشات والـtimeline الموحد | **MISSING** | P0 | Patient Web/Mobile لا يثبتان كل شاشات الانتظار والعرض والدفع والإلغاء والنتيجة. |
| PROV-01 | inbox المزوّد وقراراته العملية | **PARTIAL** | P0 | كل رحلة تحتاج قبول/رفض/عرض/قرار تأمين/تنفيذ موثق من دور مخول. |
| LAB-01 | دورة المختبر بعد الحجز | **PARTIAL** | P1 | حجز فقط مثبت؛ جمع عينة وQC وتقرير غير مكتملين كرحلة مستخدم. |
| RAD-01 | دورة مركز الأشعة والتقرير | **INCONSISTENT** | P1 | يوجد مسارا حجز legacy/center؛ يجب توحيد المصدر والـstate/report. |
| HOME-01 | دورة التمريض الميدانية | **PARTIAL** | P1 | إنشاء/قراءة/إلغاء فقط؛ لا قبول/تتبع/تنفيذ/جلسات/نتيجة كاملة. |
| CONS-01 | استشارة end-to-end بعد الحجز | **PARTIAL** | P1 | slot وحالات ضيقة موجودة، لكن quote/تأمين/دفع/LiveKit حقيقي ونتيجة موحدة غير مكتملة. |
| RX-01 | وصفة/صرف/بديل دواء | **PARTIAL** | P1 | لا تقبل الوصفة ولا البدائل ولا قرار الصيدلي كرحلة كاملة مثبتة. |
| REP-01 | التقارير الطبية والملفات الخاصة | **PARTIAL** | P1 | يلزم ownership، draft/review/publish، وواجهة مريض للنتيجة. |
| CANCEL-01 | سياسة إلغاء/استرداد موحدة | **INCONSISTENT** | P1 | توجد حسابات محلية، لكنها ليست مرتبطة بكل quote/payment/insurance service lifecycle. |
| QA-01 | تغطية E2E Web/Mobile/Provider متعددة الأدوار | **UNVERIFIED** | P0 | نجاح API sandbox وحده لا يثبت الشاشات أو الاستخدام الواقعي. |

## 1. CORE-01 — نموذج موحد للطلب والعرض والقبول

### الفجوة

لا يوجد نموذج واحد موثق يربط: طلب المريض، بنود الخدمة، عروض المزوّد، قبول المريض، قرار التأمين، التزام cash أو transaction card، وحالة التنفيذ. توجد نماذج منفصلة للحجوزات والطلبات، وبعضها يقبل الدفع أو السعر في وقت غير متوافق مع منطق المستخدم.

### المطلوب من الوكيل

1. إجراء inventory لكل schemas/controllers الحالية ذات الصلة: orders، pharmacy bids/allocation، appointments، lab bookings، radiology center/legacy bookings، home-care bookings، insurance requests، payments/refunds.
2. اختيار مصدر حقيقة واحد أو طبقة `ServiceRequest`/`FulfillmentQuote` قابلة للتوسع، مع adapters انتقالية للكيانات الحالية. لا يحذف بيانات أو migrations قديمة بلا خطة migration.
3. تعريف state machine مشتركة على الأقل: `DRAFT → SUBMITTED → PROVIDER_REVIEW → QUOTED → PATIENT_DECISION → INSURANCE_REVIEW → PAYMENT_PENDING → CONFIRMED → IN_FULFILLMENT → COMPLETED`، مع فروع `DOCUMENTS_REQUIRED` و`REJECTED` و`EXPIRED` و`CANCELLED` و`REFUND_PENDING`.
4. فرض الملكية والدور والانتقال الشرعي وidempotency وإصدار quote في backend. يحفظ audit event عند كل transition.
5. إنشاء contracts/DTOs/OpenAPI ومهاجرات آمنة وfixtures، ثم تحديث web/mobile لاستهلاكها فقط.

### قبول المراجع

- لا يوجد endpoint يقبل `price` أو `total` أو `approved` أو `paid` من العميل.
- replay لنفس idempotency key يعيد نفس النتيجة ولا ينشئ عرضًا أو دفعًا ثانيًا.
- لا يستطيع مريض أو مزوّد آخر قراءة أو تعديل طلب أو quote غير مملوك.
- E2E يثبت success ورفض transition وquote منتهي وإلغاء وretry.

## 2. INS-01 — التأمين بعد الإرسال، والموافقة الجزئية حسب البند

### الفجوة

التأمين الحالي مثبت جزئيًا للاستشارة، لكن لا يوجد contract موحد ومرئي للمستخدم يغطي كل الخدمات والبنود المتعددة والبدائل الدوائية. لا يجوز افتراض integration مع شركة التأمين؛ قرار المزوّد يدوي ومدخل من نظامه الداخلي/نفيس.

### المطلوب

- إنشاء كيان decision يرتبط بـrequest وquote و**كل بند**: covered amount، patient co-pay amount/percent، rejected amount/reason، approval reference، evidence، expires_at، actor، audit trail.
- إضافة حالات `DOCUMENTS_REQUIRED` و`APPROVED_FULL` و`PARTIAL_APPROVAL` و`REJECTED` و`CO_PAY_PENDING` و`CO_PAY_PAID`.
- بناء شاشات patient: إرسال بيانات الوثيقة، انتظار، طلب مستندات، قرار تفصيلي، بنود غير مغطاة، قبول، دفع co-pay، دفع cash منفصل للبنود المؤهلة، إلغاء.
- بناء شاشات provider: inbox، طلب مستند، قرار كامل/جزئي/رفض، تفصيل بندي، مرجع الموافقة، مراجعة قبل النشر.
- منع أي دفع قبل قرار منشور وقبول المريض له؛ ومنع تحويل الرفض إلى cash تلقائيًا.

### قبول المراجع

- سيناريو واحد يحتوي 5 بنود: 3 مغطاة، 1 partial مع co-pay، 1 مرفوض؛ تظهر القيم الصحيحة وتسمح قرارات المريض المعلنة فقط.
- لا يستطيع provider إصدار قرار لطلب غير مملوك، ولا يستطيع المريض تعديل القرار أو مبلغ co-pay.
- قرار منتهي أو quote قديم يمنع الدفع ويطلب إعادة عرض/قرار.

## 3. PHARM-01 وRX-01 — الصيدلية والعروض والبدائل والوصفة

### الفجوة

هناك إنشاء طلب وبحث كتالوج، لكن رحلة الصيدلية حسب منطق المستخدم—broadcast جغرافي، عروض متعددة، توافر جزئي، بدائل، اختيار المريض، تأكيد السعر ثم الدفع—**MISSING**. كما أن وصفة/رفض/صرف/بديل غير مكتملة كرحلة آمنة.

### المطلوب

- broadcast للطلب إلى صيدليات active/verified داخل نطاق واضح قابل للتهيئة. لا يكشف المريض تفاصيل غير لازمة، ويمنع مزوّدًا خارج النطاق أو غير مخول من العرض.
- quote على مستوى الصيدلية والبند: `available_quantity`، `unit_price`، `line_total`، `substitution` مع سبب/اسم/سعر، delivery/pickup، رسوم، ETA، expiration.
- واجهة patient لعرض العروض وفرزها ومقارنة التغطية والبدائل والتكلفة الإجمالية ثم قبول عرض واحد أو رفضه.
- واجهة pharmacy inbox لتقديم/تعديل/سحب عرض، مراجعة Rx، قبول/رفض الطلب، تحضير وتسليم/استلام.
- قواعد وصفة: خدمة catalog تحدد prescription-required، ملف مملوك خاص، حجم/type، مراجعة صيدلي، رفض واضح، ولا صرف لبند محظور قبل الموافقة.
- ربط التأمين بالعرض المختار وليس بالسلة الخام. نقد/card فقط بعد quote confirmed؛ التأمين بعد decision.
- قرار product مطلوب بشأن split order؛ لا يبنى تلقائيًا.

### قبول المراجع

- 5 أدوية: صيدلية A توفر 5، B توفر 4، C توفر 3 وتقترح بديلين. يرى المريض الفروق ويختار quote A أو C فقط بعد موافقة صريحة على البدائل.
- quote A بعد انتهاء صلاحيته لا يمكن دفعه أو تنفيذه.
- تعديل السعر أو بديل العميل في request لا يغير العرض الخادمي.
- Rx غير صالح أو مفقود لبند إلزامي يحجب quote/صرف ذلك البند فقط وفق السياسة المعلنة.

## 4. CONS-01 — الاستشارات الطبية

### الفجوة

الـslot وحالات أساسية وLiveKit contract ضيق موجودة، لكن رحلة الدفع المؤجل/التأمين وواجهات النتيجة والتعامل مع القنوات الثلاث ليست مكتملة شاشة بشاشة.

### المطلوب

- بناء request/quote أو ربط الاستشارة بالنموذج الموحد؛ العيادة/video/home مع price server snapshot وقواعد القناة والموقع.
- تأكيد أن video token لا يصدر قبل أهلية الموعد والدفع/التأمين المطلوبين. الحفاظ على `doctor_user_id` كهوية مصادقة، لا profile ID.
- Web/Mobile: اختيار طبيب/وقت/قناة، مراجعة، انتظار، تأمين أو quote، دفع صحيح التوقيت، waiting room، نتيجة/وصفة، إعادة جدولة، إلغاء، no-show.
- Provider: inbox، قبول/رفض/اقتراح وقت، تأكيد، waiting room، no-show، ملاحظات/وصفة/نتيجة.

### قبول المراجع

- clinic cash، clinic insurance، video card، home insurance: كل مسار يمر بحالاته الصحيحة ولا يعرض دفعًا مبكرًا.
- مريض غريب لا يدخل wait room أو call أو ينفذ transition.
- لا تتداخل slots أو يعاد الدفع عند retry.

## 5. LAB-01 وRAD-01 وREP-01 — التشخيصات والنتائج

### الفجوة

المختبر يثبت كتالوجًا وحجزًا فقط. الأشعة تحمل نموذجين (legacy وcenter) ومسارين متقاربين؛ لذلك الحالة **INCONSISTENT**. لا توجد رحلة user كاملة من قبول المركز/المختبر إلى QC والتقرير المنشور.

### المطلوب

- توحيد الأشعة: يحدد الوكيل controller/model/state machine واحدًا للمريض ومركز الأشعة، أو adapter موثق يمنع ازدواج الحجز وازدواج التقرير. لا يترك route متنازعًا عليه.
- التأكد من أن service، scheduled time، delivery mode، price، referral، provider selection، payment، report متسقة في schema/DTO/controller/web/mobile.
- للمختبر: قبول/رفض مزود، technician assignment، home collection/facility، sample collection، QC، processing، report upload/review/publish، تتبع وإلغاء.
- للأشعة: قبول مركز، machine assignment عند الحاجة، preparation/check-in/scan، draft/review/approved/published report.
- private storage/report ownership، منع raw URL، audit، وإظهار التقرير للمريض بعد publish فقط.

### قبول المراجع

- E2E للمريض + مختبر/مركز + admin يثبت الحجز، قبول المزود، حالات العمل، التقرير الخاص ثم publish ووصوله للمريض؛ ويرفض provider غريب أو report غير مملوك.
- اختبار migration/compat يضمن أن بيانات الأشعة السابقة لا تضيع ولا تنشأ ازدواجية عند نفس الطلب.

## 6. HOME-01 — التمريض والرعاية المنزلية

### الفجوة

تم توصيل endpoint المريض للحجز/القراءة/الإلغاء، لكنه لا يثبت بعد رحلة مزود تمريض كاملة أو تأمين أو جلسات أو GPS أو report.

### المطلوب

- provider inbox وaccept/reject/counter-proposal/assignment مع ownership وإشعارات.
- تحقق العنوان والإحداثيات ونطاق الخدمة، وحالات field operations: accepted، in transit، arrived، care in progress، completed، no-show، emergency abort، cancelled.
- sessions_count وخطة رعاية وتقرير/علامات حيوية وتتبّع وصلاحيات patient/provider/admin.
- تأمين بعد الإرسال، وcash بعد تأكيد السعر؛ لا card ما لم يوافق المنتج ويثبت PSP.
- شاشة patient وprovider كاملة لكل حالة بما في ذلك عطل GPS، retry، إلغاء، support.

### قبول المراجع

- E2E بمريض وممرض ومدير يثبت قبولًا وتتبّعًا وحالة وملاحظات/تقرير وإتمامًا، مع رفض مزود غير معيّن.
- تأمين جزئي وcash fallback بعد رفض صريح فقط، لا تلقائيًا.

## 7. PAY-01 وCANCEL-01 — الدفع والاسترداد

### الفجوة

البنية الحالية fail-closed وهو صحيح، لكن PSP الحي **BLOCKED**. لا يوجد إثبات sandbox للـcheckout والـwebhook والتسوية والاسترداد المرتبطين بكل خدمة/quote/قرار تأمين.

### المطلوب

- عدم تشغيل live. إعداد sandbox فقط بعد أن يوفر المالك بيانات sandbox عبر طريقة آمنة.
- payment intent من quote أو co-pay decision خادمي محدد؛ metadata تربط request/quote/version/patient/amount.
- webhook بتوقيع، verification، idempotency، event log، منع client callback من marking paid.
- حالات failed/cancelled/expired/refund/partial refund وتزامن timeline المريض والمزوّد.
- توحيد سياسة refund أو توثيق اختلافها حسب الخدمة وقرار المنتج.

### قبول المراجع

- sandbox webhook موقّع يحول `PAYMENT_PENDING` إلى `PAID` مرة واحدة فقط؛ replay لا يكرر fulfillment.
- amount أو request أو user غير مطابق يرفض.
- لا يظهر online card عندما capabilities أو PSP غير صالحين.

## 8. UX-01 — اكتمال Patient Web وPatient Mobile

### الفجوة

الاختبارات السابقة للبناء والواجهة لا تثبت أن الويب والمحمول يقدمان تجربة مكافئة لكل حالات الرحلات. توجد شاشات/routes جزئية، لكن الصفحات لا تكفي إذا لم تربط بعقود الطلب/العرض/التأمين والدفع والنتيجة.

### المطلوب

- بناء خريطة شاشة بشاشة لكل خدمة ولكل حالة المذكورة في قواعد الأعمال.
- مشاركة design tokens ومكونات status/timeline/error/empty/loading/confirmation حيث يناسب، مع إبقاء platform conventions صحيحة.
- تطبيق حماية navigation: لا يصل المستخدم لدفع أو تقرير أو متابعة غير مملوكين عبر deep link.
- إظهار حالة صادقة: لا `success` عند `submitted` أو `pending review`، ولا مبلغ تخميني قبل quote/decision.
- اختبارات web وmobile للوصول والحالات والبيانات الفارغة/الخطأ وتوافق API، وE2E مرئية عند الإمكان.

### قبول المراجع

- walkthrough موثق لكل خدمة على الويب والمحمول يبدأ من home وينتهي بالنتيجة أو الإلغاء، مع لقطات/اختبارات state.
- parity table يبين كل شاشة mobile مقابل web وحالتها، مع استثناءات منصة معلنة.

## 9. PROV-01 — واجهات المزوّد والإدارة

### الفجوة

توجد endpoints إدارية وتشغيلية متفرقة، لكن لا يوجد قبول موحد لواجهة مزوّد لكل عروض/قرارات/حالات الخدمة، ولا دليل أن workflow الداخلي قابل للاستخدام دون تدخل قاعدة البيانات.

### المطلوب

- provider portal أو الواجهات الحالية: inbox، تفاصيل، ownership، quote، decision، execution، report، audit، إلغاء/reassign.
- فصل الصلاحيات: صيدلي، طبيب، مختبر، مركز أشعة، ممرض، مدير. لا يعوض role عام عن service ownership.
- admin exceptions: feature flags، dispute/support، audit فقط وفق صلاحية وليس تعديل silent للحالات المالية/الطبية.

### قبول المراجع

- E2E يثبت أن كل مزوّد يرى عناصره فقط، وكل دور غير مؤهل يأخذ 403/404 مناسبًا.
- لا توجد خطوة تشغيلية تتطلب direct Mongo seed في التشغيل العادي؛ seed مسموح لـtest fixtures فقط.

## 10. QA-01 — بوابات تسليم الوكيل

لا يقبل أي commit من وكيل البناء بسبب build أخضر فقط. المطلوب لكل دفعة:

| البوابة | شرط القبول |
|---|---|
| نطاق صغير | commit واحد أو مجموعة صغيرة ذات هدف واحد، بلا refactor غير مرتبط |
| عقد | DTO/OpenAPI/schema/state transition واختبارات صلاحية وملكية |
| Backend | build + tests مستهدفة + regression غير متأثر |
| Frontend | typecheck/build/tests مع حالات loading/error/empty/authorization |
| E2E | سيناريو happy + رفض + cancel/retry + role boundary للخدمة المعدلة |
| سلامة | `git diff --check`، فحص أسرار، لا credentials حية، لا bypass إنتاجي |
| دليل | تقرير قصير: ما تغير، ما اختبر، logs/commands، ما بقي، commit hash |
| Git | push إلى فرع عمل/مراجعة فقط؛ لا merge ولا deploy |

## أسئلة تمنع البناء العشوائي

قبل تنفيذ CORE-01 أو PHARM-01 أو INS-01 يجب أن يسجل الوكيل سؤال قرار إذا لم توجد إجابة في قواعد الأعمال. لا يختار من تلقاء نفسه سياسة split order أو cash collection أو expiry أو refund أو نطاق broadcast أو معنى partial البنود. يكتب `DECISION_REQUIRED` مع بديلين أو ثلاثة وتأثير كل بديل، ثم ينتظر قرار المالك/المراجع.
