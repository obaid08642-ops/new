# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/NABD_PATIENT_WEB_GAP_CLOSURE_PLAN_AR.md`
- **Member SHA-256:** `b915952bd3a49278569284c8abdf1bdc7364b48f833694190e5d25e0028555da`
- **Line count:** 185
- **Read range:** `1-185`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: يحتوي baseline الحالي على **250 ملف شاشة/مسار Mobile داخل `app/`**، منها **200 تحمل مؤشرات أفعال** و**88 تحمل مؤشرات mutations**. في Web توجد **54 صفحة فعلية و15 مسار BFF**. هذه الأرقام لا تعني أن كل ملف Mobile صفحة مستقلة؛ لكنها تعني أن ro`
- `17: | Auth/OTP/onboarding | Login وOTP bridge موجودان | E2E حي، حالات انتهاء OTP وإعادة الإرسال، التسجيل/الترحيب/سياسات الاستخدام | P0 | request/verify/exchange حي، cookie-only، rate limit، refresh/expiry، no token leak |`
- `18: | Consultations | بحث الأطباء، التفاصيل، المواعيد، الحجز، الإلغاء، إعادة الجدولة، call-token | waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، post-call rating، prescription-from-doctor، chat | P0`
- `19: | Payments | Payment Intent للمواعيد | PSP confirmation، فشل الدفع، retry، redirect/webhook reconciliation، pharmacy payment coverage | P0 | لا success إلا من server/PSP؛ idempotency؛ no client totals؛ reconciliation tests |`
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `22: | Home care/Nursing | catalog وservice detail موجودان | nursing visits، provider/visit details، booking/tracking، patient-owned visit reads | P1 | session sandbox؛ 200/404/401؛ لا إنشاء route غير موجود بالعقد |`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `24: | Health/Vitals/Reminders | health pages، vitals، sleep، chronic، reminders | كل mutations المحمية، refill، logs، emergency contacts، wearables، medication flows | P1 | GET وmutation contracts؛ idempotency؛ owner tests؛ audit للبيانات الصحي`
- `25: | Profile/Settings | profile، insurance، settings، notifications pages | addresses، insurance policy/claims/OCR، privacy، security sessions/password، notification settings، loyalty | P1 | owner 200/stranger 404/unauth 401؛ لا كشف profile أو`
- `26: | Reports/Prescriptions | lists/details موجودة | report view/timeline/passport/share/download، prescription actions | P1 | signed/short-lived access حيث يلزم؛ لا معرفات أو tokens في URL غير المسموح |`
- `28: | Notifications/Chat/Community | notifications وchat pages موجودة بدرجات | mark/read-all، realtime، support chat، community post detail/actions | P1 | contract/realtime security؛ rate limits؛ no optimistic false success |`
- `38: نحوّل كل ملفات Mobile إلى سجل ذري يربط: اسم الشاشة، المدخل إليها، كل button/action، الانتقال الناتج، endpoint، HTTP method، ownership scope، loading/empty/error state، Web route، وحالة التنفيذ. الحالات المسموحة هي `Done`, `Partial`, `Missin`
### backend_consumers_or_contracts
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `22: | Home care/Nursing | catalog وservice detail موجودان | nursing visits، provider/visit details، booking/tracking، patient-owned visit reads | P1 | session sandbox؛ 200/404/401؛ لا إنشاء route غير موجود بالعقد |`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `54: نغلق labs package/test details والـbooking/results/tracking، ثم nursing visits وhome-care patient flows، ثم profile/addresses/insurance/settings/notifications. هذه المجموعة تحتاج sandbox owner account لأنها محمية، ولا يمكن اعتمادها من 401 ا`
- `135: > `PATCH /api/v1/unified-bookings/consultation/{id}/reschedule` يعيد 401 دون جلسة، بينما `POST` على المسار نفسه يعيد 404.`
- `137: لذلك تم تصحيح BFF إلى `PATCH /api/appointments/[appointmentId]/reschedule`، وتصحيح الاستدعاء من Appointment Detail إلى `PATCH`، وتحديث الاختبار ليثبت `method: "PATCH"` في الطلب المتجه إلى upstream. دليل التحقق محفوظ في `full-audit-20260823/`
- `156: | Home care/Nursing | service → provider/visit availability → address/consent → booking/payment → confirmation → visit tracking/status → cancellation/reschedule وفق العقد |`
- `157: | Pharmacy | catalog/search/detail → cart lines → address/profile → prescription/upload عند الحاجة → checkout/coupon/wallet → order pending/confirmed → tracking → cancel/reorder/return/chat حسب العقد |`
- `159: | Profile/Insurance | authenticated profile → addresses/insurance/security/preferences → save → refresh → owner isolation |`
- `185: تبدأ الدورة الحالية بإغلاق Reschedule المصحح والتحقق من regression، ثم تحديث contract register، ثم تنفيذ P0 Auth/appointments/payments/pharmacy journeys. كل شريحة منفصلة، وكل شريحة لها live method/path probe قبل التنفيذ، ثم implementation، `
### auth_ownership
- `17: | Auth/OTP/onboarding | Login وOTP bridge موجودان | E2E حي، حالات انتهاء OTP وإعادة الإرسال، التسجيل/الترحيب/سياسات الاستخدام | P0 | request/verify/exchange حي، cookie-only، rate limit، refresh/expiry، no token leak |`
- `18: | Consultations | بحث الأطباء، التفاصيل، المواعيد، الحجز، الإلغاء، إعادة الجدولة، call-token | waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، post-call rating، prescription-from-doctor، chat | P0`
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `22: | Home care/Nursing | catalog وservice detail موجودان | nursing visits، provider/visit details، booking/tracking، patient-owned visit reads | P1 | session sandbox؛ 200/404/401؛ لا إنشاء route غير موجود بالعقد |`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `24: | Health/Vitals/Reminders | health pages، vitals، sleep، chronic، reminders | كل mutations المحمية، refill، logs، emergency contacts، wearables، medication flows | P1 | GET وmutation contracts؛ idempotency؛ owner tests؛ audit للبيانات الصحي`
- `25: | Profile/Settings | profile، insurance، settings، notifications pages | addresses، insurance policy/claims/OCR، privacy، security sessions/password، notification settings، loyalty | P1 | owner 200/stranger 404/unauth 401؛ لا كشف profile أو`
- `26: | Reports/Prescriptions | lists/details موجودة | report view/timeline/passport/share/download، prescription actions | P1 | signed/short-lived access حيث يلزم؛ لا معرفات أو tokens في URL غير المسموح |`
- `27: | Family | hub أساسي فقط | invite/join/permissions/requests/chat/calendar/member health/scan | P1 | عقد family حي؛ actor/member authorization؛ 404 للغريب؛ audit events |`
- `31: | Wallet/Delivery/Returns | gaps واسعة | cards، top-up، transfer، transactions، delivery address، returns | P0/P1 | financial-grade idempotency، ledger reconciliation، owner isolation، no false success |`
- `38: نحوّل كل ملفات Mobile إلى سجل ذري يربط: اسم الشاشة، المدخل إليها، كل button/action، الانتقال الناتج، endpoint، HTTP method، ownership scope، loading/empty/error state، Web route، وحالة التنفيذ. الحالات المسموحة هي `Done`, `Partial`, `Missin`
- `44: نغلق Auth/OTP بالكامل أولاً: طلب OTP، verify، exchange أحادي الاستخدام TTL 60 ثانية، rate limit، انتهاء الرمز، إعادة الإرسال، session expiry، logout، ورفض أي token في body أو URL أو browser storage. بعد ذلك نغلق appointment booking/cancel/r`
### state_transitions
- `19: | Payments | Payment Intent للمواعيد | PSP confirmation، فشل الدفع، retry، redirect/webhook reconciliation، pharmacy payment coverage | P0 | لا success إلا من server/PSP؛ idempotency؛ no client totals؛ reconciliation tests |`
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `28: | Notifications/Chat/Community | notifications وchat pages موجودة بدرجات | mark/read-all، realtime، support chat، community post detail/actions | P1 | contract/realtime security؛ rate limits؛ no optimistic false success |`
- `29: | AI/Drug Scanner/Voice | لا parity كاملة | symptom checker، triage، skin analysis، prescription translator، monthly report، voice | P2 | عقد منشور، privacy/consent، model failure state، no fabricated diagnosis |`
- `30: | Emergency/SOS/Location | لا parity كاملة | SOS، active emergency، location/QR/consent | P0 governance | backend governance، consent، rate-limit، truthful dispatch state؛ لا تفعيل قبل الاعتماد |`
- `31: | Wallet/Delivery/Returns | gaps واسعة | cards، top-up، transfer، transactions، delivery address، returns | P0/P1 | financial-grade idempotency، ledger reconciliation، owner isolation، no false success |`
- `32: | Nutrition/Mental/Maternity/Loyalty/Wearables | بعض الصفحات أو لا parity كاملة | trackers، targets، maternity flows، loyalty account، devices/data | P2 | عقد حي لكل فعل؛ privacy؛ empty/error states؛ no local-only authoritative data |`
- `38: نحوّل كل ملفات Mobile إلى سجل ذري يربط: اسم الشاشة، المدخل إليها، كل button/action، الانتقال الناتج، endpoint، HTTP method، ownership scope، loading/empty/error state، Web route، وحالة التنفيذ. الحالات المسموحة هي `Done`, `Partial`, `Missin`
- `44: نغلق Auth/OTP بالكامل أولاً: طلب OTP، verify، exchange أحادي الاستخدام TTL 60 ثانية، rate limit، انتهاء الرمز، إعادة الإرسال، session expiry، logout، ورفض أي token في body أو URL أو browser storage. بعد ذلك نغلق appointment booking/cancel/r`
- `50: نغلق cart lines وcheckout وorder details/tracking وcancel/reorder/returns والـchat المرتبط بالطلب فقط بعد التحقق من live contract. يجب أن تكون الأسعار والإجماليات والخصومات من الخادم، وأن تظهر حالات pending/failed/paid من مصدر authoritative`
- `64: لا يُفعّل SOS أو AI الطبي أو wallet المالي أو أي flow عالي التأثير إلا بعد عقود حوكمة صريحة، consent، audit logging، rate limit، server-authoritative status، ومسارات فشل واضحة. بعد ذلك تأتي maternity، nutrition، mental-health interactive، l`
### payment_insurance_relevance
- `19: | Payments | Payment Intent للمواعيد | PSP confirmation، فشل الدفع، retry، redirect/webhook reconciliation، pharmacy payment coverage | P0 | لا success إلا من server/PSP؛ idempotency؛ no client totals؛ reconciliation tests |`
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `25: | Profile/Settings | profile، insurance، settings، notifications pages | addresses، insurance policy/claims/OCR، privacy، security sessions/password، notification settings، loyalty | P1 | owner 200/stranger 404/unauth 401؛ لا كشف profile أو`
- `31: | Wallet/Delivery/Returns | gaps واسعة | cards، top-up، transfer، transactions، delivery address، returns | P0/P1 | financial-grade idempotency، ledger reconciliation، owner isolation، no false success |`
- `44: نغلق Auth/OTP بالكامل أولاً: طلب OTP، verify، exchange أحادي الاستخدام TTL 60 ثانية، rate limit، انتهاء الرمز، إعادة الإرسال، session expiry، logout، ورفض أي token في body أو URL أو browser storage. بعد ذلك نغلق appointment booking/cancel/r`
- `54: نغلق labs package/test details والـbooking/results/tracking، ثم nursing visits وhome-care patient flows، ثم profile/addresses/insurance/settings/notifications. هذه المجموعة تحتاج sandbox owner account لأنها محمية، ولا يمكن اعتمادها من 401 ا`
- `64: لا يُفعّل SOS أو AI الطبي أو wallet المالي أو أي flow عالي التأثير إلا بعد عقود حوكمة صريحة، consent، audit logging، rate limit، server-authoritative status، ومسارات فشل واضحة. بعد ذلك تأتي maternity، nutrition، mental-health interactive، l`
- `75: | Data truthfulness | لا mock data في production؛ لا totals أو queue position أو status مصطنع؛ empty/error states صادقة |`
- `77: | Rate limits | OTP، login، chat، upload، booking، payment وSOS لها rate limit واختبار 429 |`
- `96: | Mutation tests | Idempotency/replay، no double booking/charge/order، client totals غير موثوقة |`
- `104: لا يمكن إغلاق الاختبارات الحية الخاصة بالمريض دون حسابات Sandbox رسمية، تشمل base URL وowner credentials أو session mechanism المعتمد وdevice identifier عند الحاجة. يجب توفيرها عبر بيئة سرية لا تُكتب في repository أو التقرير. كما يلزم backe`
### error_empty_loading_retry_cancel
- `19: | Payments | Payment Intent للمواعيد | PSP confirmation، فشل الدفع، retry، redirect/webhook reconciliation، pharmacy payment coverage | P0 | لا success إلا من server/PSP؛ idempotency؛ no client totals؛ reconciliation tests |`
- `21: | Labs/Diagnostics | services/packages وقوائم أساسية موجودة | package/test detail، book sample، booking confirmation/success، tracking، results history، my-results، upload/insurance approval | P1 | كل endpoint حي؛ حالات loading/empty/error؛`
- `23: | Pharmacy/Orders | catalog/detail/cart/checkout/orders/tracking/prescriptions جزئياً | wishlist، compare، reorder partial، returns، broadcast bids، pharmacist chat، manual/custom order، prescription OCR/upload، order approval/rejection | P`
- `32: | Nutrition/Mental/Maternity/Loyalty/Wearables | بعض الصفحات أو لا parity كاملة | trackers، targets، maternity flows، loyalty account، devices/data | P2 | عقد حي لكل فعل؛ privacy؛ empty/error states؛ no local-only authoritative data |`
- `38: نحوّل كل ملفات Mobile إلى سجل ذري يربط: اسم الشاشة، المدخل إليها، كل button/action، الانتقال الناتج، endpoint، HTTP method، ownership scope، loading/empty/error state، Web route، وحالة التنفيذ. الحالات المسموحة هي `Done`, `Partial`, `Missin`
- `44: نغلق Auth/OTP بالكامل أولاً: طلب OTP، verify، exchange أحادي الاستخدام TTL 60 ثانية، rate limit، انتهاء الرمز، إعادة الإرسال، session expiry، logout، ورفض أي token في body أو URL أو browser storage. بعد ذلك نغلق appointment booking/cancel/r`
- `50: نغلق cart lines وcheckout وorder details/tracking وcancel/reorder/returns والـchat المرتبط بالطلب فقط بعد التحقق من live contract. يجب أن تكون الأسعار والإجماليات والخصومات من الخادم، وأن تظهر حالات pending/failed/paid من مصدر authoritative`
- `75: | Data truthfulness | لا mock data في production؛ لا totals أو queue position أو status مصطنع؛ empty/error states صادقة |`
- `83: يُراجع كل سطح بعد إغلاق عقده، لا قبله. يجب أن يملك كل route حالات loading skeleton، empty، error، retry، unauthorized، وnot-found مصممة. الحركة تكون ذات معنى: دخول الصفحة، انتقالات 180–300ms، micro-interactions للأزرار، stagger خفيف للقوائم`
- `93: | Contract | endpoint حي أو عقد منشور، DTO/parser محدود، identifiers وerror codes موثقة |`
- `97: | UX | loading/empty/error/not-found/unauthorized، RTL، reduced motion، keyboard/focus |`
- `116: الدفعة الأولى المقترحة هي **P0 Contract Closure**: تثبيت register الوظيفي، ثم تشغيل Auth/OTP sandbox، ثم appointment booking/cancel/reschedule/call-token/payment-intent regression، ثم pharmacy/order ownership وreplay. بعد كل slice يتم commi`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
