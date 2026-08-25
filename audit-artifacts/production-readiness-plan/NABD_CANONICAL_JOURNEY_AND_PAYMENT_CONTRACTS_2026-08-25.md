# عقود الرحلات والدفع والتأمين — نبض

## الحالة والغرض

هذه الوثيقة هي **مصدر قرار منتج مقترح للاعتماد** مبني على توجيه المالك في 25 أغسطس 2026. وهي لا تدعي أن خط الأساس الحالي ينفذها، ولا تغلق أي finding أو تمنح موافقة تشغيلية. لا يبدأ أي بناء قبل اعتمادها ومطابقتها بعقود backend محددة واختبارات سلبية وإيجابية.

> **قاعدة عامة:** يظل الخادم هو مصدر الحقيقة للحالة، السعر، التوفر، أهلية التأمين، مبلغ التحمل، ومعرّف الدفع والنتيجة. لا يثبت أي انتقال بمجرد تحديث UI أو نجاح طلب عميل غير موثّق.

## 1. الصيدلية: broadcast ثم offer ثم اختيار ثم تسوية

المريض يضيف الأصناف إلى السلة ثم يرسل **طلبًا**، وليس طلبًا نهائيًا إلى صيدلية بعينها. يتحقق الخادم من الأصناف والكمية والوصفة عند الحاجة والعنوان/النطاق الجغرافي، ثم يبث الطلب إلى الصيدليات المؤهلة والقريبة. الصيدليات تقدم عروضًا، وتحتوي كل offer على الأصناف المتاحة والبدائل المسموح بها والسعر والرسوم وETA والانتهاء ومعلومات عدم التوفر. يرى المريض جميع العروض المؤهلة ويختار عرض صيدلية واحدًا فقط.

| المرحلة | حالة خادمية مقترحة | الممثل | القاعدة الملزمة | النتيجة أو الانتقال |
|---|---|---|---|---|
| السلة | `DRAFT_CART` | المريض | لا توجد تسوية أو حجز مخزون نهائي | تعديل الأصناف أو إرسال الطلب |
| إرسال الطلب | `REQUEST_SUBMITTED` | المريض/الخادم | idempotency key، snapshot للأصناف والعنوان والوصفة والسياسة | broadcast جغرافي |
| البث | `BROADCAST_OPEN` | الخادم | قائمة الصيدليات المؤهلة لا تُكشف للمريض إلا في حدود policy | وصول الطلب للصيدليات |
| العرض | `OFFERS_RECEIVED` | الصيدلية | offer يحمل per-line availability/substitute/price/ETA ومدة صلاحية | عروض للمريض |
| اختيار العرض | `OFFER_SELECTED` | المريض | اختيار atomic لعرض واحد وغير منتهٍ؛ كل العروض الأخرى لا تقبل | مسار Cash أو COD أو Insurance |
| Cash/Card | `PAYMENT_PENDING` | المريض/الدفع | يبدأ payment intent **بعد** اختيار العرض؛ الإجمالي من الخادم فقط | webhook موثق أو فشل/إلغاء |
| Cash/Card ناجح | `CONFIRMED_FOR_FULFILLMENT` | الخادم | webhook idempotent وledger immutable | الصيدلية تبدأ التجهيز |
| COD | `CONFIRMED_COD` | المريض/الخادم | مسموح فقط policy صريحة للتسوية المؤجلة؛ لا يُعرض كـpaid | الصيدلية تبدأ التجهيز وتحصّل عند الاستلام |
| Insurance | `INSURANCE_PROVIDER_REVIEW` | الصيدلية | لا يدفع المريض عند الاختيار؛ الصيدلية تراجع داخليًا وترسل full/partial/reject وco-pay | انتظار قرار التغطية |
| Insurance full | `CONFIRMED_INSURANCE` | الخادم | قرار التأمين ومرجعه وتوقيته محفوظون | تجهيز الطلب |
| Insurance partial | `COPAY_PENDING` | المريض | يعرض التحمل من قرار الصيدلية؛ لا confirmation قبل التسوية أو policy COD الصريحة | دفع co-pay أو COD co-pay أو إلغاء |
| Insurance reject | `INSURANCE_REJECTED` | الصيدلية/الخادم | يوضح السبب المسموح؛ يتيح للمريض إلغاء أو تحويلًا واعيًا إلى Cash/COD وفق policy | لا تسوية ضمنية |
| التجهيز والتسليم | `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` | الصيدلية/السائق | transitions محكومة بالدور وتدقيق immutable | نتيجة وreceipt/notification |

