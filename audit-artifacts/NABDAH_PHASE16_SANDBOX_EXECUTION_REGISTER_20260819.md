# منصة نبض — Phase 16: سجل تنفيذ Sandbox الجاهز للمراجع

**المرشح المطلوب:** `b08035556e2febc43035a6540e88746151362317` على `manus/on-live-reconciliation`  
**الحالة الآن:** **BLOCKED — لا يوجد تفويض نشر مراجع أو تأكيد أن بيئة Sandbox تحمل هذا المرشح.**  
**قاعدة السجل:** لا تسجل أي حالة PASS إلا مع request/response/status/IDs/state before-after/cleanup حقيقية من Sandbox، ومن دون PII أو OTP أو JWT في Git.

## متطلبات البدء

| المطلوب | المالك | الحالة |
|---|---|---|
| بيئة Sandbox محددة وعنوانها | Reviewer/DevOps | BLOCKED |
| تأكيد نشر commit/artifact المرشح وبصمته | Reviewer/DevOps | BLOCKED |
| backup/rollback وإجراء migration/index preflight | Reviewer/DevOps/DB owner | BLOCKED |
| حسابات Sandbox معزولة وأدوار Patient/Doctor/Pharmacy/Lab/Nurse/Hospital/Admin | Test owner | BLOCKED |
| بيانات اختبار مولدة ومعرفات تنظيف محددة | Test owner | BLOCKED |
| حدود Moyasar/consent/location/AI/PHI القانونية | Owner/Legal/Product | BLOCKED |

## مصفوفة الحياة التشغيلية المطلوبة

| المجال | السيناريو الأدنى | دليل القبول | الحالة |
|---|---|---|---|
| Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | BLOCKED |
| Prescription | موعد مملوك للطبيب، دواء معتمد، محاولة foreign patient/appointment | 201 للحالة الصحيحة و404/403 للحالة الأجنبية، وربط prescription بالموعد | BLOCKED |
| Pharmacy | broadcast/claim/dispense/refill/delivery أو pickup | state transition وallocation وBOLA | BLOCKED |
| Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | BLOCKED |
| Nursing/Hospital | visit response/check-in/note/tracking وstaff/bed flows | ownership والانتقال والتدقيق | BLOCKED |
| Wallet/Family/Notifications | عملية Sandbox فقط وإشعار/role boundaries | ledger/state/cleanup بلا دفع حقيقي | BLOCKED |
| Provider intake | كل نوع مزود من التسجيل إلى حالة pending/approved | server-owned status ولا dashboard access مبكر | BLOCKED |
| Admin RBAC | إدارة كل دور ومحاولة cross-role | 401/403/404 المتوقعة وسجل تدقيق | BLOCKED |
| BOLA | مصفوفة actor A/actor B لكل مورد حساس | رفض متماثل أو 404 مخفي للملكية الأجنبية | BLOCKED |

## قواعد التنفيذ والـcleanup

تستخدم الطلبات حسابات Sandbox فقط، وتولد records بعلامة run ID يحددها المراجع. لا يرفق السجل أي سر أو رمز أو رقم وطني أو اسم مريض أو تقرير طبي. بعد كل lifecycle تسجل IDs منقحة وstate قبل/بعد، ثم تحذف أو تؤرشف بيانات الاختبار بعقد معتمد. فشل أي BOLA أو payment/consent/PHI rule يعامل كـP0 ويوقف السيناريو المرتبط.

> لا ينفذ agent هذا السجل قبل تفويض المراجع الصريح بنشر المرشح إلى Sandbox. وجود backend منشور لا يثبت أنه يحمل commit المرشح ولا يسمح باعتباره دليل Phase 16.
