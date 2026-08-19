# منصة نبض — Phase 16: سجل تنفيذ Sandbox

**الفرع الوحيد:** `manus/on-live-reconciliation`
**المورد المنشور المختبَر:** `e7f3ceb0f50a121ee3726676ec27fc4d5ff09b43`، بحسب تفويض المالك والتحقق المستقل الموثق.
**مرشح Backend الأحدث غير المنشور:** `047b787f42d316624070eadc8e69078e952c5f47`، ويضم مسار الوصفات اليدوية وإصلاح Hospital RBAC.
**الحالة:** **IN PROGRESS**. لا يعامل أي صف بغير دليل request/response/status وstate قبل/بعد وخطوة cleanup، ولا يثبت نشر مرشح الوصفات الأحدث بمجرد دفعه إلى Git.

> تستخدم جميع العمليات أدناه حسابات Sandbox المعتمدة فقط. لا يتضمن هذا السجل JWT أو OTP أو أسماء أو identifiers كاملة أو محتوى طبي أو بيانات دفع حقيقية.

## متطلبات البدء والحالة الراهنة

| المتطلب | المالك | الحالة | الدليل المنقح |
|---|---|---|---|
| عنوان البيئة وإذن اختبار API | Owner/Reviewer | PASS | `https://api.nabd.plus/api/v1` مفوض لحسابات Sandbox فقط |
| health/readiness read-only | البيئة | PASS | `/health/liveness` و`/health/readiness` أعادا HTTP 200 في جولة 2026-08-19 |
| حسابات Patient/Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | Test owner | PASS | تسجيل الدخول الحديث أعاد HTTP 201 لكل الحسابات، و`GET /provider/auth/me` أعاد HTTP 200 للمزودين الستة؛ لا تحفظ الاستجابات أو الرموز في Git |
| نشر إصلاح P0 التمريضي | Reviewer/DevOps | PASS لهذا المورد | commit `e7f3ceb` منشور؛ Doctor أعاد 403 وNursing أعاد 200 لمسار `/nursing/visits` |
| نشر مرشح الوصفات اليدوية وBOLA للمسارات المعدِّلة وإصلاح Hospital RBAC | Reviewer/DevOps | BLOCKED | لا يوجد تفويض نشر منفصل للمرشح `047b787`؛ لا يختبر عقده الجديد حياً قبل النشر |
| backup/rollback وmigration/index preflight للمرشح الجديد | Reviewer/DB owner | BLOCKED | مطلوب قبل نشر المرشح الجديد |
| بيانات lifecycle قابلة للتنظيف لكل مجال | Test owner | PARTIAL | يوجد مورد Unified Booking مملوك سابقاً؛ بقية fixtures يجب اكتشافها أو إنشاؤها بعقد مسموح ثم تنظيفها |
| Moyasar/consent/location/AI/PHI approvals | Owner/Legal/Product | BLOCKED | خارج نطاق أي mutation مالي أو حساس في هذه الجولة |

## سجل الأدلة الحية المنجزة

| الوقت | المورد | actor | العملية | النتيجة | الحكم المقيد |
|---|---|---|---|---|---|
| 2026-08-19 | Unified Booking مملوك | Patient owner / Patient foreign | قراءة المورد نفسه | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط |
| 2026-08-19 | Nursing visits | Doctor Sandbox | `GET /nursing/visits` | HTTP 403 | PASS: منع cross-provider بعد إصلاح P0 |
| 2026-08-19 | Nursing visits | Nursing Sandbox | `GET /nursing/visits` | HTTP 200 وقائمة فارغة | PASS: الدور المصرح يبقى قادراً على القراءة |
| 2026-08-19 | Provider identity | Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | `GET /provider/auth/me` | HTTP 200 لكل حساب | PASS: جلسات Sandbox صالحة؛ لا يثبت lifecycle |
| 2026-08-19 | Lab booking | Patient owner / Patient foreign | `GET /labs/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ المرجع قائم سابقاً وحالته terminal، فلم يعدل |
| 2026-08-19 | Radiology booking | Patient owner / Patient foreign | `GET /radiology/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ لم يقرأ التقرير أو يعدل الحجز |
| 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |
| 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد النشر |

