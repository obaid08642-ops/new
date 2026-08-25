# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/188_multilingual_visual_check_20260822.md`
- **Member SHA-256:** `78ca62230d88665e2728ac42e3b6f41f5789d0c43242e16c1606af6a4ee9aa35`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: لقطات المصدر: `/home/ubuntu/screenshots/localhost_2026-08-22_02-01-57_1069.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_02-02-16_3353.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_02-02-53_7307.webp` و`/home/ubuntu/screensh`
- `31: | `/en/orders` | ترويسة الطلبات وبطاقات الحالة الفارغة وتبويبات All/Pending/Completed/Cancelled واضحة ومتسقة مع نظام الألوان. | تظهر الحالة الفارغة الحقيقية من جلسة Sandbox: لا طلبات متاحة؛ لم تُنشأ طلبات اصطناعية. |`
- `33: لقطتا المصدر: `/home/ubuntu/screenshots/localhost_2026-08-22_02-05-24_4505.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_02-05-36_3987.webp`.`
- `40: لقطتا المصدر: `/home/ubuntu/screenshots/localhost_2026-08-22_02-06-01_8102.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_02-06-12_1036.webp`.`
- `51: لقطتا المصدر: `/home/ubuntu/screenshots/localhost_2026-08-22_02-09-11_7455.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_02-09-19_3701.webp`.`
### backend_consumers_or_contracts
- `30: | `/en/appointments` | حالة فارغة كبيرة متمركزة، أيقونة تقويم متجهية، تبويبا Upcoming وPast واضحان، ولا توجد ازدحامات أو تداخلات مرئية. | تظهر الحالة الفارغة الحقيقية من جلسة Sandbox: لا مواعيد متاحة؛ لم تُحقن بيانات لملء البطاقة. |`
- `31: | `/en/orders` | ترويسة الطلبات وبطاقات الحالة الفارغة وتبويبات All/Pending/Completed/Cancelled واضحة ومتسقة مع نظام الألوان. | تظهر الحالة الفارغة الحقيقية من جلسة Sandbox: لا طلبات متاحة؛ لم تُنشأ طلبات اصطناعية. |`
- `38: | `/en/insurance` | ترويسة ملخص التأمين وحالة «No policy recorded» وبطاقة المطالبات الفارغة مقروءة ومنظمة. | يصرّح المسار بصراحة بإخفاء أرقام الوثائق والمعرّفات والبطاقات والدفعات والإجراءات لحين توافر العقد؛ لم تُعرض بيانات حساسة أو بدائل `
### auth_ownership
- `11: | الإنجليزية | LTR | بطاقات الخصوصية والأمان والتخزين والجلسات متوازنة؛ الإفصاح «Showing the first 8 of 267 active sessions» ظاهر وواضح | أعاد الخادم تسميتين عربيتين لعناصر التخزين. وُسمتا بـ`dir="auto"` كي تحفظا اتجاههما الداخلي، من دون تر`
### state_transitions
- `31: | `/en/orders` | ترويسة الطلبات وبطاقات الحالة الفارغة وتبويبات All/Pending/Completed/Cancelled واضحة ومتسقة مع نظام الألوان. | تظهر الحالة الفارغة الحقيقية من جلسة Sandbox: لا طلبات متاحة؛ لم تُنشأ طلبات اصطناعية. |`
- `34: 4c8e627c3a6a09b297c53e2f42b180e3bd9683321996366769cebe5a79bf8f8d  evidence/visual/en-appointments-empty-v1.webp`
- `35: 891fb647290818f525f25915fc57d7095ad1f19cde303a8d88fb3a12ff2b6335  evidence/visual/en-orders-empty-v1.webp`
- `41: c8ffdf6c0169dd3883ad9ca2d3082ac2084cf67d5e12e497b3aa2e844c27aedf  evidence/visual/en-health-empty-v1.webp`
- `42: b7cc4b2034b4893b5ce2dc7b1a4c51dcaadb0430fbc43c4b55a4dace8d51506a  evidence/visual/en-insurance-empty-v1.webp`
### payment_insurance_relevance
- `38: | `/en/insurance` | ترويسة ملخص التأمين وحالة «No policy recorded» وبطاقة المطالبات الفارغة مقروءة ومنظمة. | يصرّح المسار بصراحة بإخفاء أرقام الوثائق والمعرّفات والبطاقات والدفعات والإجراءات لحين توافر العقد؛ لم تُعرض بيانات حساسة أو بدائل `
- `42: b7cc4b2034b4893b5ce2dc7b1a4c51dcaadb0430fbc43c4b55a4dace8d51506a  evidence/visual/en-insurance-empty-v1.webp`
### error_empty_loading_retry_cancel
- `31: | `/en/orders` | ترويسة الطلبات وبطاقات الحالة الفارغة وتبويبات All/Pending/Completed/Cancelled واضحة ومتسقة مع نظام الألوان. | تظهر الحالة الفارغة الحقيقية من جلسة Sandbox: لا طلبات متاحة؛ لم تُنشأ طلبات اصطناعية. |`
- `34: 4c8e627c3a6a09b297c53e2f42b180e3bd9683321996366769cebe5a79bf8f8d  evidence/visual/en-appointments-empty-v1.webp`
- `35: 891fb647290818f525f25915fc57d7095ad1f19cde303a8d88fb3a12ff2b6335  evidence/visual/en-orders-empty-v1.webp`
- `41: c8ffdf6c0169dd3883ad9ca2d3082ac2084cf67d5e12e497b3aa2e844c27aedf  evidence/visual/en-health-empty-v1.webp`
- `42: b7cc4b2034b4893b5ce2dc7b1a4c51dcaadb0430fbc43c4b55a4dace8d51506a  evidence/visual/en-insurance-empty-v1.webp`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
