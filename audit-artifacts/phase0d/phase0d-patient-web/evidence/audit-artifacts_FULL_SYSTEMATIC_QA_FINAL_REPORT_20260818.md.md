# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_SYSTEMATIC_QA_FINAL_REPORT_20260818.md`
- **Member SHA-256:** `600c1f375983ae8f94ef6cf2483a8079db319b9962956fc5ed2f59ecb07af08f`
- **Line count:** 120
- **Read range:** `1-120`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `26: | Patient BOLA mutation | Patient-2 يحاول cancel order Patient-1 | 403 PASS | `PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json` |`
- `29: | Provider doctor | login/progress/notifications/wallet | PASS مع my-profile drift | `PROVIDER_READONLY_FINDINGS_20260818.md` و`PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md` |`
- `56: LabDashboard يستعمل نحو 30 استدعاء تحت `/labs/bookings/*`. توجد في snapshot عائلتان متداخلتان: `LabsController` التي تستخدم `CurrentUser` وتفوض إلى `LabsService`، و`LabsEngineController` legacy التي تعرض `/labs/bookings/queue` و`/:id/respon`
- `58: هذا مصنف **CONTRACT_RECONCILIATION_BLOCKED / SOURCE_SECURITY_DRIFT** وليس exploit حياً مؤكداً حتى تتم مطابقة route exposure مع الصورة المنشورة. يلزم حذف المسار legacy أو تقويته مركزياً، ثم اختبار provider role وownership وstate transitions.`
- `66: المسار المالي توقف سابقاً عند `502 payment_gateway_unavailable` لأن حساب Moyasar غير مفعّل للوضع الحي. هذا ليس عيب adapter يمكن تجاوزه بـmock. يلزم تفعيل تجاري رسمي من المالك قبل اختبار payment intent/webhook/refund الحقيقي. لا يُسمح بتحويل`
- `74: أثبتت المصفوفة الحية أن order ownership يعمل للقراءة والإلغاء، وأن report.pdf محمي بالملكية. كما أن إصلاح RolesGuard وprovider_type، وإصلاحات Provider placeholders/routes، واجتياز اختبارات Provider وTypeScript، كلها موثقة على فرع المصالحة. `
- `94: أولاً، يجب توفير بيئة sandbox تشغيلية كاملة تحتوي طلباً pre-report لكل خدمة، مرتبطة فعلياً بحساب المزود المقابل، مع السماح بتسجيل before/after وcleanup. ثانياً، يجب حسم مصدر Admin authoritative وإزالة كل fallback مصطنع قبل build وroute/butt`
- `98: [1] [Full Systematic QA execution register](FULL_SYSTEMATIC_QA_EXECUTION_REGISTER_20260818.md)`
- `102: [3] [Patient exact-read retry](PATIENT_EXACT_READ_RETRY_20260818.json)`
- `106: [5] [Patient BOLA cancel before/after](PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json)`
### backend_consumers_or_contracts
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `29: | Provider doctor | login/progress/notifications/wallet | PASS مع my-profile drift | `PROVIDER_READONLY_FINDINGS_20260818.md` و`PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md` |`
- `30: | Provider laboratory | progress/notifications/wallet/inbox/samples | PASS للقراءة | `PROVIDER_LAB_EXACT_READ_20260818.json` و`LAB_INBOX_ELIGIBILITY_SUMMARY_20260818.json` |`
- `31: | Provider radiology | progress/notifications/wallet/inbox/services | PASS للقراءة | `PROVIDER_RADIOLOGY_EXACT_READ_20260818.json` |`
- `33: | Provider nursing | progress/notifications/wallet/visits | PASS للقراءة، القائمة فارغة | `PROVIDER_NURSING_EXACT_READ_20260818.json` |`
- `56: LabDashboard يستعمل نحو 30 استدعاء تحت `/labs/bookings/*`. توجد في snapshot عائلتان متداخلتان: `LabsController` التي تستخدم `CurrentUser` وتفوض إلى `LabsService`، و`LabsEngineController` legacy التي تعرض `/labs/bookings/queue` و`/:id/respon`
- `74: أثبتت المصفوفة الحية أن order ownership يعمل للقراءة والإلغاء، وأن report.pdf محمي بالملكية. كما أن إصلاح RolesGuard وprovider_type، وإصلاحات Provider placeholders/routes، واجتياز اختبارات Provider وTypeScript، كلها موثقة على فرع المصالحة. `
- `84: | Pharmacy/Lab/Radiology/Nursing full lifecycle | مفتوحة أو BLOCKED لغياب fixtures مؤهلة |`
- `87: | WebSocket/OTP/2FA | OTP/2FA مغلقة سابقاً؛ WebSocket والأجهزة تحتاج أدلة الجولة الخاصة بها |`
### auth_ownership
- `9: **النطاق:** Patient App، Provider App، Admin Dashboard، Backend contracts، الأمن، الإنتاج، وسجل الأدلة.`
- `15: > تم إغلاق مجموعة مهمة من بوابات الأمن والعقود المصدرية، لكن لم تُغلق بعد دورة الحياة التشغيلية الكاملة لكل خدمة، ولا مصدر Admin authoritative، ولا تعارض عقود المختبر legacy، ولا اختبار الأجهزة الفعلية/المزرعة، ولا تفعيل بوابة الدفع التجاري`
- `17: النتائج الموثقة تنقسم إلى ثلاث فئات. فئة **PASS** تشمل بوابة صحة الإنتاج، قراءات sandbox، BOLA بين مريضين، حماية report.pdf، Provider build gates، وإصلاحات Provider source contracts. فئة **BLOCKED** تشمل lifecycle mutations التي لا تملك طلب`
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `27: | Owner state | Patient-1 قبل/بعد محاولة الغريب | 200/200، نفس الحجم | نفس artifact السابق |`
- `29: | Provider doctor | login/progress/notifications/wallet | PASS مع my-profile drift | `PROVIDER_READONLY_FINDINGS_20260818.md` و`PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md` |`
- `34: | Hospital provider | reads، staff ordinary role | 403 متوقع للـstaff | `PROVIDER_HOSPITAL_EXACT_READ_20260818.json` |`
- `50: لم يُنفذ قبول أو رفض أو بدء زيارة أو جمع عينة أو رفع تقرير على بيانات غير مؤهلة. Pharmacy لديها order pending حقيقي، لكن حساب Pharmacy sandbox لديه `started:false` وbroadcast فارغ ولا توجد مطابقة ملكية مؤكدة. Lab inbox يحتوي طلباً بحالة `RE`
- `56: LabDashboard يستعمل نحو 30 استدعاء تحت `/labs/bookings/*`. توجد في snapshot عائلتان متداخلتان: `LabsController` التي تستخدم `CurrentUser` وتفوض إلى `LabsService`، و`LabsEngineController` legacy التي تعرض `/labs/bookings/queue` و`/:id/respon`
- `58: هذا مصنف **CONTRACT_RECONCILIATION_BLOCKED / SOURCE_SECURITY_DRIFT** وليس exploit حياً مؤكداً حتى تتم مطابقة route exposure مع الصورة المنشورة. يلزم حذف المسار legacy أو تقويته مركزياً، ثم اختبار provider role وownership وstate transitions.`
- `60: ### 3. Admin source scope وبيانات مالية مصطنعة`
- `62: جرد Admin الكامل خارج شجرة المصالحة الحالية. في snapshot Admin توجد fallbacks صريحة في disputes: `amount || 150`، وأسماء مريض/مزود اصطناعية، وسبب نزاع اصطناعي. لم يتم تعديل هذا snapshot لأنه لم يُثبت أنه المصدر authoritative للفرع. يجب تحدي`
### state_transitions
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `26: | Patient BOLA mutation | Patient-2 يحاول cancel order Patient-1 | 403 PASS | `PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json` |`
- `27: | Owner state | Patient-1 قبل/بعد محاولة الغريب | 200/200، نفس الحجم | نفس artifact السابق |`
- `50: لم يُنفذ قبول أو رفض أو بدء زيارة أو جمع عينة أو رفع تقرير على بيانات غير مؤهلة. Pharmacy لديها order pending حقيقي، لكن حساب Pharmacy sandbox لديه `started:false` وbroadcast فارغ ولا توجد مطابقة ملكية مؤكدة. Lab inbox يحتوي طلباً بحالة `RE`
- `58: هذا مصنف **CONTRACT_RECONCILIATION_BLOCKED / SOURCE_SECURITY_DRIFT** وليس exploit حياً مؤكداً حتى تتم مطابقة route exposure مع الصورة المنشورة. يلزم حذف المسار legacy أو تقويته مركزياً، ثم اختبار provider role وownership وstate transitions.`
- `66: المسار المالي توقف سابقاً عند `502 payment_gateway_unavailable` لأن حساب Moyasar غير مفعّل للوضع الحي. هذا ليس عيب adapter يمكن تجاوزه بـmock. يلزم تفعيل تجاري رسمي من المالك قبل اختبار payment intent/webhook/refund الحقيقي. لا يُسمح بتحويل`
- `88: | Consent/QR/emergency location/error registry | fail-closed بانتظار اعتماد المالك القانوني/المنتجي |`
- `102: [3] [Patient exact-read retry](PATIENT_EXACT_READ_RETRY_20260818.json)`
- `106: [5] [Patient BOLA cancel before/after](PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json)`
### payment_insurance_relevance
- `17: النتائج الموثقة تنقسم إلى ثلاث فئات. فئة **PASS** تشمل بوابة صحة الإنتاج، قراءات sandbox، BOLA بين مريضين، حماية report.pdf، Provider build gates، وإصلاحات Provider source contracts. فئة **BLOCKED** تشمل lifecycle mutations التي لا تملك طلب`
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `29: | Provider doctor | login/progress/notifications/wallet | PASS مع my-profile drift | `PROVIDER_READONLY_FINDINGS_20260818.md` و`PROVIDER_MY_PROFILE_SOURCE_DRIFT_20260818.md` |`
- `30: | Provider laboratory | progress/notifications/wallet/inbox/samples | PASS للقراءة | `PROVIDER_LAB_EXACT_READ_20260818.json` و`LAB_INBOX_ELIGIBILITY_SUMMARY_20260818.json` |`
- `31: | Provider radiology | progress/notifications/wallet/inbox/services | PASS للقراءة | `PROVIDER_RADIOLOGY_EXACT_READ_20260818.json` |`
- `33: | Provider nursing | progress/notifications/wallet/visits | PASS للقراءة، القائمة فارغة | `PROVIDER_NURSING_EXACT_READ_20260818.json` |`
- `42: تم تنظيف قيم onboarding التجارية والمكانية الافتراضية من الطبيب والصيدلية والمختبر والأشعة والتمريض، بما في ذلك الأسعار، الإحداثيات، الساعات، أيام العمل، التغطية، وسياسة cash-only. أضيفت guards تمنع إرسال تسجيل ناقص عند اختيار خدمة دون سعر/`
- `66: المسار المالي توقف سابقاً عند `502 payment_gateway_unavailable` لأن حساب Moyasar غير مفعّل للوضع الحي. هذا ليس عيب adapter يمكن تجاوزه بـmock. يلزم تفعيل تجاري رسمي من المالك قبل اختبار payment intent/webhook/refund الحقيقي. لا يُسمح بتحويل`
- `74: أثبتت المصفوفة الحية أن order ownership يعمل للقراءة والإلغاء، وأن report.pdf محمي بالملكية. كما أن إصلاح RolesGuard وprovider_type، وإصلاحات Provider placeholders/routes، واجتياز اختبارات Provider وTypeScript، كلها موثقة على فرع المصالحة. `
- `86: | Moyasar financial E2E | مؤجلة إلى تفعيل المالك |`
- `94: أولاً، يجب توفير بيئة sandbox تشغيلية كاملة تحتوي طلباً pre-report لكل خدمة، مرتبطة فعلياً بحساب المزود المقابل، مع السماح بتسجيل before/after وcleanup. ثانياً، يجب حسم مصدر Admin authoritative وإزالة كل fallback مصطنع قبل build وroute/butt`
### error_empty_loading_retry_cancel
- `17: النتائج الموثقة تنقسم إلى ثلاث فئات. فئة **PASS** تشمل بوابة صحة الإنتاج، قراءات sandbox، BOLA بين مريضين، حماية report.pdf، Provider build gates، وإصلاحات Provider source contracts. فئة **BLOCKED** تشمل lifecycle mutations التي لا تملك طلب`
- `24: | Patient auth/read | login ثم doctors/appointments/notifications/wallet/orders/insurance | PASS | `PATIENT_EXACT_READ_RETRY_20260818.json` |`
- `26: | Patient BOLA mutation | Patient-2 يحاول cancel order Patient-1 | 403 PASS | `PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json` |`
- `50: لم يُنفذ قبول أو رفض أو بدء زيارة أو جمع عينة أو رفع تقرير على بيانات غير مؤهلة. Pharmacy لديها order pending حقيقي، لكن حساب Pharmacy sandbox لديه `started:false` وbroadcast فارغ ولا توجد مطابقة ملكية مؤكدة. Lab inbox يحتوي طلباً بحالة `RE`
- `88: | Consent/QR/emergency location/error registry | fail-closed بانتظار اعتماد المالك القانوني/المنتجي |`
- `102: [3] [Patient exact-read retry](PATIENT_EXACT_READ_RETRY_20260818.json)`
- `106: [5] [Patient BOLA cancel before/after](PATIENT2_BOLA_CANCEL_BEFORE_AFTER_20260818.json)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
