# تقرير التدقيق المنهجي الشامل لمنصة نبض

**الإصدار:** 2026-08-18

**الفرع المرجعي:** `manus/on-live-reconciliation`

**آخر commit موثق:** `ffbfff0`

**النطاق:** Patient App، Provider App، Admin Dashboard، Backend contracts، الأمن، الإنتاج، وسجل الأدلة.

## الحكم التنفيذي

> **الحكم: NOT READY FOR FULL LAUNCH CERTIFICATION.**
>
> تم إغلاق مجموعة مهمة من بوابات الأمن والعقود المصدرية، لكن لم تُغلق بعد دورة الحياة التشغيلية الكاملة لكل خدمة، ولا مصدر Admin authoritative، ولا تعارض عقود المختبر legacy، ولا اختبار الأجهزة الفعلية/المزرعة، ولا تفعيل بوابة الدفع التجارية. لذلك لا يجوز تقديم الحالة الحالية على أنها جاهزية إطلاق كاملة أو تكافؤ إنتاجي شامل مع منصات السوق.

النتائج الموثقة تنقسم إلى ثلاث فئات. فئة **PASS** تشمل بوابة صحة الإنتاج، قراءات sandbox، BOLA بين مريضين، حماية report.pdf، Provider build gates، وإصلاحات Provider source contracts. فئة **BLOCKED** تشمل lifecycle mutations التي لا تملك طلباً أو assignment sandbox مؤهلاً، مصدر Admin غير المرتبط بالمصالحة، تعارض LabDashboard مع legacy controller، تفعيل Moyasar التجاري، واختبارات الأجهزة الواقعية. أما **INCONCLUSIVE** فتمثل timeout قديم لـPatient exact-read وقد أُعيدت القراءة لاحقاً بنجاح، لذلك لا تُحسب كفشل وظيفي.

## مصفوفة النتائج الحية

| المجال | الاختبار | النتيجة | الدليل |
|---|---|---:|---|
| Production health | liveness/readiness وMongoDB/Redis | PASS | `PRODUCTION_HEALTH_GATE_20260818.json` |
| Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |
| Patient BOLA | Patient-2 يقرأ order Patient-1 | 403 PASS | `PATIENT2_BOLA_READ_20260818.json` |
| Patient BOLA mutation | Patient-2 يحاول cancel order Patient-1 | 403 PASS | `PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json` |
| Owner state | Patient-1 قبل/بعد محاولة الغريب | 200/200، نفس الحجم | نفس artifact السابق |
| Report PDF BOLA | المالك مقابل الغريب | 200/403 PASS | `PATIENT2_BOLA_REPORT_RECHECK_20260818.json` |
| Provider doctor | login/progress/notifications/wallet | PASS مع my-profile drift | `PROVIDER_READONLY_FINDINGS_20260818.md` و`PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md` |
| Provider laboratory | progress/notifications/wallet/inbox/samples | PASS للقراءة | `PROVIDER_LAB_EXACT_READ_20260818.json` و`LAB_INBOX_ELIGIBILITY_SUMMARY_20260818.json` |
| Provider radiology | progress/notifications/wallet/inbox/services | PASS للقراءة | `PROVIDER_RADIOLOGY_EXACT_READ_20260818.json` |
| Provider pharmacy | broadcast/history reads | PASS للعقود المصححة | `PROVIDER_PHARMACY_EXACT_READ_20260818.json` |
| Provider nursing | progress/notifications/wallet/visits | PASS للقراءة، القائمة فارغة | `PROVIDER_NURSING_EXACT_READ_20260818.json` |
| Hospital provider | reads، staff ordinary role | 403 متوقع للـstaff | `PROVIDER_HOSPITAL_EXACT_READ_20260818.json` |
| Provider build | TypeScript، Jest، Expo export، prebuild | PASS | `PROVIDER_EXPO_BUILD_BLOCKER_20260818.md` بعد الاستعادة، وسجل commits |
| Audit report app | install/build/check | PASS | `AUDIT_REPORT_BUILD_GATE_20260818.md` |

## الإصلاحات المصدرية الموثقة

تمت إزالة أزرار Pharmacy الوهمية التي كانت تعرض barcode ثابتاً أو تقبل Broadcast برسالة محلية دون backend. أصبح broadcast حياً، وأصبح الماسح fail-closed. تم تحويل زر رفع صور الأشعة من رسالة `Coming with S3` إلى حالة غير مفعّلة صريحة لا تدّعي رفعاً غير موجود.

