# خطة إغلاق فجوات Nabd Plus Patient Web والوصول إلى الإطلاق

**التاريخ:** 23 أغسطس 2026  
**نقطة الانطلاق:** الفرع `agent/web-complete-v2-20260822` عند commit `2c9bcd01842abba64b6fc29a82a9c825956bc89b`  
**الهدف:** إغلاق كل فجوة وظيفية وأمنية وبيانية وتجريبية بين Web وتطبيق Mobile، ثم إعلان قرار إطلاق مبني على أدلة قابلة لإعادة التشغيل.

## 1. تعريف النجاح

لا يعني “جاهز للإنتاج” أن البناء ينجح فقط. يعتبر المشروع جاهزاً عندما يكون لكل شاشة Mobile أو حالة فرعية أو زر أو انتقال مقابل Web موثق، أو حالة `Blocked-on-backend` موثقة بوضوح، ولا توجد mock data في production paths، وكل mutation مدعوم بعقد حي واختبارات ملكية وإعادة تشغيل، وتنجح بوابات الأمن والـbuild والاختبارات المحلية والـsandbox والاختبار التفاعلي.

يحتوي baseline الحالي على **250 ملف شاشة/مسار Mobile داخل `app/`**، منها **200 تحمل مؤشرات أفعال** و**88 تحمل مؤشرات mutations**. في Web توجد **54 صفحة فعلية و15 مسار BFF**. هذه الأرقام لا تعني أن كل ملف Mobile صفحة مستقلة؛ لكنها تعني أن route-level parity الحالي لا يثبت التكافؤ الكامل، ولذلك ستكون الخطوة الأولى هي تحويل الجرد إلى mapping وظيفي نهائي لا يعتمد على تشابه أسماء الملفات.

## 2. مصفوفة الفجوات حسب المجال

| المجال | حالة Web الحالية | الفجوة الرئيسية | الأولوية | معيار الإغلاق |
|---|---|---|---|---|
| Auth/OTP/onboarding | Login وOTP bridge موجودان | E2E حي، حالات انتهاء OTP وإعادة الإرسال، التسجيل/الترحيب/سياسات الاستخدام | P0 | request/verify/exchange حي، cookie-only، rate limit، refresh/expiry، no token leak |
| Consultations | بحث الأطباء، التفاصيل، المواعيد، الحجز، الإلغاء، إعادة الجدولة، call-token | waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، post-call rating، prescription-from-doctor، chat | P0 | كل transition له route/contract؛ appointment ownership 200/404/401؛ replay/idempotency؛ call token TTL |
| Payments | Payment Intent للمواعيد | PSP confirmation، فشل الدفع، retry، redirect/webhook reconciliation، pharmacy payment coverage | P0 | لا success إلا من server/PSP؛ idempotency؛ no client totals؛ reconciliation tests |
| Radiology | قائمة services وmodalities تعمل حياً | `services/:id` يعيد 404 للموجود بسبب binary ID bug | P0 backend | إصلاح backend ثم 200 للموجود و404 لغير الموجود؛ قبل ذلك يبقى الرابط محجوباً |
| Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛ owner isolation للنتائج والحجوزات |
| Home care/Nursing | catalog وservice detail موجودان | nursing visits، provider/visit details، booking/tracking، patient-owned visit reads | P1 | session sandbox؛ 200/404/401؛ لا إنشاء route غير موجود بالعقد |
| Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P0/P1 | عقود checkout/reorder/cancel/chat/returns؛ replay؛ totals server-authoritative؛ ownership 404 |
| Health/Vitals/Reminders | health pages، vitals، sleep، chronic، reminders | كل mutations المحمية، refill، logs، emergency contacts، wearables، medication flows | P1 | GET وmutation contracts؛ idempotency؛ owner tests؛ audit للبيانات الصحية |
| Profile/Settings | profile، insurance، settings، notifications pages | addresses، insurance policy/claims/OCR، privacy، security sessions/password، notification settings، loyalty | P1 | owner 200/stranger 404/unauth 401؛ لا كشف profile أو sessions |
| Reports/Prescriptions | lists/details موجودة | report view/timeline/passport/share/download، prescription actions | P1 | signed/short-lived access حيث يلزم؛ لا معرفات أو tokens في URL غير المسموح |
| Family | hub أساسي فقط | invite/join/permissions/requests/chat/calendar/member health/scan | P1 | عقد family حي؛ actor/member authorization؛ 404 للغريب؛ audit events |
| Notifications/Chat/Community | notifications وchat pages موجودة بدرجات | mark/read-all، realtime، support chat، community post detail/actions | P1 | contract/realtime security؛ rate limits؛ no optimistic false success |
| AI/Drug Scanner/Voice | لا parity كاملة | symptom checker، triage، skin analysis، prescription translator، monthly report، voice | P2 | عقد منشور، privacy/consent، model failure state، no fabricated diagnosis |
| Emergency/SOS/Location | لا parity كاملة | SOS، active emergency، location/QR/consent | P0 governance | backend governance، consent، rate-limit، truthful dispatch state؛ لا تفعيل قبل الاعتماد |
| Wallet/Delivery/Returns | gaps واسعة | cards، top-up، transfer، transactions، delivery address، returns | P0/P1 | financial-grade idempotency، ledger reconciliation، owner isolation، no false success |
| Nutrition/Mental/Maternity/Loyalty/Wearables | بعض الصفحات أو لا parity كاملة | trackers، targets، maternity flows، loyalty account، devices/data | P2 | عقد حي لكل فعل؛ privacy؛ empty/error states؛ no local-only authoritative data |

