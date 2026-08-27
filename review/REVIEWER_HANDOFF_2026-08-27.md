# طلب مراجعة — فرع إصلاح مزوّدي الخدمات

**الحكم المطلوب:** **REJECT / NO-MERGE / NO-DEPLOY** حتى تُغلق الفجوات الحية المذكورة أدناه بأدلة منفذة. لا يشمل هذا الفرع دمجاً إلى `main` أو نشر خدمة أو تشغيل scheduler/worker أو تنفيذ ترحيل قاعدة بيانات.

| البند | القيمة |
|---|---|
| المستودع | `obaid08642-ops/new` |
| الفرع فقط | `remediation/provider-production-governed` |
| رابط الفرع | https://github.com/obaid08642-ops/new/tree/remediation/provider-production-governed |
| رابط المقارنة | https://github.com/obaid08642-ops/new/compare/main...remediation/provider-production-governed |
| رأس المراجعة الحالي | `f861ba74882abd7be1a0c2282898cb49cd39ce31` قبل توثيق هذا الملف |

## الالتزامات التي يلزم مراجعتها بالترتيب

| الدفعة | SHA الكامل | الرسالة | رابط الالتزام |
|---|---|---|---|
| الاستعادة | `f8cf30c14f2f94344eabfc2acaf65f97bf5ec8ae` | `restore(provider): publish governed provider production remediation` | https://github.com/obaid08642-ops/new/commit/f8cf30c14f2f94344eabfc2acaf65f97bf5ec8ae |
| الحوكمة السابقة | `ac377f4bd821f681b93794d4dd6fe73184a5070f` | `fix(provider): govern service workflow commands` | https://github.com/obaid08642-ops/new/commit/ac377f4bd821f681b93794d4dd6fe73184a5070f |
| PR-1 | `e86d2e375eef6eb63d378934f20eaf35ae01895f` | `fix(pharmacy): gate selected offer fulfillment` | https://github.com/obaid08642-ops/new/commit/e86d2e375eef6eb63d378934f20eaf35ae01895f |
| PR-2 | `539a5086e73002f3c8e6b5f84ed4e3481a9f99a4` | `fix(pharmacy): restrict broadcasts and quote composer` | https://github.com/obaid08642-ops/new/commit/539a5086e73002f3c8e6b5f84ed4e3481a9f99a4 |
| PR-3 | `021d3deb9415ff1c4b8acba606eb3732e0caf44e` | `fix(pharmacy): add durable expiry command` | https://github.com/obaid08642-ops/new/commit/021d3deb9415ff1c4b8acba606eb3732e0caf44e |
| PR-A | `5ed4d26a51e02f7c68e493539aa78dccf4cbda3b` | `fix(pharmacy): persist broadcast recipient intents` | https://github.com/obaid08642-ops/new/commit/5ed4d26a51e02f7c68e493539aa78dccf4cbda3b |
| PR-B | `6920328a36a0d517ecaf5f9cb4a744c63a4ee01d` | `fix(pharmacy): scope insurance to selected pharmacy` | https://github.com/obaid08642-ops/new/commit/6920328a36a0d517ecaf5f9cb4a744c63a4ee01d |
| PR-C | `09d196ff9f87a1fd8e0222929c7b4c5d6ceff728` | `fix(pharmacy): bind fulfillment to payment evidence` | https://github.com/obaid08642-ops/new/commit/09d196ff9f87a1fd8e0222929c7b4c5d6ceff728 |
| احتواء التسليم | `c3f8ba69a45cbeadfd7abef191c10884dd5564d8` | `fix(pharmacy): contain ungoverned delivery commands` | https://github.com/obaid08642-ops/new/commit/c3f8ba69a45cbeadfd7abef191c10884dd5564d8 |
| PR-E أولي | `1427b8ee4f145fa7fb71d0bd0c73e1d64d525f21` | `fix(provider): contain ungoverned shared home` | https://github.com/obaid08642-ops/new/commit/1427b8ee4f145fa7fb71d0bd0c73e1d64d525f21 |
| PR-D | `58f3466be3efecf48d22d436bd0a9b2450a52471` | `fix(pharmacy): minimize broadcast clinical fields` | https://github.com/obaid08642-ops/new/commit/58f3466be3efecf48d22d436bd0a9b2450a52471 |
| harness docs | `14e856f02672c4f8b340ce5ecb7817670ee788a1` | `docs(review): record isolated integration requirements` | https://github.com/obaid08642-ops/new/commit/14e856f02672c4f8b340ce5ecb7817670ee788a1 |
| latest evidence | `501594bc50ac25391781629e933a06b9378804de` | `docs(review): record unified remediation test result` | https://github.com/obaid08642-ops/new/commit/501594bc50ac25391781629e933a06b9378804de |
| surface cards | `a37d9e5d956004f98ffb09cf634aaf5fb0d6cf92` | `docs(review): add provider surface remediation cards` | https://github.com/obaid08642-ops/new/commit/a37d9e5d956004f98ffb09cf634aaf5fb0d6cf92 |
| event reliability | `66006b5130ca6185ab5da800e7e37cbf0918086c` | `fix(pharmacy): surface critical event failures` | https://github.com/obaid08642-ops/new/commit/66006b5130ca6185ab5da800e7e37cbf0918086c |
| governed surfaces/payment intent | `5b89876e0242932ac35ea67a8086cf71f4864657` | `fix(provider): fail closed ungoverned surfaces and payment intents` | https://github.com/obaid08642-ops/new/commit/5b89876e0242932ac35ea67a8086cf71f4864657 |
| legacy contract tests | `708d78290750493ef81dc32254e257c5c575ba41` | `test(provider): align legacy route contracts` | https://github.com/obaid08642-ops/new/commit/708d78290750493ef81dc32254e257c5c575ba41 |
| final artifacts | `ce9c39610da1e43a285b08330d3a8aa6888d0717` | `docs(review): publish final governed artifacts` | https://github.com/obaid08642-ops/new/commit/ce9c39610da1e43a285b08330d3a8aa6888d0717 |
| handoff final | `715b5bb267c753afa077c25d82067770b1f3d0fa` | `docs(review): finalize reviewer handoff` | https://github.com/obaid08642-ops/new/commit/715b5bb267c753afa077c25d82067770b1f3d0fa |
| legacy Orders/refill closure | `49c3d52d7985b67754e12edda191e3f72618885e` | `fix(provider): close legacy pharmacy order creation` | https://github.com/obaid08642-ops/new/commit/49c3d52d7985b67754e12edda191e3f72618885e |
| PharmacyOps read/mutation containment | `40d4cac9939356f917af37539527e240de9c7d90` | `fix(pharmacy): close legacy ops reads and mutations` | https://github.com/obaid08642-ops/new/commit/40d4cac9939356f917af37527e240de9c7d90 |
| durable webhook/payment replay | `8e38c53694620cb98fbddc51db4b304dd3dde888` | `fix(payments): persist evidence before webhook replay` | https://github.com/obaid08642-ops/new/commit/8e38c53694620cb98fbddc51db4b304dd3dde888 |
| Pharmacy UI containment | `a9da4f1a949db06a0b00f3b2cdda86a09391b00a` | `fix(provider): disable ungoverned pharmacy surfaces` | https://github.com/obaid08642-ops/new/commit/a9da4f1a949db06a0b00f3b2cdda86a09391b00a |
| UI acceptance contracts | `f861ba74882abd7be1a0c2282898cb49cd39ce31` | `test(provider): assert pharmacy surfaces are unavailable` | https://github.com/obaid08642-ops/new/commit/f861ba74882abd7be1a0c2282898cb49cd39ce31 |