## مصفوفة الحياة التشغيلية

| المجال | السيناريو الأدنى | دليل القبول | الحالة الحالية | الخطوة التالية المقيدة |
|---|---|---|---|---|
| Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | FIX source / live retest required | clinic/cash كشف P0 partial persistence ثم نُظف؛ بعد نشر المرشح ينشأ fixture جديد، ويتحقق 201/CONFIRMED ثم check-in → start → complete |
| Prescription | موعد مملوك للطبيب، دواء معتمد، محاولة foreign patient/appointment | 201 للحالة الصحيحة و404/403 للأجنبي وربط بالموعد | BLOCKED للمرشح الجديد | نشر `047b787` بتفويض منفصل ثم تنفيذ سيناريو الكتالوج واليدوي والبديل |
| Pharmacy | broadcast/claim/dispense/refill/delivery أو pickup | state transition وallocation وBOLA | OPEN | فحص قوائم broadcast/allocation read-only ثم استخدام record Sandbox قابل للتنظيف |
| Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | PARTIAL | Lab booking BOLA وRadiology booking BOLA PASS؛ lifecycle/report access يبقى محجوباً لحين fixture مستقل قابل للتنظيف، ولا تقرأ أو تحفظ تقريراً طبياً |
| Nursing/Hospital | visit response/check-in/note/tracking وstaff/bed flows | ownership والانتقال والتدقيق | PARTIAL | حد التمريض PASS؛ يلزم lifecycle وحماية staff/bed |
| Wallet/Family/Notifications | عملية Sandbox فقط وإشعار/role boundaries | ledger/state/cleanup بلا دفع حقيقي | BLOCKED جزئياً | لا mutation مالية قبل تفعيل Moyasar؛ يمكن اختبار BOLA read-only للعقود المتاحة |
| Provider intake | كل نوع مزود من التسجيل إلى pending/approved | server-owned status ولا dashboard access مبكر | OPEN | يحتاج fixtures تسجيل معزولة أو دليل lifecycle قائم قابل للتنظيف |
| Admin RBAC | إدارة كل دور ومحاولة cross-role | 401/403/404 وسجل تدقيق | PARTIAL | OTP/2FA موثق سابقاً؛ يلزم إدارة role/resource وفق حدود 2FA المصرح بها |
| BOLA | actor A/actor B لكل مورد حساس | رفض متماثل أو 404 مخفي للملكية الأجنبية | PARTIAL | Unified Booking وNursing وLab booking وRadiology booking PASS؛ يضاف prescription/pharmacy والموردات المعدِّلة بعد توفر fixtures أو نشر المرشح |

## قواعد التنفيذ والتنظيف

يستخدم التنفيذ حسابات Sandbox فقط. يسجل كل lifecycle method/path/status ومعرفاً منقحاً وstate قبل/بعد وخطوة cleanup المتاحة من العقد. لا تُنشأ بيانات بوسيلة غير موثقة، ولا يختبر دفع فعلي، ولا يرفق محتوى تقارير أو PII أو أسرار. أي BOLA أو payment أو consent أو PHI failure هو P0 يوقف المجال المتأثر ويولد دليلاً منفصلاً قبل الاستمرار.

## References

[1]: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md` "الخطة الحاكمة ومعيار خروج Phase 16"
[2]: `NABDAH_PHASE16_NURSING_AUTHORIZATION_P0_REMEDIATION_20260819.md` "دليل إصلاح P0 التمريضي والتحقق الحي"
[3]: `NABDAH_PHASE16_PRESCRIPTION_CONTRACT_AND_BOLA_REMEDIATION_20260819.md` "مرشح الوصفات اليدوية وإصلاح BOLA المصدرّي"
