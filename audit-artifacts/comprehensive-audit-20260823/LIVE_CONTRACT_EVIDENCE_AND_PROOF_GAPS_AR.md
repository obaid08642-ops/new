# مصفوفة الدليل الحي وفجوات الإثبات

## قاعدة تفسير status

`200` يثبت أن الطلب المجهز صالح ومرّ في ذلك السياق. `401` يثبت غالباً أن route موجود ومحمي عندما يكون المسار والـmethod معروفين، لكنه لا يثبت owner success أو stranger isolation. `400` يثبت وصول الطلب إلى route مع body غير صالح أو ناقص، ولا يثبت payload الصحيح. `404` يثبت أن المسار أو المورد غير موجود في ذلك الشكل؛ لا يجوز تحويله إلى route جديد دون مراجعة backend.

## نتائج contracts الحالية

| Domain | Endpoint evidence | Status | ما يثبته | ما لا يثبته |
|---|---|---:|---|---|
| Auth | `POST /auth/otp/request` | 400 بدون body صالح | route موجود | OTP delivery/expiry/rate-limit |
| Auth | `POST /auth/otp/verify` | 400 | route موجود | exchange token/session |
| Auth | `POST /auth/session/exchange` | 400 | route موجود | one-time exchange وcookie |
| Booking | `POST /unified-bookings` | 401 | route محمي | إنشاء حجز وidempotent replay |
| Booking | cancel | 401 | route محمي | owner cancellation |
| Booking | `PATCH .../reschedule` | 401 | method/path صحيح ومحمي | owner reschedule |
| Booking | `POST .../reschedule` | 404 | method خاطئ | لا يُستخدم |
| Call | `GET /unified-bookings/{id}/call-token` | 401 | route الصحيح محمي | token TTL داخل نافذة الموعد |
| Labs | `GET /labs/services`, `/labs/packages` | 200 | public catalog حي | booking/results/checkout |
| Labs | `GET /labs/bookings/mine` | 401 | protected list موجود | owner data |
| Radiology | `GET /radiology/services`, `/modalities` | 200 | catalog حي | booking |
| Radiology | `GET /radiology/services/{_id}`, `{short_code}` | 200 | detail حي | purchase/booking |
| Home-care | `GET /unified-bookings/mine` | 401 | unified list protected | resource kind detail |
| Home-care | `/home-care/bookings/my` | 401/old path | لا يُستخدم كقائمة | لا يُنشأ route بديل في Web |
| Nursing | `GET /nursing/visits` | 401 | protected route موجود | visit fixture/detail |
| Pharmacy | `GET /cart` | 401 | cart route محمي | cart lines payload |
| Pharmacy | `GET /cart/lines` | 404 | هذا GET path غير موجود | لا يُفتح كـGET |
| Orders | list/detail/tracking | 401 | routes محمية | owner resource وtracking state |
| Profile/Health | profile, insurance, vitals, reports, sleep, trends | 401 | routes محمية | field-level ownership/data |
| Family | `GET /family/my-group` | 401 | route محمي | member permissions |
| Chat | `GET /chat/threads` | 401 | route محمي | realtime/reconnect |
| Notifications | `GET /notifications` | 401 | route صحيح | read-all mutation |
| Articles | `GET /articles/bookmarks/mine` | 401 | route محمي | bookmark mutation |
| Advanced | Community/Loyalty/Wallet/AI/Mental health/Support | 401 | بعض routes محمية | safety contracts وjourneys |
| Advanced | Maternity dashboard/Nutrition plan/Community vote | 404 | غير منشور أو path خاطئ | لا تُبنى routes تخمينية |

## فجوات الإثبات الإلزامية

لكل mutation أو resource مملوك يلزم تشغيل حساب owner وstranger منفصلين، والتأكد من `200` للمالك و`404` للغريب و`401` لغير المصادق. للعمليات المالية والحجوزات يلزم replay بنفس Idempotency-Key، ثم التأكد من عدم إنشاء duplicate، وإلغاء أي fixture يتم إنشاؤه. للـcall-token يلزم إثبات TTL والنافذة الزمنية والتعامل مع expired/unauthorized.

## الحكم

الـprobes الحالية تثبت route inventory الحي وتمنع أخطاء method/path، لكنها لا تكفي لإغلاق الرحلات الكاملة. لذلك تبقى Booking/Pharmacy/Diagnostics/Home-care/Nursing وadvanced mutations في حالة `PARTIAL_OR_CONTRACT_PROOF_REQUIRED` حتى تكتمل fixtures واختبارات owner/stranger/replay.