## ترتيب القراءة والفحص

ابدأ بـ`review/REMEDIATION_2026-08-27.md`، ثم وثائق PR-1 وPR-2 وPR-3. راجع بعد ذلك `review/backend-source-remediation-2026-08-27.patch` و`review/provider-source-remediation-2026-08-27.patch`، وأخيراً مصدر التنفيذ داخل `nabdah-backend.zip` و`NabdProvider-provider.zip`.

| مجال مراجعة | ما يجب التحقق منه |
|---|---|
| الدفع/التأمين/التخصيص | لا allocation أو state progress دون selected offer/version/quote متوافق ودفع مثبت أو قرار تأمين/سياسة COD خادمية. تأكد أن endpoint insurance القديم مقفل. |
| PHI والبث | لا يعتمد التحقق على role literal فقط، ولا تحتوي القائمة أو التفاصيل على phone/address/attachments/patient/raw order. اختبر معرف بث متوقعاً، صيدلية pending، صيدلية غير مُخطرة وdoctor. |
| العرض | الكتالوج هو مصدر الربط والسعر/stock/fee/ETA خادميون. لا يعد العرض بسياسة تسليم حالية؛ النتيجة `unavailable_read_only`. |
| الانتهاء | لا توجد timers أو cron أو workers. تحقق من lease/cursor/transaction/outbox idempotency، ومن أن الانتهاء لا ينفذ allocation أو best-match. تحقق من شرط فهرس outbox قبل أي مستدعٍ. |
| المال/outbox | لا تعتبر outbox intent أو منع swallowed ledger errors تسوية كاملة. اطلب design وتشغيل reconciliation/retry/DLQ قبل أي اعتماد. |

