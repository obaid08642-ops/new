# منصة نبض — Phase 16: سجل تنفيذ Sandbox

**الفرع الوحيد:** `manus/on-live-reconciliation`
**البيئة المنشورة المختبرة:** أفاد المالك بالنشر في 2026-08-20؛ لا يكشف API بصمة source SHA، لذلك يثبت كل إصلاح فقط بنتيجة حيّة محددة أدناه ولا ينسب إلى commit غير ظاهر.
**مرشح Backend الأحدث غير المنشور:** `1871223c6c6a70cf3f38b8555d67ff1693aba382`، ويضم إصلاح P0 لهوية Doctor عند إنشاء الوصفة فوق المسارات التي ثبتت حياً في الجولة الحالية.
**الحالة:** **IN PROGRESS**. لا يعامل أي صف بغير دليل request/response/status وstate قبل/بعد وخطوة cleanup، ولا يثبت نشر مرشح الوصفات الأحدث بمجرد دفعه إلى Git.

> تستخدم جميع العمليات أدناه حسابات Sandbox المعتمدة فقط. لا يتضمن هذا السجل JWT أو OTP أو أسماء أو identifiers كاملة أو محتوى طبي أو بيانات دفع حقيقية.

## متطلبات البدء والحالة الراهنة

| المتطلب | المالك | الحالة | الدليل المنقح |
|---|---|---|---|
| عنوان البيئة وإذن اختبار API | Owner/Reviewer | PASS | `https://api.nabd.plus/api/v1` مفوض لحسابات Sandbox فقط |
| health/readiness read-only | البيئة | PASS | `/health/liveness` و`/health/readiness` أعادا HTTP 200 في جولة 2026-08-19 |
| حسابات Patient/Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | Test owner | PASS | تسجيل الدخول الحديث أعاد HTTP 201 لكل الحسابات، و`GET /provider/auth/me` أعاد HTTP 200 للمزودين الستة؛ لا تحفظ الاستجابات أو الرموز في Git |
| نشر إصلاح P0 التمريضي | Reviewer/DevOps | PASS لهذا المورد | commit `e7f3ceb` منشور؛ Doctor أعاد 403 وNursing أعاد 200 لمسار `/nursing/visits` |
| نشر مرشح إصلاح هوية Doctor في إنشاء الوصفة | Reviewer/DevOps | BLOCKED | أثبتت الجولة الحالية أن المرشح المنشور السابق يتضمن إصلاحات auto-confirm وLab detail؛ مرشح `1871223` وحده غير منشور ويحتاج backup/rollback وSHA منشور ثم retest |
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
| 2026-08-19 | Lab embedded report | Patient owner | `GET /lab-results/mine` ثم `GET /lab-results/:id` | القائمة عرضت عنصراً واحداً لكن detail أعاد HTTP 404 | عيب عقد مصدرّي؛ أصلح في المرشح غير المنشور بفallback مملوك |
| 2026-08-19 | Radiology booking | Patient owner / Patient foreign | `GET /radiology/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ لم يقرأ التقرير أو يعدل الحجز |
| 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |
| 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد النشر |
| 2026-08-20 | Lab embedded report | Patient owner / Patient foreign | `GET /lab-results/:id` بعد القائمة | owner: HTTP 200؛ foreign: HTTP 404 | PASS: fallback المملوك منشور ويخفي التقرير عن الأجنبي |
| 2026-08-20 | Consultation clinic/cash | Patient owner / Patient foreign / Patient owner | create ثم قراءة BOLA ثم cancel | create: HTTP 201 وحالة `CONFIRMED`؛ owner: 200؛ foreign: 403؛ cancel: 200 | PASS: إصلاح auto-confirm منشور والتنظيف PASS |
| 2026-08-20 | Hospital staff boundary | Hospital Sandbox / Doctor Sandbox | `GET /hospital/staff` | Hospital: HTTP 404؛ Doctor: HTTP 403 | إصلاح RBAC منشور بقدر تجاوز 403 للحساب المستشفى؛ HTTP 404 يعكس غياب facility/staff fixture قابل للاختبار لا PASS lifecycle |
| 2026-08-20 | Prescription manual lifecycle | Patient / Doctor Sandbox | create → check-in → start → create prescription | 201/200/200 ثم prescription create: 404؛ complete: 200 | **P0** هوية Doctor مكتشف؛ أصلح في المرشح `1871223` غير المنشور |

## مصفوفة الحياة التشغيلية

| المجال | السيناريو الأدنى | دليل القبول | الحالة الحالية | الخطوة التالية المقيدة |
|---|---|---|---|---|
| Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home والتأمين والledger ما زالت غير مثبتة |
| Prescription | موعد مملوك للطبيب، دواء معتمد، محاولة foreign patient/appointment | 201 للحالة الصحيحة و404/403 للأجنبي وربط بالموعد | FIX source / live retest required | مسار الموعد وصل إلى start لكنه كشف P0 create 404؛ ينشر `1871223` ثم تنفذ اليدوي/الكتالوج/البديل/BOLA والتنظيف |
| Pharmacy | broadcast/claim/dispense/refill/delivery أو pickup | state transition وallocation وBOLA | BLOCKED — linked fixture/deployment | broadcast وallocations أعادا HTTP 200 وقائمتين فارغتين؛ لا يوجد record Sandbox موسوم قابل للتنظيف، وعقد الوصفة اليدوية الجديد غير منشور |
| Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | FIX source / live retest required | Lab booking وRadiology booking BOLA PASS؛ تقرير Lab embedded كشف owner 404 ثم أصلح في المصدر؛ lifecycle/report access يبقيان معلّقين لحين نشر المرشح وfixture مستقل قابل للتنظيف |
| Nursing/Hospital | visit response/check-in/note/tracking وstaff/bed flows | ownership والانتقال والتدقيق | BLOCKED — linked fixture | حد التمريض PASS (Doctor 403/Nursing 200)، وHospital Sandbox تجاوز حد RBAC السابق لكنه أعاد 404 لغياب facility/staff fixture؛ لا يوجد visit/staff/bed fixture موسوم |
| Wallet/Family/Notifications | عملية Sandbox فقط وإشعار/role boundaries | ledger/state/cleanup بلا دفع حقيقي | BLOCKED — payment/legal/fixture | Moyasar غير مفعّل وفق الخطة؛ لا mutation مالية أو ledger، ولا family/notification fixture موسوم ومفوض لهذه الجولة |
| Provider intake | كل نوع مزود من التسجيل إلى pending/approved | server-owned status ولا dashboard access مبكر | BLOCKED — isolated registration fixtures | login و`provider/auth/me` PASS للحسابات المعتمدة، لكن لا fixtures بريد/هوية تسجيل جديدة معتمدة أو مسار cleanup لـpending/approved |
| Admin RBAC | إدارة كل دور ومحاولة cross-role | BLOCKED — owner 2FA/fixture | حساب Admin Sandbox يتطلب 2FA ولا يوجد OTP/step-up مفوض للجولة؛ لا يمكن اختبار role mutation أو audit من دون تجاوز الحماية |
| BOLA | actor A/actor B لكل مورد حساس | رفض متماثل أو 404 مخفي للملكية الأجنبية | BLOCKED — partial evidence only | Unified Booking وNursing وLab booking وRadiology booking وConsultation read PASS؛ prescription/pharmacy/reports الجديدة والموردات المعدِّلة تتطلب نشر المرشح أو fixture مملوك |

## قواعد التنفيذ والتنظيف

يستخدم التنفيذ حسابات Sandbox فقط. يسجل كل lifecycle method/path/status ومعرفاً منقحاً وstate قبل/بعد وخطوة cleanup المتاحة من العقد. لا تُنشأ بيانات بوسيلة غير موثقة، ولا يختبر دفع فعلي، ولا يرفق محتوى تقارير أو PII أو أسرار. أي BOLA أو payment أو consent أو PHI failure هو P0 يوقف المجال المتأثر ويولد دليلاً منفصلاً قبل الاستمرار.

## References

[1]: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md` "الخطة الحاكمة ومعيار خروج Phase 16"
[2]: `NABDAH_PHASE16_NURSING_AUTHORIZATION_P0_REMEDIATION_20260819.md` "دليل إصلاح P0 التمريضي والتحقق الحي"
[3]: `NABDAH_PHASE16_PRESCRIPTION_CONTRACT_AND_BOLA_REMEDIATION_20260819.md` "مرشح الوصفات اليدوية وإصلاح BOLA المصدرّي"
