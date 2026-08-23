# خطة إغلاق فجوات x402 وMPP وUCP وACP في Nabd Plus

**الحكم المختصر:** نتائج الفاحص لا تعني تلقائيًا أن Nabd Plus ناقص لأنه لم يكتشف بروتوكولات commerce. منصة Nabd Plus صحية، وتملك شراء أدوية وحجز خدمات، ولذلك يمكن اعتبارها commerce من الناحية التجارية؛ لكن إضافة بروتوكول دفع للوكلاء ليست مجرد إضافة أربعة ملفات JSON. إنها قرار منتج ومالي وأمني يتطلب مسارًا تجاريًا مخصصًا، محافظًا أو مزود دفع، تسوية واستردادًا، عقود API، وموافقة قانونية. لا ينبغي فتح دفع آلي للوكلاء على endpoints المرضى الحالية لمجرد تحويل نتيجة الفاحص إلى pass.

## 1. الحالة الحالية المثبتة

| المجال | الحالة الحالية | الفجوة الدقيقة |
|---|---|---|
| Public AI discovery | منفذ: API Catalog وARD وAgent Skills وMarkdown negotiation وWebMCP read-only | لا توجد فجوة عامة أساسية في هذه الطبقة |
| MPP | لا يوجد `/openapi.json` في جذر الموقع مع `x-payment-info` للعمليات القابلة للدفع | يلزم تصميم payable agent API حقيقي ثم نشر OpenAPI صادق |
| x402 | لا يوجد middleware أو facilitator أو wallet مهيأ | يلزم endpoint agent-facing قابل للدفع ووسيلة تحقق وتسوية حقيقية |
| UCP | لا يوجد `/.well-known/ucp` | لا يجوز إنشاؤه قبل وجود خدمة UCP حقيقية وschemas/endpoints قابلة للوصول |
| ACP | لا يوجد `/.well-known/acp.json` | لا يجوز إنشاؤه قبل وجود ACP API وtransport وقدرات منفذة |
| Patient mutations | توجد BFF routes للحجز والدفع والسلة والطلبات | يجب عزلها عن agent payments وعدم تجاوز session/ownership/idempotency |
| Production readiness | ليست 100% للمشروع الكلي | ما زالت يلزم إغلاق تكافؤ الموبايل، Sandbox، الرحلات الكاملة، الفحص البصري، والنشر المثبت |

## 2. قرار النطاق المطلوب قبل البرمجة

يجب اعتماد أحد الخيارين التاليين كتابةً من مالك المنتج. الفرق بينهما جوهري:

| الخيار | ما يعنيه | النتيجة |
|---|---|---|
| إبقاء Nabd Plus patient-first | الوكلاء يكتشفون الكتالوج العام فقط، والمستخدم يكمل الدفع داخل جلسة الويب الآمنة | تبقى x402/MPP/UCP/ACP محجوبة، ويُوثق سبب عدم تفعيلها |
| فتح agent-native commerce محدود | الوكيل يستطيع اكتشاف خدمة عامة، إنشاء quote أو payment session محدودة، ثم إتمام عملية مدفوعة بعقد مستقل | نبدأ شريحة تجارية منفصلة، لا نربط الوكيل مباشرة بمسارات المرضى الحالية |

التوصية الأمنية هي الخيار الثاني فقط على **منتجات عامة منخفضة الحساسية** في البداية، مثل الوصول إلى محتوى منشور أو quote غير شخصي. لا يبدأ التنفيذ بشراء دواء، رفع وصفة، حجز طبي، بيانات تأمين، أو أي مورد طبي حساس عبر وكيل غير موثق.

## 3. فجوة x402 والمهام اللازمة

حسب إرشاد x402، يلزم middleware يعيد HTTP 402 مع متطلبات الدفع، مع facilitator URL ومحفظة استقبال حقيقية.[1]

### المهام قبل التنفيذ

1. اختيار شبكة وأصل دفع وwallet مملوك للشركة، وتحديد من يملك مفتاح التسوية وكيف يُدار خارج الكود.
2. اعتماد facilitator حقيقي وبيئة اختبار منفصلة عن أموال الإنتاج، مع توثيق آلية verify وsettle.
3. إنشاء namespace مستقل مثل `/api/agent/v1` بدل وضع middleware على `/api/patient` أو routes الحجز الحالية.
4. تحديد خدمات مسموحة للدفع الآلي، السعر الثابت أو quote الموقّع، العملة، الضرائب، expiration، refund، وwebhook أو settlement status.
5. تنفيذ middleware مناسب لـNext.js أو وضعه في طبقة API مستقلة إذا كان middleware الرسمي غير متوافق مع BFF الحالي.
6. منع تكرار التسوية باستخدام idempotency key، وربط payment requirement بـresource وamount وexpiry، وعدم الثقة في amount يرسله الوكيل.
7. إضافة سجلات تدقيق غير حساسة: payment attempt، verification result، settlement id، resource id، دون تخزين مفاتيح أو بيانات بطاقة.
8. إضافة rate limits، replay protection، nonce/expiry، حدود إنفاق، وإيقاف طارئ للوكيل.

