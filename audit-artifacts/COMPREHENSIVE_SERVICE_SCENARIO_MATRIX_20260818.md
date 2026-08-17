# مصفوفة السيناريوهات الشاملة لمنصة نبض

**الحالة:** خطة تنفيذية؛ لا تمثل أي خانة نجاحاً حتى تُرفق بدليل مصدر واختبار وتشغيل حي عند الحاجة.

## منهج القراءة

كل صف هو عائلة سيناريوهات، ويجب تفكيكه أثناء التنفيذ إلى: إنشاء، تحقق، تسعير، تأمين/دفع، توجيه أو broadcast، قبول أو رفض، تعيين، انتقالات الحالة، التواصل، التنفيذ، التقرير، الإلغاء/no-show، الإشعار، السجل المالي، والتقييم. لكل خطوة تُسجل هوية الحساب، الطلب، الحالة قبل/بعد، status/body، ودليل الصلاحية أو الرفض.

| الخدمة | أنواع التنفيذ والمكان | الدفع والتأمين | دورة المريض | دورة المزود | الفروع الإلزامية |
|---|---|---|---|---|---|
| الاستشارة الطبية | أونلاين صوت/فيديو، عيادة، زيارة منزلية | نقدي، بطاقة/Moyasar، تأمين، موافقة جزئية/copay | دليل وتخصص وطبيب ومنشأة → slots → تأكيد → chat/call أو وصول للعيادة/المنزل → وصفة/تقرير → متابعة وتقييم | onboarding/اعتماد → availability/working hours/holidays/leave → broadcast/inbox → accept/reject/reassign → chat/call → prescription/report/referral → complete/no-show/withdrawal | slot محجوز، إجازة، تأخير، إلغاء من الطرفين، رفض التأمين، انقطاع المكالمة، نافذة chat قبل/بعد، patient/provider foreign access |
| الصيدلية | توصيل، استلام من الفرع، إعادة طلب/refill | نقدي، بطاقة، تأمين، copay | دواء/بديل → سلة → موافقة → توجيه → تتبع → إتمام | catalog/inventory → broadcast → accept/reject/reassign → substitution/unavailable → cart approval → delivery/pickup → completion | مخزون before/after، دواء غير متوفر، رفض صيدلية، إلغاء قبل/بعد القبول، tracking، receipt، rating |
| المختبر | فرع، سحب منزلي، باقات وتحاليل | نقدي، بطاقة، تأمين يدوي، out-of-network cash | catalog/preparation → booking → confirmation → sample collected/analyzing/result → report | provider inbox → accept/reject/reassign → sample state transitions → report upload → patient delivery | insurance approve/reject/partial، إعادة جدولة، إلغاء، ownership، report.pdf، foreign patient/provider |
| الأشعة | فرع، منزل، modality/PACS | نقدي، بطاقة، تأمين يدوي | modality/preparation → booking → confirmation → perform → images/report | inbox → respond/allocate/finalize → report/images upload → complete | PACS/report access، تأمين، إعادة إسناد، إعادة جدولة، إلغاء/no-show، BOLA |
| التمريض والرعاية المنزلية | زيارة منزلية، متابعة ميدانية، طوارئ | نقدي، بطاقة، تأمين، pending finance review | service/location → request/broadcast → accept → arrival/start/in-progress/complete → notes/care plan → rating | onboarding/availability → queue → accept/reject/reassign → GPS/geofence → notes/supplies/emergency/no-show → wallet | patient location، geofence، انقطاع GPS، emergency، supply request، إلغاء، refund غير مسوّى، provider impersonation |
| المستشفى والمنشأة | دليل، فروع/أقسام، مواعيد، staff | حسب الخدمة: نقدي/بطاقة/تأمين | profile/department/doctor → schedule → booking → visit/discharge/report | hospital-admin staff invite/roles → doctor schedule/leave → patient tracker → discharge/resources/announcements | UUID مقابل ObjectId، hospital-admin مقابل provider، staff foreign access، branch/department، audit log |
| الإسعاف/الطوارئ | SOS وdispatch وfleet | عقد خاص؛ لا تفعيل غير معتمد | trigger → safe fail-closed أو dispatch مع الموقع والسياسة | ambulance availability → mission broadcast → accept → tracking → handoff/complete | QR/location fail-closed، origin/role، أقل بيانات موقع، no unauthorized activation |
| التغذية | خطة غذائية، متابعة، تخصيص | نقدي/بطاقة/تأمين إن كان مدعوماً | intake → nutrition plan → follow-up → adherence/rating | provider profile/availability → accept → plan/update → follow-up | بيانات حساسة، تعديل الخطة، cancellation، ownership |
| الصحة النفسية | جلسة أونلاين/عيادة/منزل إن مدعوم | نقدي/بطاقة/تأمين | intake → booking → chat/call/visit → follow-up | credentialing، schedule، accept، session، notes/report | الخصوصية، escalation، no-show، emergency boundary |
| الحمل والدورة والتبويض | متابعة، تذكيرات، محتوى، استشارات | حسب المكوّن | profile/consent → timeline/reminders → consultation/lab/radiology links | provider follow-up، referrals، reports | consent، localization، sensitive data، notification opt-in |
| AI/التشخيص المساعد | triage/اقتراح، لا تشخيص نهائي | لا يدّعي دفعاً أو تشخيصاً غير معتمد | symptom/input → bounded response → referral/escalation | provider review إن وجد | disclaimer، safety escalation، no medical overclaim، audit trail، fail-closed |
| الأدوية والفهرس والوظائف | drug index، scanner، provider jobs | لا mock price أو inventory | search/scan → verified information → order/referral إن وجد | drug index/jobs/availability | مصدر البيانات، عدم اختراع سعر/مخزون، صلاحيات الإدارة |