## 3. ترتيب التنفيذ المقترح

### المرحلة A — إغلاق baseline والحوكمة

نحوّل كل ملفات Mobile إلى سجل ذري يربط: اسم الشاشة، المدخل إليها، كل button/action، الانتقال الناتج، endpoint، HTTP method، ownership scope، loading/empty/error state، Web route، وحالة التنفيذ. الحالات المسموحة هي `Done`, `Partial`, `Missing`, `Blocked-on-backend`, و`Deferred`. لا تُحسب `candidate` أو page shell كإنجاز.

تُضاف بوابة آلية تمنع إنشاء route Web غير موجود في العقد الحي أو OpenAPI المعتمد، وتمنع وضع بيانات fallback توحي بنجاح فعلي. كل صف `Done` يجب أن يشير إلى commit، test file، وlive evidence أو contract evidence.

### المرحلة B — P0: الهوية والحجز والدفع والأمان المالي

نغلق Auth/OTP بالكامل أولاً: طلب OTP، verify، exchange أحادي الاستخدام TTL 60 ثانية، rate limit، انتهاء الرمز، إعادة الإرسال، session expiry، logout، ورفض أي token في body أو URL أو browser storage. بعد ذلك نغلق appointment booking/cancel/reschedule/call-token/payment-intent مع lock للموعد، idempotency، ومنع replay.

يجب أن تُختبر كل mutation بثلاثة حدود: unauth يعيد 401، المالك يحصل على 200/2xx المناسب، وغريب يحصل على 404 دون كشف وجود المورد. للعمليات المالية والحجز يجب أن يعيد replay نفس النتيجة الآمنة أو يرفضه بطريقة متعاقد عليها، دون إنشاء مورد ثانٍ.

### المرحلة C — P0/P1: Pharmacy وOrders

نغلق cart lines وcheckout وorder details/tracking وcancel/reorder/returns والـchat المرتبط بالطلب فقط بعد التحقق من live contract. يجب أن تكون الأسعار والإجماليات والخصومات من الخادم، وأن تظهر حالات pending/failed/paid من مصدر authoritative فقط. أي زر لا يملك عقداً حياً يبقى disabled أو يعرض حالة محجوبة صادقة، وليس toast نجاحاً مصطنعاً.

