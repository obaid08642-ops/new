# تدقيق حوكمة التشخيص: المختبر والأشعة

> **حالة الوثيقة:** لقطة تحليلية قبل التنفيذ، وليست ادعاءً بأن رحلة التشخيص متكافئة أو جاهزة للإنتاج. لا ينبغي تحويل أي واجهة تشخيص إلى عقد التأمين العام أو إلى دفع إلكتروني قبل إغلاق الفجوات الموضحة أدناه.

## الغرض وحدود الدليل

تراجع هذه الوثيقة عقدي المختبر والأشعة في Backend، ومسارات Patient Web وPatient Mobile التي تستهلكهما. ويقتصر الدليل على المصدر المقروء في هذا المستودع: `LabsController` و`LabsService` و`LabBooking`، و`RadiologyController` و`RadiologyOpsService` و`RadiologyBooking`، ومسارات التشخيص الظاهرة في العميلين. لم ينفذ هذا التدقيق أي migration أو PSP أو webhook أو اختبار Mongo replica-set أو تشغيل خدمة أو نشر.

| المجال | الدليل المقروء | الاستنتاج الآمن |
|---|---|---|
| المختبر | `backend/src/modules/labs/labs.controller.ts`، `labs.service.ts`، `schemas/lab.schema.ts` | توجد قواعد سعر خادمي واختيار مزود وقواعد طريقة دفع أولية، لكن التأمين والدفع ليسا رحلة حاكمة مكافئة للاستشارة. |
| الأشعة | `backend/src/modules/radiology/radiology.controller.ts`، `radiology.service.ts`، `schemas/radiology.schema.ts` | توجد آلة حالات للفحص والتقرير، لكن إنشاء الحجز والتأمين وقراءات المريض تحتاج تضييق ملكية وعقد مالي قبل أي اعتماد. |
| Patient Web | صفحات `patient-web/app/[locale]/diagnostics/*` ومحولات `lib/api/diagnostics*` | الكتالوجات وتفاصيل الحجز قراءة SSR مقيدة؛ لا توجد واجهة حجز أو دفع أو قرار تأمين تشخيصي حاكم. |
| Patient Mobile | `patient-app/app/diagnostics/*`، خصوصاً `insurance-approval.tsx` و`booking-confirm.tsx` و`checkout.tsx` | توجد شاشات قديمة، لكن شاشة التأمين تستخدم polling وحسابات وأسعار عميل وendpoints قديمة؛ أما checkout وbooking-confirm فيعيدان التوجيه ولا ينفذان الرحلة. |

## السياسة التي ستقاس عليها الحزم اللاحقة

الدفع الإلكتروني لا يعرض إلا عبر **capabilities خادمية** تربط وسيلة الدفع بالبوابة والجهاز والحالة والمبلغ الخادمي. ولا يجوز أن يعد redirect أو transaction pending بدفع ناجح. لا توجد محفظة عميل. النقد لا يظهر إلا لخدمة وموقع يؤهلهما الخادم؛ والنقاط، إن دعمت لاحقاً، تظل خصماً خادمياً محدوداً لا وسيلة دفع. التأمين لا يؤكد الحجز عند الإنشاء: يمر بطلب تأمين مملوك للـbooking ومزود الخدمة، ثم قرار كامل أو جزئي أو رفض، ثم co-pay أو self-pay مثبت بعملية مدفوعة ومتحقق منها خادمياً عند الاقتضاء.

## السلوك المثبت الآن

### المختبر

ينشئ `LabsService.book` عناصر المختبر وأسعارها من كتالوج الخدمة الخادمي، ويتطلب `provider_account_id` للمريض، ويرفض home insurance بلا وثيقة doctor request أو preauthorization. ويسمح `facility` بالنقد أو البطاقة أو التأمين، و`home` بالبطاقة أو التأمين فقط. غير أن الإعادة تعتمد على اكتشاف حجز مماثل خلال ثلاث دقائق، لا على `Idempotency-Key`/interceptor موثق؛ كما أن الحجز يبدأ دائماً `NEW_REQUEST`.

يكتب `updateInsuranceApproval` حقول `insurance_status` و`insurance_copay` وحالة كل بند مباشرة، بما فيها `cashPrice` و`optInCash`. ولا ينشئ `InsuranceServiceRequest` مملوكاً، ولا توجد capabilities أو intent guard مختصة بمبلغ التحمل، ولا يثبت المسار أن عملية مدفوعة تتحكم في انتقال `WAITING_COPAY → CONFIRMED`. الإلغاء يعيد الحجز الملغى/المبلّغ عنه من دون فعل، لكنه لا يقدم في هذا العقد دليلاً على refund من مصدر الدفع الموثق.

