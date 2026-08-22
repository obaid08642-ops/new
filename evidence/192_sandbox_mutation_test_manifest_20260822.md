# مصفوفة اختبارات Sandbox المخططة للـmutations المتعاقد عليها

**الحالة:** مواصفات اختبار فقط؛ لا تحتوي على شفرة ولا طلبات شبكة كتابة.  
**المصدر:** `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md` من `main`، Git blob `65432be0a771f8d5f4d5d8ff7e3de935bcba3176`.  
**قاعدة التشغيل:** لا تتحول الصفوف إلى ملفات اختبار أو طلبات Sandbox قبل أن يطابق الـspec الحي بند العقد المقابل.

## تثبيت هوية الاختبارات وسلامة البيانات

ينشئ الباك إند أو يوفّر قبل التشغيل مريضين Sandbox فقط: `owner` و`stranger`، مع موارد منفصلة صراحةً للقياس والتذكير وعضوية العائلة والسلة والطلب والحجز وسلسلة الدردشة والوسيط. لا تدرج كلمات مرور أو رموز أو أرقام هواتف أو معرفات حقيقية في الاختبارات أو سجلاتها. كل مورد كتابة قابل للتنظيف أو يعطى وسم fixture قابل للتعقب.

| رمز الحالة | معنى القبول |
|---|---|
| S | نجاح المالك بالـDTO الصحيح وبـstatus العقدي. |
| F | فشل مجال متعمد: validation أو state/stock/slot/payment/TTL، مع `code` ثابت قابل للترجمة. |
| X | حساب `stranger` يحصل على `404` للمورد المملوك، أو الاستثناء الدوراني الموثق فقط. |
| U | طلب غير مصادق يحصل على `401`. |
| R | replay: نفس body ونفس `Idempotency-Key`؛ النتيجة الأصلية واحدة ولا side effect ثان. |

## دفعة A — الهوية والجلسة

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| A-01 | `POST /auth/otp/request` | `{identifier}` | `200 {otp_sent,channel,expires_in:300}` | `429` بعد 3/10min | U غير مطلوب قبل login؛ response لا يكشف وجود الحساب | تكرار الطلب ليس account-discovery؛ يثبت rate policy فقط. |
| A-02 | `POST /auth/otp/verify` | `{identifier,code,device_id?}` | `200 {exchange_token,expires_in:60}` | `401 otp_invalid`، `410 otp_expired`، ثم `429`/قفل 15min | U غير مطلوب | يثبت أن code/token أحادي الاستعمال؛ لا يطبع token في logs. |
| A-03 | `POST /auth/session/exchange` | `{exchange_token}` | `200 {authenticated:true}` وcookies HttpOnly | `401` للمنتهي/المستهلك | U غير مطلوب | R الثاني بالرمز ذاته يجب أن يرفض؛ لا token في body/URL. |
| A-04 | `POST /auth/register` | `{name,identifier,password,locale,consents:[{policy_id,version}]}` | `201 {registered:true}` + OTP | validation/consent missing | U غير مطلوب | R لا ينشئ حساباً أو OTP منفصلاً بلا تعريف صريح. |
| A-05 | `POST /auth/password/forgot` | `{identifier}` | response ثابت لا يكشف الوجود | rate/invalid shape | U غير مطلوب | R لا يكشف فرق المسجل عن غير المسجل. |
| A-06 | `POST /auth/password/reset` | `{reset_token,new_password}` | password reset once | `401` expired/consumed | U غير مطلوب | R بالرمز نفسه يرفض ولا يغير كلمة المرور ثانية. |