## المصفوفة المشتركة لكل صف

| المجال | ما يجب اختباره |
|---|---|
| الهوية والصلاحيات | patient owner، patient2 foreign، assigned provider، provider2، hospital-admin، admin؛ يجب أن تكون القراءة/التعديل غير المصرح 403/404 ولا تكشف side-channel |
| حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |
| المدفوعات | cash branch، card/Moyasar safe 502، insurance decision/copay، webhook signature، idempotency، refund/ledger؛ لا refund حقيقي قبل التفعيل التجاري |
| الاتصال | chat membership، typing، message ownership، call initiate/ringing/accept/reject/end/no-show، WebSocket origin، token tampering، disconnect |
| الموقع | permission، mock location في المحاكي، geofence، أقل بيانات، GPS loss، emergency policy؛ لا تفعيل لعقد غير معتمد |
| الإشعارات | إنشاء notification عند كل transition، read/read-all ownership، push/deep link، التطبيق مغلق، retry/delivery log |
| اللغات والثيم | العربية والإنجليزية وباقي اللغات المعتمدة، RTL/LTR، automatic light/dark من الجهاز ثم manual override، truncation وaccessibility |
| السجل والبيانات | audit trail، state history from/to، ledger before/after، timestamps UTC، عدم وجود mock/placeholder/fallback، cleanup لكل sandbox mutation |
| تطبيق المزود | onboarding/KYC/approval، online toggle، availability/schedule/holiday/leave، broadcast/inbox، accept/reject/reassign، patient minimization، report/prescription، wallet/withdrawal، settings |
| لوحة الإدارة | RBAC، approvals، queues، catalogs، financial review، audit logs، exports، destructive confirmation، localization/theme، no direct bypass للملكية |

## حالات الحكم

تُصنف كل خانة إلى **PASS** إذا اكتمل مصدر واختبار وlive evidence، أو **FAIL** إذا ظهر خلل، أو **BLOCKED** إذا تعلقت بخدمة خارجية مثل Moyasar أو مزود sandbox غير متاح، أو **NOT IMPLEMENTED** إذا لم توجد شاشة/route/contract، أو **UNRECONCILED** إذا لم تتطابق النسخة المنشورة مع المصدر.

## ترتيب التنفيذ

يبدأ التنفيذ بالمصادر والـroutes، ثم provider intake لأن استلام الطلب يربط الطرفين، ثم patient booking، ثم admin oversight، ثم shared services، ثم live lifecycle الكامل. لا تُختبر فروع الدفع الحي أو SOS/QR/location غير المعتمدة بطريقة تفتحها؛ تُثبت فقط استجابتها الآمنة fail-closed.