تم تنظيف قيم onboarding التجارية والمكانية الافتراضية من الطبيب والصيدلية والمختبر والأشعة والتمريض، بما في ذلك الأسعار، الإحداثيات، الساعات، أيام العمل، التغطية، وسياسة cash-only. أضيفت guards تمنع إرسال تسجيل ناقص عند اختيار خدمة دون سعر/مدة/موقع أو نطاق مناسب. أزيلت fallback literals للطبيب، وأضيفت اختبارات ارتدادية تمنع رجوع البيانات المصطنعة.

تمت مواءمة PharmacyDashboard مع controllers الفعلية: broadcast GET، accept، reject، وسجل allocations المكتمل. أضيفت assertions مباشرة لمسارات هذه العقود، واجتازت الاختبارات 5/5. كما استُعيد `provider-app/App.tsx` الحقيقي والملفات المشتركة المطلوبة من snapshot موثق، فنجح Android export وExpo prebuild بدلاً من إنشاء entrypoint تخميني.

## أهم المخاطر المفتوحة

### 1. دورات lifecycle غير قابلة للإغلاق حالياً

لم يُنفذ قبول أو رفض أو بدء زيارة أو جمع عينة أو رفع تقرير على بيانات غير مؤهلة. Pharmacy لديها order pending حقيقي، لكن حساب Pharmacy sandbox لديه `started:false` وbroadcast فارغ ولا توجد مطابقة ملكية مؤكدة. Lab inbox يحتوي طلباً بحالة `REPORTED` فقط، وليس طلباً pre-report يصلح للقبول أو الجمع. Radiology وNursing inboxes فارغة، وHospital staff يحتاج حساب hospital-admin منفصلاً.

هذه ليست نجاحات مخفية ولا failures مختلقة؛ التصنيف الصحيح هو **BLOCKED_NO_ELIGIBLE_SANDBOX_REQUEST/ASSIGNMENT**. يجب توفير sandbox fixtures مرتبطة فعلياً بالمزودين أو تنفيذ setup مالك معتمد، ثم إعادة دورة كل خدمة من الإنشاء إلى الإتمام مع before/after وcleanup.

### 2. تعارض عقود المختبر وlegacy security drift

LabDashboard يستعمل نحو 30 استدعاء تحت `/labs/bookings/*`. توجد في snapshot عائلتان متداخلتان: `LabsController` التي تستخدم `CurrentUser` وتفوض إلى `LabsService`، و`LabsEngineController` legacy التي تعرض `/labs/bookings/queue` و`/:id/respond` و`collect-sample` و`finalize-test` دون حراسة أو ownership ظاهرة، مع الثقة في `lab_id` من query/body. لم تُرسل أي mutation إلى هذه المسارات.

هذا مصنف **CONTRACT_RECONCILIATION_BLOCKED / SOURCE_SECURITY_DRIFT** وليس exploit حياً مؤكداً حتى تتم مطابقة route exposure مع الصورة المنشورة. يلزم حذف المسار legacy أو تقويته مركزياً، ثم اختبار provider role وownership وstate transitions.

### 3. Admin source scope وبيانات مالية مصطنعة

جرد Admin الكامل خارج شجرة المصالحة الحالية. في snapshot Admin توجد fallbacks صريحة في disputes: `amount || 150`، وأسماء مريض/مزود اصطناعية، وسبب نزاع اصطناعي. لم يتم تعديل هذا snapshot لأنه لم يُثبت أنه المصدر authoritative للفرع. يجب تحديد مستودع Admin الصحيح، إزالة fallback المالي والوصفي، إضافة regression tests، ثم إصلاح Next.js build blocker والتحقق من build كامل.

### 4. الدفع التجاري

المسار المالي توقف سابقاً عند `502 payment_gateway_unavailable` لأن حساب Moyasar غير مفعّل للوضع الحي. هذا ليس عيب adapter يمكن تجاوزه بـmock. يلزم تفعيل تجاري رسمي من المالك قبل اختبار payment intent/webhook/refund الحقيقي. لا يُسمح بتحويل هذا إلى PASS برمجياً.

### 5. الأجهزة والمتاجر