## دفعة B — الملف والقياسات والتذكيرات

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| B-01 | `PATCH /users/me` | allowlist §2 | DTO العرض المقيد فقط | `400` لأي حقل خارج allowlist | U=`401` | R يثبت نفس DTO ولا update ثاناً؛ avatar_media_id مملوك. |
| B-02 | `POST /health/vitals` | `{type,value,unit,measured_at,context?}` | `201 {id}` | type/unit/value/time invalid | U=`401` | R ينشئ قياساً واحداً؛ هيدر idempotency إلزامي بالنشر. |
| B-03 | `PATCH /health/vitals/{id}` | subset منشور من DTO القياس | القياس المملوك يتغير | validation/state | X=`404`،U=`401` | R يثبت state واحداً؛ لا يفترض الدعم حتى يظهر في spec. |
| B-04 | `DELETE /health/vitals/{id}` | لا body | حذف ناعم مملوك + audit | state invalid إن عرف | X=`404`،U=`401` | R لا يحذف مورد/سجل آخر. |
| B-05 | `POST /health/wearables/link` | `{provider,auth_code}` | ربط خادمي موثق | `501` provider disabled أو code invalid | X/U حسب المورد | R لا ينشئ رابط جهاز ثانياً؛ لا secret device في المتصفح. |
| B-06 | `DELETE /health/wearables/{device_id}` | لا body | unlink مملوك | state invalid | X=`404`،U=`401` | R idempotent/contract-specific بلا حذف خارجي. |
| B-07 | `POST /health/reminders` | `{medicine_id|manual_name,schedule,start_date,end_date?}` | `201` + DTO منشور | schedule/date/medicine invalid | X/U حسب resource | R يضيف تذكيراً واحداً فقط. |
| B-08 | `PATCH/DELETE /health/reminders/{id}` | update DTO / no body | تعديل/حذف المالك | validation/state | X=`404`،U=`401` | R يمنع تعديل/حذف إضافياً. |
| B-09 | `POST /health/reminders/{id}/log` | `{taken_at,status:taken|skipped}` | log واحد صحيح | status/time invalid | X=`404`،U=`401` | R لا يكرر log. |
| B-10 | `POST /health/medications/{id}/refill` | no body أو DTO منشور | مسودة صيدلية واحدة | medication ineligible | X=`404`،U=`401` | R ينشئ draft واحداً فقط؛ مسار العقد لا يستبدل بمسار OpenAPI قديم. |

## دفعة C — العائلة والصلاحيات

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| C-01 | `POST /family/invite` | `{channel:sms|email,target}` | `201 {invite_sent:true,expires_in:86400}` | channel/target invalid | U=`401` | R لا يرسل أكثر من دعوة لنفس المفتاح؛ invite_code لا يظهر. |
| C-02 | `POST /family/join` | `{invite_code}` | `200` + membership DTO منشور | `410 expired`،`409 already_member` | U=`401` | R يبقي عضوية واحدة. |
| C-03 | `PATCH /family/members/{member_id}/permissions` | `{scopes:[view_health|book_for|...]}` | owner يغير scope | scope invalid | non-owner=`403` صريح،U=`401` | R يثبت permission state واحداً. |
| C-04 | `DELETE /family/members/{member_id}` | no body | soft remove + audit/notice | protected role/state | X حسب group owner،U=`401` | R soft-removes مرة واحدة فقط. |
| C-05 | `POST /family/leave` | no body | member leaves + audit/notice | already left/state | U=`401` | R لا يغير عضوية أخرى. |

## دفعة D — السلة والطلب والدفع

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| D-01 | `POST /cart/items` | `{medicine_id|manual_name,quantity}` | cart DTO منشور؛ manual=PENDING_REVIEW | quantity/medicine invalid | U=`401` | R مطلوب قبل البناء رغم عدم صراحة الحزمة الحالية؛ لا line ثان. |
| D-02 | `PATCH/DELETE /cart/items/{item_id}` | update DTO / no body | cart المملوكة فقط | invalid quantity/state | X=`404`،U=`401` | R لا يضاعف/يزيل line آخر. |
| D-03 | `POST /cart/checkout` | `{address_id,payment_method_id|cash,coupon_code?,prescription_media_ids?}` | `201 {order_id,status,total,payment_intent?}` | `409 stock`،`422 coupon`،`402 payment` | X address/media=`404`،U=`401` | R=`200,idempotent_replay:true` بعد أول نجاح؛ لا order/payment ثان. |
| D-04 | `POST /orders/{id}/reorder` | no body | سلة جديدة واحدة من order مملوك | order/state ineligible | X=`404`،U=`401` | R لا ينشئ سلتين. |
| D-05 | `POST /orders/{id}/cancel` | no body | cancellation ضمن state | `409` بعد تجاوز الحالة القابلة للإلغاء | X=`404`،U=`401` | R لا يسجل cancellation/credit ثانياً. |

