# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md`
- **Member SHA-256:** `be75e98167e60712e6e48c0ea17084d2d26b9c88f8da3216a8e86eb325862773`
- **Line count:** 63
- **Read range:** `1-63`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: | بيانات lifecycle قابلة للتنظيف لكل مجال | Test owner | PARTIAL | يوجد مورد Unified Booking مملوك سابقاً؛ بقية fixtures يجب اكتشافها أو إنشاؤها بعقد مسموح ثم تنظيفها |`
- `27: | 2026-08-19 | Unified Booking مملوك | Patient owner / Patient foreign | قراءة المورد نفسه | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط |`
- `31: | 2026-08-19 | Lab booking | Patient owner / Patient foreign | `GET /labs/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ المرجع قائم سابقاً وحالته terminal، فلم يعدل |`
- `33: | 2026-08-19 | Radiology booking | Patient owner / Patient foreign | `GET /radiology/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ لم يقرأ التقرير أو يعدل الحجز |`
- `35: | 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد ال`
- `37: | 2026-08-20 | Consultation clinic/cash | Patient owner / Patient foreign / Patient owner | create ثم قراءة BOLA ثم cancel | create: HTTP 201 وحالة `CONFIRMED`؛ owner: 200؛ foreign: 403؛ cancel: 200 | PASS: إصلاح auto-confirm منشور والتنظيف`
- `45: | Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home و`
- `48: | Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | FIX source / live retest required | Lab booking وRadiology booking BOLA PASS؛ تقرير Lab embedded كشف owner 404 ثم أصلح في المصدر`
- `51: | Provider intake | كل نوع مزود من التسجيل إلى pending/approved | server-owned status ولا dashboard access مبكر | BLOCKED — isolated registration fixtures | login و`provider/auth/me` PASS للحسابات المعتمدة، لكن لا fixtures بريد/هوية تسجيل ج`
- `53: | BOLA | actor A/actor B لكل مورد حساس | رفض متماثل أو 404 مخفي للملكية الأجنبية | BLOCKED — partial evidence only | Unified Booking وNursing وLab booking وRadiology booking وConsultation read PASS؛ prescription/pharmacy/reports الجديدة وال`
### backend_consumers_or_contracts
- `14: | عنوان البيئة وإذن اختبار API | Owner/Reviewer | PASS | `https://api.nabd.plus/api/v1` مفوض لحسابات Sandbox فقط |`
- `16: | حسابات Patient/Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | Test owner | PASS | تسجيل الدخول الحديث أعاد HTTP 201 لكل الحسابات، و`GET /provider/auth/me` أعاد HTTP 200 للمزودين الستة؛ لا تحفظ الاستجابات أو الرموز في Git |`
- `17: | نشر إصلاح P0 التمريضي | Reviewer/DevOps | PASS لهذا المورد | commit `e7f3ceb` منشور؛ Doctor أعاد 403 وNursing أعاد 200 لمسار `/nursing/visits` |`
- `28: | 2026-08-19 | Nursing visits | Doctor Sandbox | `GET /nursing/visits` | HTTP 403 | PASS: منع cross-provider بعد إصلاح P0 |`
- `29: | 2026-08-19 | Nursing visits | Nursing Sandbox | `GET /nursing/visits` | HTTP 200 وقائمة فارغة | PASS: الدور المصرح يبقى قادراً على القراءة |`
- `30: | 2026-08-19 | Provider identity | Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | `GET /provider/auth/me` | HTTP 200 لكل حساب | PASS: جلسات Sandbox صالحة؛ لا يثبت lifecycle |`
- `31: | 2026-08-19 | Lab booking | Patient owner / Patient foreign | `GET /labs/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ المرجع قائم سابقاً وحالته terminal، فلم يعدل |`
- `33: | 2026-08-19 | Radiology booking | Patient owner / Patient foreign | `GET /radiology/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ لم يقرأ التقرير أو يعدل الحجز |`
- `34: | 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |`
- `45: | Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home و`
- `48: | Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | FIX source / live retest required | Lab booking وRadiology booking BOLA PASS؛ تقرير Lab embedded كشف owner 404 ثم أصلح في المصدر`
- `49: | Nursing/Hospital | visit response/check-in/note/tracking وstaff/bed flows | ownership والانتقال والتدقيق | BLOCKED — linked fixture | حد التمريض PASS (Doctor 403/Nursing 200)، وHospital Sandbox تجاوز حد RBAC السابق لكنه أعاد 404 لغياب fac`
### auth_ownership
- `8: > تستخدم جميع العمليات أدناه حسابات Sandbox المعتمدة فقط. لا يتضمن هذا السجل JWT أو OTP أو أسماء أو identifiers كاملة أو محتوى طبي أو بيانات دفع حقيقية.`
- `14: | عنوان البيئة وإذن اختبار API | Owner/Reviewer | PASS | `https://api.nabd.plus/api/v1` مفوض لحسابات Sandbox فقط |`
- `16: | حسابات Patient/Doctor/Pharmacy/Lab/Radiology/Nursing/Hospital | Test owner | PASS | تسجيل الدخول الحديث أعاد HTTP 201 لكل الحسابات، و`GET /provider/auth/me` أعاد HTTP 200 للمزودين الستة؛ لا تحفظ الاستجابات أو الرموز في Git |`
- `19: | backup/rollback وmigration/index preflight للمرشح الجديد | Reviewer/DB owner | BLOCKED | مطلوب قبل نشر المرشح الجديد |`
- `20: | بيانات lifecycle قابلة للتنظيف لكل مجال | Test owner | PARTIAL | يوجد مورد Unified Booking مملوك سابقاً؛ بقية fixtures يجب اكتشافها أو إنشاؤها بعقد مسموح ثم تنظيفها |`
- `21: | Moyasar/consent/location/AI/PHI approvals | Owner/Legal/Product | BLOCKED | خارج نطاق أي mutation مالي أو حساس في هذه الجولة |`
- `27: | 2026-08-19 | Unified Booking مملوك | Patient owner / Patient foreign | قراءة المورد نفسه | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط |`
- `31: | 2026-08-19 | Lab booking | Patient owner / Patient foreign | `GET /labs/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ المرجع قائم سابقاً وحالته terminal، فلم يعدل |`
- `32: | 2026-08-19 | Lab embedded report | Patient owner | `GET /lab-results/mine` ثم `GET /lab-results/:id` | القائمة عرضت عنصراً واحداً لكن detail أعاد HTTP 404 | عيب عقد مصدرّي؛ أصلح في المرشح غير المنشور بفallback مملوك |`
- `33: | 2026-08-19 | Radiology booking | Patient owner / Patient foreign | `GET /radiology/bookings/:id` | owner: HTTP 200؛ foreign: HTTP 404 | PASS لهذا المورد BOLA فقط؛ لم يقرأ التقرير أو يعدل الحجز |`
- `34: | 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |`
- `35: | 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد ال`
### state_transitions
- `6: **الحالة:** **IN PROGRESS**. لا يعامل أي صف بغير دليل request/response/status وstate قبل/بعد وخطوة cleanup، ولا يثبت نشر مرشح الوصفات الأحدث بمجرد دفعه إلى Git.`
- `34: | 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |`
- `35: | 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد ال`
- `37: | 2026-08-20 | Consultation clinic/cash | Patient owner / Patient foreign / Patient owner | create ثم قراءة BOLA ثم cancel | create: HTTP 201 وحالة `CONFIRMED`؛ owner: 200؛ foreign: 403؛ cancel: 200 | PASS: إصلاح auto-confirm منشور والتنظيف`
- `45: | Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home و`
- `47: | Pharmacy | broadcast/claim/dispense/refill/delivery أو pickup | state transition وallocation وBOLA | BLOCKED — linked fixture/deployment | broadcast وallocations أعادا HTTP 200 وقائمتين فارغتين؛ لا يوجد record Sandbox موسوم قابل للتنظيف، `
- `48: | Lab/Radiology | inbox/sample/report/approved signed report | patient identity، report access، BOLA، cleanup | FIX source / live retest required | Lab booking وRadiology booking BOLA PASS؛ تقرير Lab embedded كشف owner 404 ثم أصلح في المصدر`
- `50: | Wallet/Family/Notifications | عملية Sandbox فقط وإشعار/role boundaries | ledger/state/cleanup بلا دفع حقيقي | BLOCKED — payment/legal/fixture | Moyasar غير مفعّل وفق الخطة؛ لا mutation مالية أو ledger، ولا family/notification fixture موسو`
- `51: | Provider intake | كل نوع مزود من التسجيل إلى pending/approved | server-owned status ولا dashboard access مبكر | BLOCKED — isolated registration fixtures | login و`provider/auth/me` PASS للحسابات المعتمدة، لكن لا fixtures بريد/هوية تسجيل ج`
- `57: يستخدم التنفيذ حسابات Sandbox فقط. يسجل كل lifecycle method/path/status ومعرفاً منقحاً وstate قبل/بعد وخطوة cleanup المتاحة من العقد. لا تُنشأ بيانات بوسيلة غير موثقة، ولا يختبر دفع فعلي، ولا يرفق محتوى تقارير أو PII أو أسرار. أي BOLA أو pa`
### payment_insurance_relevance
- `21: | Moyasar/consent/location/AI/PHI approvals | Owner/Legal/Product | BLOCKED | خارج نطاق أي mutation مالي أو حساس في هذه الجولة |`
- `34: | 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |`
- `37: | 2026-08-20 | Consultation clinic/cash | Patient owner / Patient foreign / Patient owner | create ثم قراءة BOLA ثم cancel | create: HTTP 201 وحالة `CONFIRMED`؛ owner: 200؛ foreign: 403؛ cancel: 200 | PASS: إصلاح auto-confirm منشور والتنظيف`
- `45: | Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home و`
- `50: | Wallet/Family/Notifications | عملية Sandbox فقط وإشعار/role boundaries | ledger/state/cleanup بلا دفع حقيقي | BLOCKED — payment/legal/fixture | Moyasar غير مفعّل وفق الخطة؛ لا mutation مالية أو ledger، ولا family/notification fixture موسو`
- `57: يستخدم التنفيذ حسابات Sandbox فقط. يسجل كل lifecycle method/path/status ومعرفاً منقحاً وstate قبل/بعد وخطوة cleanup المتاحة من العقد. لا تُنشأ بيانات بوسيلة غير موثقة، ولا يختبر دفع فعلي، ولا يرفق محتوى تقارير أو PII أو أسرار. أي BOLA أو pa`
### error_empty_loading_retry_cancel
- `34: | 2026-08-19 | Consultation clinic/cash الموسومة | Patient owner | `POST /care/appointments` | HTTP 403، لكن المورد حُفظ `PENDING` | **P0**: partial persistence؛ أصلح في المصدر ضمن المرشح غير المنشور |`
- `35: | 2026-08-19 | Consultation fixture الموسومة | Patient owner / Patient foreign / Patient owner | قراءة ثم تنظيف: owner 200؛ foreign 403؛ cancel 200 إلى `CANCELLED` | BOLA read PASS والتنظيف PASS؛ لا lifecycle مقبول قبل إعادة الاختبار بعد ال`
- `37: | 2026-08-20 | Consultation clinic/cash | Patient owner / Patient foreign / Patient owner | create ثم قراءة BOLA ثم cancel | create: HTTP 201 وحالة `CONFIRMED`؛ owner: 200؛ foreign: 403؛ cancel: 200 | PASS: إصلاح auto-confirm منشور والتنظيف`
- `45: | Consultation | online/clinic/home × cash/insurance، إنشاء/قبول/بدء/إنهاء | actor/role/state/ledger قبل وبعد وcleanup | PARTIAL | clinic/cash auto-confirm وBOLA/cancel PASS؛ check-in/start/complete PASS في fixture الوصفة، لكن online/home و`
- `51: | Provider intake | كل نوع مزود من التسجيل إلى pending/approved | server-owned status ولا dashboard access مبكر | BLOCKED — isolated registration fixtures | login و`provider/auth/me` PASS للحسابات المعتمدة، لكن لا fixtures بريد/هوية تسجيل ج`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