### المرحلة D — P1: Diagnostics وHome-care وProfile

نغلق labs package/test details والـbooking/results/tracking، ثم nursing visits وhome-care patient flows، ثم profile/addresses/insurance/settings/notifications. هذه المجموعة تحتاج sandbox owner account لأنها محمية، ولا يمكن اعتمادها من 401 العام وحده.

تبقى Radiology detail مؤجلة حتى إصلاح backend binary ID bug. بعد إصلاحه، تنفذ شريحة منفصلة لا تُدمج مع قائمة الأشعة، مع إثبات 200 للمورد الصحيح و404 لمعرف غير موجود و404 لمعرف مملوك لمريض آخر عند انطباق الملكية.

### المرحلة E — P1/P2: Family، Reports، Chat، Community، Health extensions

تُنفذ family بحدود actor/member واضحة، ثم reports/prescriptions مع حماية الملفات والروابط القصيرة، ثم notifications/chat/community، ثم health extensions مثل wearables وrefills وemergency contacts. أي realtime أو push يحتاج عقداً موثقاً، reconnect strategy، duplicate-event handling، وlogout cleanup.

### المرحلة F — P0 governance وP2 enhancements

لا يُفعّل SOS أو AI الطبي أو wallet المالي أو أي flow عالي التأثير إلا بعد عقود حوكمة صريحة، consent، audit logging، rate limit، server-authoritative status، ومسارات فشل واضحة. بعد ذلك تأتي maternity، nutrition، mental-health interactive، loyalty، voice وdrug scanner حسب العقود المنشورة والأولوية التجارية.

## 4. متطلبات الأمن الثابتة

| الضابط | شرط القبول |
|---|---|
| Session | httpOnly، Secure في الإنتاج، SameSite مناسب، لا session token في localStorage/sessionStorage أو HTML أو URL |
| BFF boundary | المتصفح يستدعي Web BFF فقط؛ لا يملك أسرار upstream ولا يمرر arbitrary upstream host/path |
| Ownership | resource المملوك يعيد 404 للغريب، و401 لغير الموثق، مع عدم اختلاف response بما يكشف وجود المورد |
| Mutations | Idempotency-Key إلزامي للحجز والمال والعمليات الحساسة؛ replay test لكل mutation |
| Input validation | identifiers وUUID/slug/date/filter validation؛ رفض path traversal وunexpected fields |
| Data truthfulness | لا mock data في production؛ لا totals أو queue position أو status مصطنع؛ empty/error states صادقة |
| Uploads | allowlist للنوع والحجم، scan/expiry، ownership، signed URLs قصيرة العمر، وعدم تسريب المسار الداخلي |
| Rate limits | OTP، login، chat، upload، booking، payment وSOS لها rate limit واختبار 429 |
| Observability | correlation IDs وaudit logs دون PHI أو tokens؛ redaction للـauthorization وcookies |
| Headers | CSP، HSTS، X-Content-Type-Options، Referrer-Policy، frame protection، secure CORS/CSRF strategy |

## 5. UX والـUI والأنيميشن

يُراجع كل سطح بعد إغلاق عقده، لا قبله. يجب أن يملك كل route حالات loading skeleton، empty، error، retry، unauthorized، وnot-found مصممة. الحركة تكون ذات معنى: دخول الصفحة، انتقالات 180–300ms، micro-interactions للأزرار، stagger خفيف للقوائم، و`prefers-reduced-motion` يحذف الحركة غير الضرورية. يجب التحقق من RTL في AR/UR، ومن EN/HI/BN/FIL، والتأكد من typography، contrast AA، focus rings، keyboard navigation، وresponsive layouts.

الفخامة لا تُقاس بكثرة المؤثرات. معيار القبول هو أن تكون الحركة سريعة وهادئة ولا تعيق القراءة أو الصحة أو الدفع، وأن تبقى كل حالة قابلة للفهم عند ضعف الشبكة أو تعطيل الحركة.