## دفعة E — الحجز والرعاية المنزلية

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| E-01 | `POST /unified-bookings` | `{doctor_id,slot_id,type,notes?,payment_method_id?}` | `201 {booking_id,status}` + lock 10min | `409 slot_taken` أو validation | U=`401` | R يعيد booking ذاته؛ لا lock/charge ثانٍ. |
| E-02 | `POST /unified-bookings/{id}/cancel` | no body | cancel ضمن سياسة 24h | `409` قواعد وقت/state | X=`404`،U=`401` | R انتقال واحد فقط. |
| E-03 | `POST /unified-bookings/{id}/reschedule` | `{new_slot_id}` | booking/slot جديد صحيح | `409 slot_taken` أو 24h policy | X=`404`،U=`401` | R لا يستهلك slot إضافياً. |
| E-04 | `GET /unified-bookings/{id}/call-token` | no body | `{provider:livekit,token,room}` ضمن ±15min | خارج النافذة/غير مسموح | X=`404`،U=`401` | قراءة فقط؛ يثبت TTL 10min وعدم URL leak. |
| E-05 | `GET /home-care/bookings/{bookingId}` | no body | DTO §8 المقيد | not found | X=`404`،U=`401` | قراءة فقط؛ لا DTO داخلي أو PII زائد. |

## دفعة F — الوصفة والدردشة والوسائط والتفضيلات

| معرّف | العقد | DTO المدخل | S | F | X/U | R / الحاجز الخاص |
|---|---|---|---|---|---|---|
| F-01 | `POST /chat/threads/{id}/messages` | `{body,media_ids?}` | رسالة واحدة للمشارك | body/media invalid | X=`404` non-participant،U=`401` | R لا ينشئ message ثانياً. |
| F-02 | `POST /chat/threads/{id}/read` | `{up_to_message_id}` | read receipt DTO/state منشور | message not in thread | X=`404`،U=`401` | R stable لا يكرر read event. |
| F-03 | `POST /media/upload` | published upload + `purpose,owner_binding` | media DTO مملوك | type/size/purpose invalid | U=`401` | R فقط وفق spec؛ لا key/URL عام. |
| F-04 | `POST/DELETE /articles/{id}/bookmark` | no body | bookmarked state منشور | article invalid | X=`404`،U=`401` | R لا يكرر add/remove. |
| F-05 | `PATCH /users/me/notification-settings` | allowlist `{channels,categories}` | settings DTO منشور | schema invalid | U=`401` | R stable، لا channels غير مسموحة. |
| F-06 | `DELETE /users/me/sessions/{session_id}` | no body | session revoke مملوكة | already revoked/state | X=`404`،U=`401` | R لا يؤثر جلسة أخرى ولا الحالية بلا سياسة صريحة. |

## قبول الدفعة

لا تعتبر أي دفعة مكتملة حتى تتحقق كل صفوفها القابلة للتنفيذ في الـspec الحية، وتنجح الاختبارات المطلوبة، ويثبت عدم ظهور secrets/PII في طلبات أو سجل أو URL، ثم تنجح بوابات `pnpm check` و`pnpm test` و`pnpm build`. عند غياب مسار أو status أو idempotency في الـspec الحية، ينشأ صف حظر باسم endpoint وفرق عقدي؛ لا workaround في الواجهة.