### ضمانات الصيدلية غير القابلة للتفاوض

يجب أن يكون قبول العرض، الحجز، invoice/ledger، webhook، وبدء التجهيز متسقين transactionally أو من خلال outbox/saga ذات تعويض واضح. لا يُقبل total أو coverage أو co-pay أو stock من العميل. كل mutation يجب أن تحمل idempotency key؛ ويجب أن تُختبر replay، انتهاء العرض، منافسة offer selection، owner/stranger، provider/wrong-role، unauth، refund/cancel، وwebhook duplication.

## 2. الاستشارة والتحاليل والأشعة والرعاية المنزلية

هذه الرحلات تشترك في مبدأ: يختار المريض الخدمة والمزوّد والموعد أو visit slot أولًا. Cash/Card يدفع قبل تأكيد الحجز. أما Insurance فيرسل طلب التغطية **من دون دفع** ثم ينتظر قرار المزوّد/شركة التأمين ومبلغ التحمل؛ بعدها يدفع المريض حصته ثم يؤكد الحجز فقط.

| المرحلة | Cash/Card | Insurance | قواعد الخادم |
|---|---|---|---|
| الاختيار | اختيار الخدمة والمزوّد والـslot | اختيار الخدمة والمزوّد والـslot | صلاحية المزوّد والـslot والسعر server-authoritative |
| إنشاء الطلب | `PAYMENT_PENDING` | `INSURANCE_REQUESTED` | slot lock قصير ومحدد TTL، idempotency key |
| قرار الجهة | payment intent بعد الاختيار | `APPROVED_FULL` أو `APPROVED_PARTIAL` أو `REJECTED` | قرار مؤرخ وموقع/مرجعي؛ لا UI-only approval |
| الدفع | نجاح webhook → `CONFIRMED` | full → `CONFIRMED`; partial → `COPAY_PENDING` ثم webhook → `CONFIRMED` | التسوية قبل confirmation، باستثناء policy صريحة موثقة |
| التنفيذ | موعد/visit/call/result | موعد/visit/call/result | role/state-machine/ownership enforced |
| ما بعد الخدمة | report/prescription/receipt/cancel/refund policy | report/prescription/receipt/cancel/refund policy | PHI control، audit trail، notification reliability |

يشمل ذلك الاستشارات في العيادة أو المنزل أو عن بُعد، التحاليل، الأشعة، والتمريض/الرعاية المنزلية. تختلف artifacts السريرية لكل نطاق، لكن لا تختلف قاعدة cash-before-confirmation أو insurance-before-payment-decision.

## 3. مصفوفة الأدوار والملكية

| actor | صلاحيات لازمة | ممنوعات أساسية |
|---|---|---|
| المريض | إنشاء طلبه، اختيار offer/slot، دفع حصته، الإلغاء ضمن policy، رؤية نتائجه فقط | تعديل السعر/التغطية/قرار provider أو رؤية طلب/نتيجة غيره |
| صيدلية/مزوّد | تقديم offer أو قرار خدمة/تغطية وتنفيذ انتقالاته المسموحة | قبول طلب خارج النطاق أو كشف PHI أو تغيير ledger بلا policy |
| Admin | governance، dispute، moderation، audit، policy configuration | تجاوز الملكية أو التعديل المالي الصامت أو الوصول غير المسجل إلى PHI |
| Payment/Insurance webhook | transition محدود، signed/idempotent، audit immutable | إنشاء booking/order بلا reference أو تغيير price/co-pay من payload غير موثوق |

## 4. حالات إلزامية لكل contract slice

لكل خطوة mutation أو read حساس يجب أن تُوثق وتختبر الحالات التالية: happy path، unauthenticated، wrong role، owner مقابل stranger، validation، price/stock/slot change، offer/lock expiry، duplicate idempotency replay، webhook replay/out-of-order، error، loading، empty، retry، cancel/refund، notification failure، وreconciliation/compensation.

## 5. حدود هذه الوثيقة

لا يوجد في تدقيق المصدر الحالي دليل runtime كافٍ لإعلان تطابق التطبيق مع هذه العقود. أي surface أو CTA لا يملك method/path → controller → service → DTO/schema → transition → result chain يظل `INSUFFICIENT_EVIDENCE` أو `RUNTIME_REQUIRED`، ولا يحول إلى backlog بناء مؤكد بلا مراجعة مستقلة.