### اختبارات x402 الإلزامية

| الاختبار | معيار القبول |
|---|---|
| بدون payment proof | `402` مع requirements صحيحة، دون إنشاء order أو booking |
| proof غير صحيح | رفض واضح، دون side effect |
| proof منتهي | رفض، دون side effect |
| amount أقل | رفض، دون side effect |
| replay لنفس الدفع | لا تتم تسوية ثانية، والنتيجة idempotent |
| نجاح verify ثم فشل business operation | لا يُنشأ مورد نصف مكتمل؛ توجد سياسة تعويض/استرداد موثقة |
| وصول إلى مورد مريض | ممنوع عبر endpoint الوكيل |
| logs/secrets | لا tokens أو private keys أو card data في response/log/browser |

## 4. فجوة MPP والمهام اللازمة

إرشاد MPP يتطلب OpenAPI على `/openapi.json`، وإضافات `x-payment-info` على كل operation قابلة للدفع، مع `intent` و`method` و`amount`، ويمكن إضافة currency وdescription و`x-service-info`.[2]

### المهام

1. نشر `/openapi.json` في الجذر، مع الحفاظ على public subset وعدم كشف private patient API.
2. تعريف operations agent-facing حقيقية فقط، مثل `GET /api/agent/v1/public-content/{id}` أو `POST /api/agent/v1/quotes`; لا توصف routes غير منفذة.
3. إضافة `x-payment-info` لكل عملية مدفوعة، بحيث يطابق السعر الذي يراه العميل والعقد الفعلي. لا يجوز وضع amount ثابت إذا كان السعر dynamic إلا عبر quote/session contract.
4. اختيار method معتمد فعلًا: `stripe` إن كان المسار عبر Stripe، أو `tempo`/`lightning` فقط إذا توفر backend settlement حقيقي. لا تُدرج كل methods نظريًا.
5. تحديد intent: `charge` للمورد الفوري أو `session` للجلسة متعددة الخطوات، مع expiry وcurrency وdescription إذا يدعمها العقد.
6. ربط MPP authorization بطبقة الدفع، لا بتحويل metadata إلى إثبات دفع. metadata وحدها لا تنفذ charge.
7. اختبار أن كل schema وURL في OpenAPI reachable، وأن أمثلة الاستجابة لا تحتوي mock order IDs أو أسعارًا وهمية.

## 5. فجوة UCP والمهام اللازمة

إرشاد UCP يطلب `/.well-known/ucp` مع `protocol_version` و`services` و`capabilities` و`endpoints`، وأن تكون المواصفات والمخططات المشار إليها قابلة للوصول.[3]

### المهام

1. تحديد هل Nabd Plus سيعلن نفسه كخدمة UCP فعلية أم سيبقى خارج UCP. لا يُنشر profile شكلي.
2. اختيار service واحد أولًا، مثل catalog/quote، وعدم الإعلان عن checkout أو fulfillment قبل تنفيذهما.
3. بناء endpoint contract يحدد product/service identifier، availability، price، currency، quote expiry، payment state، cancellation، refund، وerror model.
4. نشر schema URLs versioned وقابلة للاختبار، مع CORS وcontent types صحيحة.
5. ربط UCP بالـorder/payment state machine الفعلية، وعدم السماح بإنشاء حجز أو طلب من metadata فقط.
6. إضافة ownership boundary: أي مورد patient-specific يبقى خلف جلسة httpOnly ولا يمر عبر profile عام.

## 6. فجوة ACP والمهام اللازمة

إرشاد ACP يطلب `/.well-known/acp.json` مع protocol name=`acp`، version، `api_base_url` مطلق، transports غير فارغة، وcapabilities.services غير فارغة.[4]

### المهام

1. تحديد transport فعلي مدعوم، مثل HTTPS JSON، وليس قيمة وصفية غير منفذة.
2. إنشاء `api_base_url` مستقل ومثبت، أو استخدام origin الحالي فقط إذا كانت routes ACP فعلية موجودة عليه.
3. تعريف services مدعومة بدقة: catalog، quote، checkout، order status، وغيرها فقط بعد التنفيذ.
4. ربط كل service بعقود OpenAPI واختبارات 401/403/404/409 وidempotency.
5. عدم الإعلان عن payment أو fulfillment أو patient data في `capabilities.services` قبل اعتمادها واختبارها.
6. إضافة versioning وdeprecation policy وcontact/security policy للاستقرار التشغيلي.

## 7. الأمن والامتثال المشترك

قبل تفعيل أي بروتوكول دفع آلي، يجب إغلاق هذه المتطلبات عبر جميع الطبقات:

| المجال | المطلوب |
|---|---|
| الأسرار | facilitator keys، wallet credentials، signing keys في secret manager/server env فقط؛ لا commit ولا client bundle |
| الجلسة | إبقاء جلسة المرضى httpOnly؛ لا تحويل x402 أو MPP إلى token في URL أو localStorage |
| الخصوصية | عدم إرسال PHI إلى agent discovery أو payment metadata أو logs |
| التسعير | السعر من الخادم؛ quote موقّع ومؤقت؛ منع client totals |
| التكرار | Idempotency وreplay protection لكل charge/order/booking |
| الصلاحيات | agent scope منفصل، least privilege، ورفض افتراضي للموارد الحساسة |
| PCI | عدم استقبال بيانات البطاقات في Nabd؛ استخدام hosted payment/tokenization من مزود معتمد |
| الاسترداد | سياسة refund وpartial failure وchargeback وmanual review |
| المراقبة | correlation IDs، settlement reconciliation، alerts، kill switch، audit retention |
| القانون | موافقة قانونية على العملات، الضرائب، الفوترة، المدفوعات الآلية، وحماية البيانات الصحية |

## 8. ترتيب التنفيذ المقترح لإغلاق الفجوة

### Phase A — قرار المنتج والعقود

اعتماد نطاق agent commerce، الخدمات الأولى، الدول والعملات، مزود الدفع أو الشبكة، wallet/facilitator، وسياسة الاسترداد. المخرج هو Contract Pack مستقل وموقع من مالك المنتج، وليس كودًا.

### Phase B — read-only agent commerce

إنشاء `/api/agent/v1` وquote/catalog contracts، ثم OpenAPI root مع MPP metadata فقط للعمليات التي أصبحت حقيقية. إضافة UCP/ACP فقط إذا كانت services المعلنة منفذة، مع إبقاء بيانات المرضى خارج النطاق.

### Phase C — sandbox payment rail

تشغيل x402 أو MPP في بيئة اختبار مع facilitator testnet أو test provider، واختبار 402، verify، settle، expiry، replay، failure compensation، refunds، وaudit logs. ممنوع استخدام حسابات أو بطاقات حقيقية.

### Phase D — limited production enablement

تفعيل خدمة واحدة منخفضة الحساسية خلف feature flag، مع rate limits وkill switch ومراقبة reconciliation. لا تفتح checkout الطبي أو الحجز إلا بعد دورة اعتماد منفصلة.

### Phase E — full project production closure

بالتوازي مع أو بعد البروتوكولات، يجب إغلاق فجوات Nabd Plus الأصلية: مطابقة كل شاشات الموبايل، كل الأزرار والمسارات والسيناريوهات، الرحلات الكاملة للحجز والشراء، Sandbox owner/stranger/unauth/replay، إزالة كل mock/placeholder، التحقق من الأمان والـSEO والـi18n وRTL والأداء، ثم إثبات النشر الحي.

## 9. تعريف Done وقرار GO/NO-GO

لا تُعتبر الشريحة مكتملة إلا إذا تحققت الشروط التالية:

| الشرط | الدليل المطلوب |
|---|---|
| contract truth | endpoint حي أو implementation مثبت، لا OpenAPI وصفي فقط |
| payment truth | verify/settle أو provider flow حقيقي في sandbox |
| security | اختبارات unauthorized/ownership/replay/secrets ناجحة |
| financial safety | reconciliation وrefund وpartial failure موثقة ومختبرة |
| discovery | scan يقرأ metadata وURLs وschemas المنشورة فعليًا |
| deployment | commit مدفوع، `ls-remote` مطابق، وversion live مثبت |
| patient parity | مصفوفة شاشة/زر/رحلة موقعة بعد مراجعة الويب والموبايل |

الحكم الحالي قبل تنفيذ المتطلبات الجديدة هو **NO-GO للدفع الآلي للوكلاء** و**NO-GO لإعلان commerce discovery كامل**، مع بقاء public AI discovery الحالية صالحة. لا يمكن رفع الحكم إلى GO إلا بعد توفير قرار المنتج، مزود/شبكة دفع حقيقية، عقود agent API، واختبارات Sandbox وproduction verification.

## المراجع

[1]: https://isitagentready.com/.well-known/agent-skills/x402/SKILL.md "x402 payment protocol requirements"

[2]: https://isitagentready.com/.well-known/agent-skills/mpp/SKILL.md "MPP payment discovery requirements"

[3]: https://isitagentready.com/.well-known/agent-skills/ucp/SKILL.md "UCP discovery requirements"

[4]: https://isitagentready.com/.well-known/agent-skills/acp/SKILL.md "ACP discovery requirements"

[5]: https://x402.org "x402 protocol"

[6]: https://docs.x402.org "x402 documentation"

[7]: https://mpp.dev "Machine Payment Protocol"

[8]: https://ucp.dev/specification/overview/ "Universal Commerce Protocol specification"

[9]: https://agenticcommerce.dev "Agentic Commerce Protocol"