## أدلة محلية أعيد تشغيلها

| الأمر | النتيجة |
|---|---|
| `npm run build` | ناجح. |
| `npm test -- --runInBand` | **102 suites / 534 tests ناجحة**. يتضمن رسالة webhook fail-closed متوقعة لغياب secret محلي. |
| `npx tsc --noEmit` في provider | ناجح. | 
| `npm test -- --runInBand` في provider | **1 suite / 12 tests ناجحة**، بعد إضافة assertions ضد static chat وlegacy prescription/dispatch/wallet/EOD calls. |
| `runtime-data-gate` | لا يوجد script مستقل بهذا الاسم في الرأس الحالي؛ تم تسجيل `RUNTIME_DATA_GATE=PASS` كـsource gate سابق، وليس كاختبار خدمات حي. |
| `unzip -t` للحزمتين | ناجح بعد إعادة التغليف؛ backend تقريباً 5.4 MB وProvider تقريباً 618 KB. |

## التصحيحات المنفذة من قرار pasted_content_8

تم إغلاق `/orders/create` قبل أي lookup أو dispatch أو persistence، وإغلاق refill الذي كان يستدعيه قبل reservation. كما أصبحت كل PharmacyOps reads/mutations compatibility fail-closed، وأضيفت اختبارات عدم لمس repository. أصبح webhook المالي يكتب evidence الحاكم قبل تعليم replay، ويستخدم `emitAsync` للأحداث غير المالية، مع اختبار retry بعد فشل DB. وتم تحويل chat الثابت، prescription legacy، dispatch/delivery، wallet/withdrawal/EOD إلى شاشة unavailable صريحة، مع اختبارات Provider تمنع عودة static chat أو denied-route calls.

## أسباب بقاء الرفض

لا توجد أدلة E2E مع Mongo replica set أو Redis أو PSP/Moyasar webhook/replay أو S3/R2 أو LiveKit أو OTP أو push أو أجهزة Expo. لم ينفذ ترحيل `20260827-pharmacy-expiry-indexes.js`، ولم يفحص على قاعدة بيانات حقيقية التكرارات أو الفهارس أو transactions. لا يوجد worker للـoutbox أو retry/DLQ أو تسوية مالية/reconciliation أو دليل لتسليم مادي فاشل. هذه ليست جاهزية إنتاج ولا إذن دمج أو نشر.

يرجى تعليق المراجعة على الالتزام والملف والسطر، ثم إصدار قرار مستقل بشأن أي ترحيل أو مستدعي انتهاء أو دمج. لا تستخدم force-push ولا تعدّل `main` ضمن هذه المراجعة.