| مسار المختبر | السلوك الحالي المثبت | الحد المطلوب قبل واجهة مريض حاكمة |
|---|---|---|
| إنشاء facility نقدي | السعر من الكتالوج؛ `NEW_REQUEST`؛ الطريقة مسموحة. | Idempotency header، تأكيد نقدي وفق قبول مزود صريح، وحدود إلغاء/استرداد. |
| إنشاء card facility/home | القيمة الابتدائية خادمية؛ `home` مسموح للبطاقة. | capability ثم intent محروس بالحالة والمبلغ؛ webhook فقط للتأكيد؛ لا checkout قبل جاهزية المزود. |
| إنشاء insurance facility/home | حالة `insurance_status: pending` مع event؛ home يتطلب إثباتاً. | طلب تأمين مملوك، قرار provider كامل/جزئي/رفض، وتسوية co-pay/self-pay موثقة. |
| قرار تأمين | patch مباشر للحقول والبنود. | منع patch المالي العام، audit/outbox، ملكية مزود، ومعاملة متحققة قبل التأكيد. |
| إلغاء/استرداد | انتقال إلى `CANCELLED` عبر workflow. | سياسة مالية تربط refund بالمصدر المدفوع وتمنع الإلغاء بعد نقاط غير قابلة للعكس. |

### الأشعة

يوجد في schema انتقال واضح تقريباً من `NEW_REQUEST` إلى `PENDING_INSURANCE` أو `CONFIRMED`، ثم `WAITING_COPAY` عند الحاجة، فالفحص والتقرير. غير أن `RadiologyOpsService.book` ينسخ body العميل ثم يضيف patient/id/state، ولا يثبت في المسار نفسه lookup كتالوجاً أو سعر خدمة خادمياً أو provider/slot/طريقة دفع أو `Idempotency-Key`. كذلك `getBooking` يتحقق من وجود الحجز فقط في المقطع المدقق، و`transition` لا يتحقق من ملكية أو دور قبل نقل الحالة. هذه فجوات حرجة لا تعالجها الواجهة.

`processInsuranceApproval` يقبل approval code وco-pay من المتعامل ذي الصلاحية الظاهرة في controller، وينقل مباشرة إلى `WAITING_COPAY` أو `CONFIRMED` حسب co-pay. كما أن `updateInsuranceStatus` يكتب الحالة مباشرة. لا يظهر طلب تأمين مملوك أو capability/intent/co-pay verification خاص بالأشعة. لذلك لا يصح وصل صفحة التأمين العامة الحالية بهذه المسارات ولا استعمال شاشة الاستشارة البديلة لها.

| مسار الأشعة | السلوك الحالي المثبت | الحد المطلوب قبل واجهة مريض حاكمة |
|---|---|---|
| إنشاء cash/card | body واسع من العميل؛ يبدأ `NEW_REQUEST`. | DTO صارم؛ lookup كتالوج وسعر وprovider/slot خوادمي؛ owner/idempotency؛ payment guard. |
| إنشاء insurance | توجد حقول inline وحالات machine. | `InsuranceServiceRequest` مملوك أو عقد تشخيص مكافئ موثق؛ لا auto-confirm عند co-pay غير متحقق. |
| قرار كامل/جزئي | `processInsuranceApproval` ينتقل وفق co-pay المدخل. | provider ownership، مصدر مبلغ خادمي، full بلا دفع، partial بعد verified co-pay. |
| رفض/self-pay | patch مباشر لحالة التأمين؛ لا accept-self-pay حاكم مثبت. | رفض صريح، قبول ذاتي idempotent، amount خادمي، capability ثم intent. |
| قراءة/إلغاء المريض | route موجودة؛ مقطع الخدمة المدقق لا يثبت owner check. | فرض ملكية المريض/الدور في كل قراءة وفعل، وإلغاء idempotent/refund source-aware. |

## حالات الـschema التي لا تكفي وحدها لإثبات الدفع