## 6. بوابات كل Contract Slice

لا تنتقل أي شريحة إلى التالية إلا بعد اكتمال العناصر الآتية:

| البوابة | المطلوب |
|---|---|
| Contract | endpoint حي أو عقد منشور، DTO/parser محدود، identifiers وerror codes موثقة |
| Implementation | Web route/page وBFF/server wrapper، بلا token browser leakage وبلا mock |
| Security tests | 200 owner، 404 stranger، 401 unauth، وrate-limit حيث يلزم |
| Mutation tests | Idempotency/replay، no double booking/charge/order، client totals غير موثوقة |
| UX | loading/empty/error/not-found/unauthorized، RTL، reduced motion، keyboard/focus |
| Regression | `pnpm check`، `pnpm test`، `pnpm build`، وعدم كسر الشرائح السابقة |
| Live | Sandbox contract test بالحسابات الرسمية؛ لا credentials مخترعة أو skip غير موثق |
| Delivery | commit مستقل، push، و`git ls-remote` يساوي local HEAD، وتحديث register والتقرير |

## 7. الاعتماديات التي يجب توفيرها

لا يمكن إغلاق الاختبارات الحية الخاصة بالمريض دون حسابات Sandbox رسمية، تشمل base URL وowner credentials أو session mechanism المعتمد وdevice identifier عند الحاجة. يجب توفيرها عبر بيئة سرية لا تُكتب في repository أو التقرير. كما يلزم backend deploy لإصلاح Radiology detail، وأي عقود مفقودة لمجالات wallet، AI، SOS، family، insurance mutations، realtime/chat وdiagnostics subflows.

إذا لم يُوفر عقد مجال ما، لا يتم اختلاقه. يسجل `Blocked-on-backend` مع endpoint المطلوب، payload/response المتوقع، security ownership، وقرار واضح بأن الواجهة غير مفعلة.

## 8. تعريف GO النهائي

يكون الحكم النهائي **GO** فقط عندما يصل register إلى 100% من الرحلات بحالة `Done` أو `Deferred` مع اعتماد مالك واضح، ولا يبقى أي P0 مفتوح، وتُغلق Radiology detail أو تُستبعد رسمياً من scope، وتنجح جميع البوابات المحلية والـsandbox، ويُنفذ smoke test على production-like environment، ويُراجع rollback/health/readiness/logging.

يكون الحكم **NO-GO** تلقائياً عند وجود أي token leakage، mock success، mutation بلا idempotency، owner isolation غير صحيح، دفع غير reconciled، SOS/AI طبي غير محكوم، أو Sandbox غير قابل للتنفيذ في نطاق مطلوب للإطلاق.

## 9. أول دفعة تنفيذية بعد اعتماد الخطة

الدفعة الأولى المقترحة هي **P0 Contract Closure**: تثبيت register الوظيفي، ثم تشغيل Auth/OTP sandbox، ثم appointment booking/cancel/reschedule/call-token/payment-intent regression، ثم pharmacy/order ownership وreplay. بعد كل slice يتم commit/push والتحقق بـ`git ls-remote` قبل بدء التالية.

الـbaseline الحالي موثق في:

- `NABD_PATIENT_WEB_COMPREHENSIVE_AUDIT_20260823.md`
- `summary.json`
- `screen_map_summary.json`
- `mobile_to_web_screen_map.json`
- `live-contract-probe.tsv`
- `gates.log`
- `sandbox-gate.log`

**الخلاصة:** المسار الآمن ليس إضافة صفحات شكلية لكل ملف Mobile، بل إغلاق كل capability بعقد حي، ملكية، بيانات حقيقية، حالات فشل، اختبارات، وتجربة استخدام كاملة. بهذه الطريقة فقط يمكن الانتقال من “read-only parity candidate” إلى إطلاق إنتاجي قابل للدفاع عنه.
