# تقرير تنفيذ منصة المريض — الحالة المرحلية

**التاريخ:** 28 أغسطس 2026  
**المستودع:** [`obaid08642-ops/new`](https://github.com/obaid08642-ops/new)  
**مسار المصدر:** `/home/ubuntu/nabd-source`  
**طبيعة العمل:** فروع وطلبات مراجعة متراصة فقط؛ لا merge ذاتي ولا نشر.

## الخلاصة التنفيذية

تم بناء سلسلة مراجعة كبيرة تغطي Backend وPatient Web وPatient Mobile، وتركزت أولاً على رحلة الصيدلية ثم الاستشارات والتأمين. الصيدلية أصبحت لها حزم حاكمة متتابعة للـbroadcast والعروض والاختيار والتفاوض والـquote والدفع والتأمين في العميلين. الاستشارات والتأمين أصبح لهما عقد Backend أكثر صرامة، ثم حجز ودفع وقرار تأمين في Mobile وWeb. آخر ما أُنجز هو تدقيق تشخيصي موثق ثم بدء حوكمة تأمين المختبر في Backend.

**لا يعني ذلك اكتمال المشروع أو التكافؤ العام أو الجاهزية الإنتاجية.** ما زالت التشخيصات والرعاية المنزلية والتمريض وتدقيق المؤقتات واختبارات PSP/Mongo/E2E والتشغيل على VPS والمراجعة البشرية النهائية غير مكتملة.

## الضوابط التي التزم بها التنفيذ

تم منع customer wallet من مسارات الدفع، ولم يُعتبر redirect أو حالة pending نجاحاً. الدفع الإلكتروني يمر عبر capabilities وintent خادميين عند الحزم التي اكتملت، مع الاقتصار على redirect HTTPS؛ والتأمين الكامل لا ينشئ دفعة صورية. تم إبقاء expiry الخاص بالصيدلية كأمر خادمي ساكن بلا scheduler أو worker أو Redis أو تشغيل migration أو نشر. كما لم تُستخدم مؤقتات `setTimeout`/`setInterval` لبناء حالة أعمال جديدة؛ وقد وُثّق وجود شاشة تشخيص Mobile قديمة تستخدم polling كفجوة يجب استبدالها، لا كحل مقبول.

## سجل الـcommits والـPRs

جميع الطلبات أدناه **مفتوحة للمراجعة** ومتراصة. العمود الأخير هو commit رأس الفرع وقت آخر جرد GitHub.

| PR | العنوان المختصر | الفرع | commit |
|---:|---|---|---|
| [#18](https://github.com/obaid08642-ops/new/pull/18) | static pharmacy offer expiry | `feature/patient-production-pharmacy-expiry-static` | `478a9466d3135a6b12feca1fcbef3d98c5a87428` |
| [#19](https://github.com/obaid08642-ops/new/pull/19) | Web/Mobile parity audit | `feature/patient-production-web-mobile-parity-audit` | `d51261bcff1284d60676ebee17789ee54a799731` |
| [#20](https://github.com/obaid08642-ops/new/pull/20) | pharmacy mutation idempotency | `feature/patient-production-pharmacy-mutation-idempotency` | `4ada62dda5f7c0e050d7c719cb33c7d142f25d3d` |
| [#21](https://github.com/obaid08642-ops/new/pull/21) | pharmacy client-price boundary | `feature/patient-production-pharmacy-client-price-boundary` | `db2a5aecf03babfb14b4a535f2199445f5950ca2` |
| [#22](https://github.com/obaid08642-ops/new/pull/22) | pharmacy backend guard evidence | `feature/patient-production-pharmacy-backend-guard-evidence` | `d399e65c9f5fb1e265593b7e7bf45bdae9df3273` |
| [#23](https://github.com/obaid08642-ops/new/pull/23) | Web governed pharmacy offer selection | `feature/patient-production-web-pharmacy-governed-flow` | `53f99f463b97e8fbc8742108283d29c77315f6bd` |
| [#24](https://github.com/obaid08642-ops/new/pull/24) | Web final quote and COD | `feature/patient-production-web-pharmacy-final-quote` | `b03617646e204ca5653d8deb43291a8d9addd68e` |
| [#25](https://github.com/obaid08642-ops/new/pull/25) | pharmacy payment capabilities | `feature/patient-production-pharmacy-payment-capabilities` | `4dcc5e6b6c526f9d199d1052472588cf162429ba` |
| [#26](https://github.com/obaid08642-ops/new/pull/26) | Web pharmacy online payment | `feature/patient-production-web-pharmacy-online-payment` | `a7783d09e87530325f6b834a9845031ea13a1108` |
| [#27](https://github.com/obaid08642-ops/new/pull/27) | Web pharmacy insurance decision | `feature/patient-production-web-pharmacy-insurance-decision` | `434b772c76c016664e4e68c16577c8b011004bf0` |
| [#28](https://github.com/obaid08642-ops/new/pull/28) | substitute negotiation governance | `feature/patient-production-pharmacy-negotiation-governance` | `ccc0be2f5291f7d9c353d3df563bee5bfabe954c` |
| [#29](https://github.com/obaid08642-ops/new/pull/29) | Web pharmacy negotiation UI | `feature/patient-production-web-pharmacy-negotiation-ui` | `6ce6dd467eae141bfd974457cae650d01a8ce071` |
| [#30](https://github.com/obaid08642-ops/new/pull/30) | Web cart to pharmacy broadcast | `feature/patient-production-web-pharmacy-broadcast-start` | `5a699c16cd7067ba01b0229e58ec598fed502b61` |
| [#31](https://github.com/obaid08642-ops/new/pull/31) | Mobile pharmacy offer selection | `feature/patient-production-mobile-pharmacy-governed-offers` | `cf26d6e28e842f549220eb629212fca580be291b` |
| [#32](https://github.com/obaid08642-ops/new/pull/32) | Mobile pharmacy status/payment | `feature/patient-production-mobile-pharmacy-post-selection` | `84eae8a41f62873aebc251d1c0e527dfc53c0a03` |
| [#33](https://github.com/obaid08642-ops/new/pull/33) | Mobile substitute negotiation | `feature/patient-production-mobile-pharmacy-negotiation` | `aaec49c71f0d538b21975c8fb2257cbb2d439bb0` |
| [#34](https://github.com/obaid08642-ops/new/pull/34) | Mobile pharmacy final quote | `feature/patient-production-mobile-pharmacy-final-quote` | `1e8ccfe4cbe6a7ff43dca8e7b43934f2068bcaa6` |
| [#35](https://github.com/obaid08642-ops/new/pull/35) | Mobile pharmacy insurance decision | `feature/patient-production-mobile-pharmacy-insurance-decision` | `c3de71b3b6d9e908ba0e16e458449d151c84f788` |
| [#36](https://github.com/obaid08642-ops/new/pull/36) | Mobile cart draft to broadcast | `feature/patient-production-mobile-pharmacy-cart-broadcast` | `892195935e9c0338b8f9edfb9fe19585da7ca678` |
| [#37](https://github.com/obaid08642-ops/new/pull/37) | Mobile pharmacy waiting | `feature/patient-production-mobile-pharmacy-waiting` | `f3f0ff0df071c9e84204c826012292b128a9d7a3` |
| [#38](https://github.com/obaid08642-ops/new/pull/38) | Mobile governed pharmacy chat | `feature/patient-production-mobile-pharmacy-chat-route` | `6351a0dd1dc94541c95f1206d3f1b48230882f03` |
| [#39](https://github.com/obaid08642-ops/new/pull/39) | Mobile governed order confirmation | `feature/patient-production-mobile-pharmacy-order-confirm-route` | `6cf6e7ab479bcdf874dba75295bbc78a6129afa0` |
| [#40](https://github.com/obaid08642-ops/new/pull/40) | Mobile pharmacy order history | `feature/patient-production-mobile-pharmacy-order-history` | `ff6a67fa3d903d1c30c35fd676eabe7809de13b8` |
| [#41](https://github.com/obaid08642-ops/new/pull/41) | Mobile pharmacy reorder | `feature/patient-production-mobile-pharmacy-reorder` | `e018ed80be4ca4a1bfe1ac385d810c7efe3ea92b` |
| [#42](https://github.com/obaid08642-ops/new/pull/42) | Mobile pharmacy traceability | `feature/patient-production-mobile-pharmacy-traceability` | `2084698db3bdaf72386b80e74bc3f01e80bf9f54` |
| [#43](https://github.com/obaid08642-ops/new/pull/43) | Mobile prescription intake | `feature/patient-production-mobile-pharmacy-prescription-entry` | `93fb4ba38c92c41fe03c0286d7864db4c0d6518c` |
| [#44](https://github.com/obaid08642-ops/new/pull/44) | Mobile manual pharmacy intake | `feature/patient-production-mobile-pharmacy-manual-intake` | `901f3bfb3c352e68985485048d1574390b2cbd25` |
| [#45](https://github.com/obaid08642-ops/new/pull/45) | Mobile custom intake to broadcast | `feature/patient-production-mobile-pharmacy-custom-intake-route` | `5024eb582d6ea4143232d653c0f505fe190f48c5` |
| [#46](https://github.com/obaid08642-ops/new/pull/46) | Mobile price-free cart | `feature/patient-production-mobile-pharmacy-cart-price-boundary` | `e5f511112c28d5614337d97a37119e757b78c1b4` |
| [#47](https://github.com/obaid08642-ops/new/pull/47) | Mobile cart runtime sanitation | `feature/patient-production-mobile-pharmacy-cart-runtime-sanitize` | `417698adcc50d52dbb31be09c8221592b7f764ad` |
| [#48](https://github.com/obaid08642-ops/new/pull/48) | consultation refund to source | `feature/patient-production-consultation-refund-source` | `041ea89688b1fd7596a3ccc3a560aa82f2d232de` |
| [#49](https://github.com/obaid08642-ops/new/pull/49) | consultation insurance booking | `feature/patient-production-consultation-insurance-create-governance` | `1bee6b81768f553fa1902b0337babc314ab877a4` |
| [#50](https://github.com/obaid08642-ops/new/pull/50) | consultation insurance settlement | `feature/patient-production-consultation-insurance-settlement` | `49aa74c447c1647d10a054b6f3d6bf3343be3f20` |
| [#51](https://github.com/obaid08642-ops/new/pull/51) | insurance co-pay capabilities | `feature/patient-production-insurance-copay-payment-capabilities` | `4157f71e1d0479c60e9b25d2ff7cb87653509b47` |
| [#52](https://github.com/obaid08642-ops/new/pull/52) | consultation card capabilities | `feature/patient-production-consultation-payment-capabilities` | `b5ac12d02de8b3f376d3e076da6c3071e20b264e` |
| [#53](https://github.com/obaid08642-ops/new/pull/53) | rejected-service self-pay | `feature/patient-production-insurance-self-pay-governance` | `9b2bab799b15250905eb9410190e62777264cc83` |
| [#54](https://github.com/obaid08642-ops/new/pull/54) | self-pay capabilities | `feature/patient-production-insurance-self-pay-payment-capabilities` | `0827d5e113002088b44003170e8c65298b3622cf` |
| [#55](https://github.com/obaid08642-ops/new/pull/55) | Mobile governed consultation booking | `feature/patient-production-mobile-consultation-governed-booking` | `e8749e08ff9ea5192a5ba4a12c277503a82968af` |
| [#56](https://github.com/obaid08642-ops/new/pull/56) | Mobile consultation pending | `feature/patient-production-mobile-consultation-pending-governance` | `f08cd7f2511e214b5b73d12c5e40e32ed7c50132` |
| [#57](https://github.com/obaid08642-ops/new/pull/57) | Mobile insurance payment split | `feature/patient-production-mobile-insurance-payment-split-governance` | `a4731b1f23c9ec95611f18cf1ba9ee9e05ffb17c` |
| [#58](https://github.com/obaid08642-ops/new/pull/58) | Web governed consultation booking | `feature/patient-production-web-consultation-governed-booking` | `641af884d80f0f91cdeb841c7eb0ae9095a24fe6` |
| [#59](https://github.com/obaid08642-ops/new/pull/59) | Web consultation payment actions | `feature/patient-production-web-consultation-payment-governance` | `f7c43200d21cb578b3fe9a98fb1cbfc2d02044f9` |
| [#60](https://github.com/obaid08642-ops/new/pull/60) | Web consultation insurance decision | `feature/patient-production-web-consultation-insurance-decision` | `7476848895c5cb261c51f7015145adc4f9d40074` |
| [#61](https://github.com/obaid08642-ops/new/pull/61) | Mobile server service-type routing | `feature/patient-production-mobile-insurance-service-type-governance` | `846dee1a12231304faafac192dca8a6d2c79bdb0` |
| [#62](https://github.com/obaid08642-ops/new/pull/62) | diagnostics service matrix | `feature/patient-production-diagnostics-service-matrix` | `982a710b04642b4e0f675804530b15d6dcb593d3` |
| [#63](https://github.com/obaid08642-ops/new/pull/63) | Lab owned insurance request creation | `feature/patient-production-backend-lab-insurance-governance` | `52846eccccf4298998442a08e43ccda260315387` |

## ما تم تنفيذه حسب المجال

### الصيدلية

تمت إضافة الأمر الساكن `expireDuePharmacyOffers(now, cursor, limit)` مع batches محدودة وlease وaudit/outbox وartifacts migration قابلة للrollback، مع تعطيل الكاتب القديم. وتم فرض idempotency لطفرات طلب المريض، وأسعار خادمية، وقدرات الدفع، والتفاوض الحاكم، وco-pay/self-pay/COD وفق العقود. في Web وMobile اكتملت مسارات broadcast والعروض والاختيار والعرض النهائي والتفاوض والتأمين والدفع والتتبع والسجل وإعادة الطلب ووصفات/إدخالات يدوية ومخصصة. سلة Mobile أصبحت price-free مع sanitation runtime.

### التكافؤ

يوثق PR #19 baseline قدره **66 صفحة Web مقابل 245 مسار Mobile**، ولذلك لا يجوز وصف التكافؤ العام بأنه مكتمل. وثيقة التتبع في PR #42 لقطة زمنية وتحتاج تحديثاً نهائياً بعد اكتمال المجالات.

### الاستشارات والتأمين

أصبح إلغاء الاستشارة يعيد إلى مصدر الدفع بدلاً من customer wallet. إنشاء appointment تأميني ينشئ `InsuranceServiceRequest` مملوكاً ويبقى `PENDING` بلا auto-confirm أو synthetic payment، مع idempotency للإنشاء والإلغاء وإعادة الجدولة. `APPROVED_FULL` يؤكد خادمياً بلا دفع، وco-pay لا يؤكد إلا بعد transaction verified، والرفض يسمح بـself-pay بعد قبول idempotent فقط. أضيفت capabilities وحراس intent للاستشارة وco-pay وself-pay، ثم حُولت Mobile إلى عقد appointment/pending/insurance، وحُول Web إلى `care/appointments` وcapabilities وintent وقرار التأمين مع HTTPS checkout فقط.

### التشخيص — ما أُنجز حتى الآن

تم إنشاء وثيقة [`DIAGNOSTICS_SERVICE_GOVERNANCE_AUDIT.md`](./DIAGNOSTICS_SERVICE_GOVERNANCE_AUDIT.md) في PR #62. أثبت التدقيق أن Web تشخيصياً read-only تقريباً، وأن Mobile يحتوي شاشة تأمين موروثة تستخدم polling كل ثلاث ثوانٍ وحسابات coverage/copay/home fee وtotal من العميل وendpoints قديمة. كما أثبت أن المختبر لديه بعض قواعد provider/payment، لكن التأمين inline بلا request مملوك؛ وأن الأشعة أكثر permissive في body spread والملكية والتأمين.

في PR #63 أضيف إنشاء `InsuranceServiceRequest` مملوك لحجز المختبر التأميني، مع حفظ `insurance_request_id` وpending state فقط، اشتقاق provider من `provider_account_id` الخادمي، idempotency interceptor للحجز، وتعويض بحذف الحجز غير المؤكد إذا فشل إنشاء الطلب. الدليل المحلي كان **66 اختباراً ناجحاً** لاختبارات Labs وInsurance، و`nest build` ناجحاً.

## حالة CI التي تم التحقق منها حديثاً

في آخر فحص GitHub قبل إعداد هذا التقرير كانت البوابات الخمس **SUCCESS** في PRs #56 و#58 و#59 و#60 و#61 و#62. وكانت البوابات الخمس في PR #63 أيضاً **SUCCESS**: Policy/source guard، Backend، shared contracts، Web، Mobile. لا أصف PRs الأقدم #18–#55 بأنها خضراء في هذا التقرير من دون إعادة فحص حديث مستقل؛ بعض الحالات السابقة كانت ناجحة وقت رصدها، لكن إعادة التحقق الكامل لكل السلسلة ما زالت خطوة تدقيق مطلوبة.

## المتبقي والقيود

| الأولوية | العمل المتبقي | سبب عدم اعتباره مكتملاً |
|---|---|---|
| 1 | إكمال قرار تأمين المختبر: full/partial/rejected وربطه بحالات الحجز | PR #63 أنشأ الطلب فقط؛ co-pay/self-pay capabilities وverified settlement لم تُنفذ للمختبر. |
| 2 | تشديد الأشعة | booking body واسع، lookup/provider/price/idempotency وownership والتأمين المالي تحتاج حزمة مستقلة. |
| 3 | إكمال Backend payment settlement للتشخيص | لا دليل PSP/webhook/matching amount على Mongo replica-set. |
| 4 | Web diagnostics | لا توجد رحلة booking/payment/insurance/cancel/reschedule كاملة؛ الموجود catalog/read-only. |
| 5 | Mobile diagnostics | الشاشة الموروثة تحتاج استبدال polling والحساب المحلي والـlegacy endpoints بعقد خادمي. |
| 6 | الرعاية المنزلية والتمريض | لم يبدأ التدقيق والتنفيذ الكاملان بعقود cash/insurance المتطابقة. |
| 7 | تدقيق المؤقتات | يلزم inventory كامل لـWeb/Mobile/Nest، وتصنيف UI-only مقابل polling/business. |
| 8 | expiry architecture | اختيار VPS periodic task أو durable worker مؤجل إلى إجابات التشغيل: أقصى تأخير، حجم العروض، وحالة Redis durability/MISCONF. |
| 9 | release evidence | يلزم تحديث parity/traceability ledger وإعادة فحص كل CI ومراجعة بشرية وmigration/rollback/replica-set drill. |

## الخطوات التالية في الخطة

أولاً، إصلاح/مراجعة حزمة قرار المختبر الحالية واختبار انتقالات full وpartial وrejected دون إنشاء دفع. ثانياً، إضافة capabilities وco-pay/self-pay settlement للمختبر بحيث يكون المبلغ server-derived ولا يتم التأكيد إلا عبر transaction verified/webhook. ثالثاً، تكرار التدفق نفسه للأشعة بعد إغلاق body spread والملكية والسعر والمزود. رابعاً، بناء BFF وواجهات Web ثم Mobile للتشخيص من snapshots الخادمية، مع manual refresh فقط وإظهار loading/error/forbidden، ثم إضافة الإلغاء والاسترداد. خامساً، تدقيق الرعاية المنزلية والتمريض بالطريقة نفسها. سادساً، تنفيذ inventory المؤقتات وCI/parity/traceability النهائية، ثم تجهيز سجل المراجع.

## حالة مساحة العمل عند إعداد التقرير

آخر commit مستقر مرفوع قبل حزمة قرار المختبر هو `52846ecc` في PR #63، ثم اجتازت حزمة قرارات التأمين المحلية commit `89fd21e2` اختبارات Backend والبناء، لكنها لم تكن مرفوعة عند لحظة إعداد النسخة الأولى من التقرير. بعد رفعها ستكون جزءاً من PR مستقل فوق #63. لا يوجد merge أو deploy.

## الأدلة المرجعية داخل المستودع

1. [`docs/release/PATIENT_WEB_MOBILE_PARITY_AUDIT.md`](./PATIENT_WEB_MOBILE_PARITY_AUDIT.md) — خط أساس التكافؤ وحدوده.
2. [`docs/release/TRACEABILITY_MATRIX.md`](./TRACEABILITY_MATRIX.md) — مصفوفة التتبع السابقة.
3. [`docs/release/DIAGNOSTICS_SERVICE_GOVERNANCE_AUDIT.md`](./DIAGNOSTICS_SERVICE_GOVERNANCE_AUDIT.md) — تدقيق المختبر والأشعة.
4. [`todo.md`](../../todo.md) — سجل المهام والقيود المرحلية.
5. [سلسلة PRs في GitHub](https://github.com/obaid08642-ops/new/pulls) — الفروع والمراجعة وحالات CI.

> **الحكم النهائي:** العمل متقدم وموثق على شكل حزم مراجعة، لكنه ليس مكتملاً ولا متكافئاً بالكامل ولا مثبتاً كجاهز للإنتاج. يلزم إكمال المجالات والاختبارات التشغيلية والمراجعة البشرية قبل أي اعتماد أو نشر.