Provider Android export وprebuild نجحا، لكن هذا لا يساوي APK موزعاً أو اختباراً على ثلاثة مقاسات/إصدارات أو Firebase Test Lab أو TestFlight. ما زالت إشعارات push والمكالمات المغلقة وLiveKit وGPS الحقيقي وRTL على أجهزة فعلية بحاجة إلى تنفيذ المالك/المزرعة، كما أن iOS يحتاج Apple Developer/TestFlight لإغلاقه واقعياً.

## بوابات الأمن المغلقة

أثبتت المصفوفة الحية أن order ownership يعمل للقراءة والإلغاء، وأن report.pdf محمي بالملكية. كما أن إصلاح RolesGuard وprovider_type، وإصلاحات Provider placeholders/routes، واجتياز اختبارات Provider وTypeScript، كلها موثقة على فرع المصالحة. هذه النتائج لا تعني أن كل object family أو كل mutation في النظام قد اختُبر؛ يجب تكرار BOLA لكل appointments/reports/notifications/wallet/provider objects وفق IDs حقيقية sandbox.

## قرار الإطلاق

| بوابة | القرار |
|---|---|
| Backend security gates السابقة وBOLA order/report | مغلقة ضمن النطاق المختبر |
| Production health | مغلقة وقت الجولة |
| Patient exact read وBOLA الحالي | مغلق ضمن IDs المختبرة |
| Provider source/build gates | مغلقة ضمن snapshot والاختبارات الحالية |
| Pharmacy/Lab/Radiology/Nursing full lifecycle | مفتوحة أو BLOCKED لغياب fixtures مؤهلة |
| Admin full build/source remediation | مفتوحة |
| Moyasar financial E2E | مؤجلة إلى تفعيل المالك |
| WebSocket/OTP/2FA | OTP/2FA مغلقة سابقاً؛ WebSocket والأجهزة تحتاج أدلة الجولة الخاصة بها |
| Consent/QR/emergency location/error registry | fail-closed بانتظار اعتماد المالك القانوني/المنتجي |
| Physical devices/store readiness | مفتوحة |
| Full launch certification | **مرفوضة حالياً** |

## ما يلزم للإغلاق النهائي

أولاً، يجب توفير بيئة sandbox تشغيلية كاملة تحتوي طلباً pre-report لكل خدمة، مرتبطة فعلياً بحساب المزود المقابل، مع السماح بتسجيل before/after وcleanup. ثانياً، يجب حسم مصدر Admin authoritative وإزالة كل fallback مصطنع قبل build وroute/button audit. ثالثاً، يجب حسم تعارض LabEngine legacy وإثبات أن كل مسارات LabDashboard محمية بالهوية والدور والملكية. رابعاً، يجب تنفيذ اختبارات الأجهزة والمزرعة ثم اختبار المالك للهاتفين الحقيقيين. وأخيراً، يجب تفعيل Moyasar تجارياً ومراجعة العقود الأربعة قبل تحويل BLOCKED إلى PASS.

## مراجع الأدلة الداخلية

[1] [Full Systematic QA execution register](FULL_SYSTEMATIC_QA_EXECUTION_REGISTER_20260818.md)

[2] [Phase 5 revalidation summary](PHASE5_REVALIDATION_SUMMARY_20260818.md)

[3] [Patient exact-read retry](PATIENT_EXACT_READ_RETRY_20260818.json)

[4] [Patient BOLA read](PATIENT2_BOLA_READ_20260818.json)

[5] [Patient BOLA cancel before/after](PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json)

[6] [Patient report PDF BOLA recheck](PATIENT2_BOLA_REPORT_RECHECK_20260818.json)

[7] [Lab contract reconciliation blocker](LAB_CONTRACT_RECONCILIATION_BLOCKER_20260818.md)

[8] [Legacy LabsEngine auth drift](LABS_ENGINE_LEGACY_AUTH_DRIFT_20260818.md)

[9] [Admin disputes source-scope blocker](ADMIN_DISPUTES_SOURCE_SCOPE_BLOCKER_20260818.md)

[10] [Provider readonly findings](PROVIDER_READONLY_FINDINGS_20260818.md)

[11] [Provider Expo/build evidence](PROVIDER_EXPO_BUILD_BLOCKER_20260818.md)

[12] [Audit-report build gate](AUDIT_REPORT_BUILD_GATE_20260818.md)