| الخدمة | حالات رحلة العمل | ما لا تثبته هذه الحالات حالياً |
|---|---|---|
| المختبر | `NEW_REQUEST → PENDING_INSURANCE → WAITING_COPAY → CONFIRMED → IN_TRANSIT/IN_LAB → SAMPLE_COLLECTED → PROCESSING → RESULT_UPLOADED → REPORTED`، مع `SAMPLE_REJECTED` و`CANCELLED`. | أن دفع البطاقة أو co-pay تم بعملية gateway تطابق amount/currency وبـwebhook قبل تأكيد الخدمة. |
| الأشعة | `NEW_REQUEST → PENDING_INSURANCE → WAITING_COPAY → CONFIRMED → ARRIVED_CHECKIN → IN_SCANNING → REPORT_DRAFT → UNDER_REVIEW → REPORT_READY`، مع `SCAN_ABORTED` و`CANCELLED`. | صحة ملكية المريض، سعر/مزود خادمي، ومطابقة transaction قبل النقل المالي. |

## حالة العميلين والفجوات المؤكدة

| السطح | الحالة الحالية | الأثر | قرار التنفيذ |
|---|---|---|---|
| Mobile `diagnostics/insurance-approval` | `setInterval` كل 3 ثوانٍ؛ يقرأ `/orders/:id`؛ يحسب coverage/copay/home fee وحساباً مختلطاً محلياً؛ يوجه إلى checkout مع total client. | يخالف منع polling وسلطة السعر/الدفع لدى العميل؛ لا يصلح للإبقاء أو النقل. | يعطل/يستبدل فقط بعد توفر العقد الخادمي الحاكم للتشخيص؛ لا patch تجميلي. |
| Mobile `diagnostics/booking-confirm` و`checkout` | redirect فقط إلى صفحة التشخيص. | لا توجد رحلة دفع أو تأمين حقيقية، ولا ينبغي تسميتها دعماً وظيفياً. | تبنى بعد Backend contracts واختبارات الحالة. |
| Mobile order/detail/tracking | قراءات ومحاولات routes متعددة ظاهرة؛ التفصيل يحتاج تدقيق ownership لكل domain. | لا دليل على parity أو lifecycle مالي. | تدقيق منفصل بعد العقد. |
| Web catalog/detail | قراءة SSR للكتالوج وتفاصيل حجز ضيقة. | لا حجز أو payment أو insurance decision أو cancel/reschedule. | لا توسعة UI قبل إغلاق Backend boundary. |
| Web diagnostic detail | عرض معلومات بلا actions. | لا يمكن للمريض متابعة cash أو insurance بأمان. | يبقى read-only في هذه المرحلة. |

## ترتيب العمل الإلزامي المقترح

1. **حزمة Backend المختبر:** تعريف request مملوك للتأمين أو تعميم آمن للعقد الحالي، DTO حجز صارم، `Idempotency-Key`، ownership، وسعر/مزود/availability خادمية. تثبت اختبارات create replay وowner ورفض price/payment client والتحولات.
2. **حزمة Backend الأشعة:** إغلاق `body spread` والملكية في read/cancel/transition، ربط service/price/provider/slot، ثم تصميم تأمين مستقل قبل ربط generic insurance engine. لا يعاد استعمال عقد المختبر بالافتراض.
3. **حزم الدفع:** capabilities وintent guards لكل domain وحالة قابلة للدفع، ثم webhook settlement واختبارات amount/currency/double-intent. full coverage بلا intent، partial/self-pay فقط بعد قرار/قبول خادمي.
4. **Web وMobile لكل domain:** BFF/clients صغيرة فوق العقود المغلقة، تحديث يدوي فقط، حالات loading/empty/forbidden/error، وروابط من snapshot خادمي. تزال شاشة Mobile الموروثة حين يتوفر البديل وليس قبله.
5. **الإلغاء والاسترداد والتكافؤ:** cancellation/refund source-aware، وmatrix route/action/state مشترك، واختبارات قبول وCI ومراجعة بشرية.

## محظورات هذه المرحلة وما لم يختبر

لا يشغّل هذا التدقيق scheduler أو worker أو queue أو Redis أو migration ولا ينشئ data تجريبية ولا ينشر أو يدمج. لم يثبت PSP checkout حقيقياً، توقيع webhook، Mongo transaction على replica-set، تحمل التزامن عبر عمليات متعددة، صلاحيات مزود/مريض على بيئة حية، قواعد الاسترداد، أو تجربة E2E في Web/Mobile. لذلك تبقى كل رحلات التشخيص **غير معتمدة للإنتاج وغير متكافئة بين العميلين** حتى تنفيذ الحزم اللاحقة واجتياز مراجعتها المستقلة.
