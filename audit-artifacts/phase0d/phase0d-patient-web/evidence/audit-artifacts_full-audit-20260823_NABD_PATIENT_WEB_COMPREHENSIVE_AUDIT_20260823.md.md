# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/NABD_PATIENT_WEB_COMPREHENSIVE_AUDIT_20260823.md`
- **Member SHA-256:** `6fb66e540946290be9d4849f33b01a7000f6e9d58ff4abb72d9d0bc5c51aa81b`
- **Line count:** 191
- **Read range:** `1-191`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: أُجري تدقيق مستقل جديد بعد إعادة جرد مصدر Mobile والويب، ولم أتعامل مع وجود ملف route أو وجود candidate في سجل سابق على أنه دليل parity. النتيجة الصادقة هي أن الويب أصبح صالحاً كمرشح إنتاج جزئي قوي للوظائف التي لها عقد حي واختبارات مطابقة، `
- `12: مصدر Mobile يحتوي على **250 ملف شاشة/مسار داخل `app/`**، منها **200 شاشة تحمل مؤشرات أفعال** مثل `onPress` أو `onSubmit` أو dispatch/navigation، و**88 شاشة تحمل مؤشرات mutations**. في المقابل، الويب يحتوي على **54 ملف صفحة فعلية** و**15 مسا`
- `31: تم حفظ الجرد والنتائج الخام في `full-audit-20260823/`، وبالأخص `mobile_navigation_actions.tsv` و`mobile_api_calls.tsv` و`web_pages_files.txt` و`web_api_routes_files.txt` و`mobile_to_web_screen_map.json`.`
- `39: | الهوية | Login وOTP bridge ومسارات session exchange/logout | منفذ بعزل session server-side؛ يلزم E2E حي بحساب sandbox |`
- `41: | الحجز | booking، cancel، reschedule، call-token BFF | منفذ بعقود idempotency واختبارات محلية؛ يلزم sandbox mutation حي |`
- `46: | الرعاية المنزلية | home-care list وservices وservice detail | منفذ حيث العقد الحي يسمح؛ booking/visits الخاصة بالمريض تحتاج sandbox/auth verification |`
- `47: | الصيدلية | medicine catalog/detail، cart، checkout، orders، tracking، prescriptions | أجزاء منفذة، لكن لا يمكن إعلان parity لكل Mobile flows دون إغلاق بقية order/reorder/chat/returns والعقود الحية |`
- `58: الفجوات الأكبر تتركز في consultation subflows مثل waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، prescription-from-doctor وpost-call rating؛ وفي diagnostics مثل booking/sample tracking/results hi`
- `62: | شاشات موجودة في Mobile دون route Web مقابل واضح | AI، emergency/SOS، wallet، family subflows، maternity، loyalty، wearables، drug scanner | Missing أو بحاجة إلى mapping موثق |`
- `98: | Production build | ناجح، Next.js standalone route compilation مكتمل |`
- `108: يمكن إعطاء **GO مشروط** فقط لنطاق محدود ومعلن: القراءة العامة المنشورة، doctor search/detail/slots، specialties، labs services/packages حيث العقد يعمل، radiology services list/modalities، home-care catalog وفق auth، appointment booking/canc`
- `112: أولاً، يجب تحويل خريطة 250 ملف Mobile إلى register وظيفي نهائي يربط كل شاشة بكل زر وكل transition وكل API، مع تصنيف صريح `Done / Partial / Blocked-on-backend / Missing / Deferred`. لا يكفي filename matching، ويجب إضافة evidence لكل action.`
### backend_consumers_or_contracts
- `46: | الرعاية المنزلية | home-care list وservices وservice detail | منفذ حيث العقد الحي يسمح؛ booking/visits الخاصة بالمريض تحتاج sandbox/auth verification |`
- `58: الفجوات الأكبر تتركز في consultation subflows مثل waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، prescription-from-doctor وpost-call rating؛ وفي diagnostics مثل booking/sample tracking/results hi`
- `69: تم إجراء طلبات GET مباشرة إلى `https://api.nabd.plus/api/v1` دون session ودون استخدام بيانات مصطنعة. النتائج التالية هي **HTTP evidence فقط**؛ 401 للعقود الخاصة سلوك أمني متوقع وليس فشلاً في الواجهة.`
- `73: | `/radiology/services` | 200 | قائمة الأشعة حية ومتاحة |`
- `74: | `/radiology/modalities` | 200 | الموداليتيز حية ومتاحة |`
- `75: | `/labs/services` | 200 | قائمة التحاليل حية ومتاحة |`
- `77: | `/insurance/companies` | 200 | شركات التأمين حية ومتاحة |`
- `78: | `/home-care/services` | 401 | عقد محمي؛ لا يصنّف blocked، بل يحتاج session sandbox |`
- `81: | `/nursing/visits` | 401 | عقد محمي؛ يحتاج session sandbox |`
- `82: | `/orders/mine` | 401 | عقد مملوك للمريض؛ يحتاج session sandbox |`
- `118: رابعاً، يجب إصلاح backend bug الخاص بـ`GET /radiology/services/:id` ثم إعادة إثبات 200 للموجود و404 لغير الموجود قبل فتح رابط التفاصيل. كذلك أي domain Mobile بلا contract حي يبقى خلف feature flag بحالة blocked، لا يُعوّض ببيانات وهمية.`
- `140: [1]: https://api.nabd.plus/api/v1/radiology/services "Nabd Plus live radiology services endpoint"`
### auth_ownership
- `39: | الهوية | Login وOTP bridge ومسارات session exchange/logout | منفذ بعزل session server-side؛ يلزم E2E حي بحساب sandbox |`
- `41: | الحجز | booking، cancel، reschedule، call-token BFF | منفذ بعقود idempotency واختبارات محلية؛ يلزم sandbox mutation حي |`
- `48: | الصحة | health hub، vitals، trends، sleep، chronic diseases/medications، reminders | صفحات موجودة؛ mutations وownership تحتاج إثباتاً حياً شاملاً |`
- `51: | الملف والإعدادات | profile، insurance، settings، notifications | صفحات موجودة بدرجات مختلفة؛ العناوين، التأمين، الإشعارات والإعدادات تحتاج sandbox ownership/mutation evidence |`
- `69: تم إجراء طلبات GET مباشرة إلى `https://api.nabd.plus/api/v1` دون session ودون استخدام بيانات مصطنعة. النتائج التالية هي **HTTP evidence فقط**؛ 401 للعقود الخاصة سلوك أمني متوقع وليس فشلاً في الواجهة.`
- `78: | `/home-care/services` | 401 | عقد محمي؛ لا يصنّف blocked، بل يحتاج session sandbox |`
- `79: | `/health/vitals-log` | 401 | عقد محمي؛ يحتاج session sandbox |`
- `80: | `/users/me/profile` | 401 | عزل صحيح بدون session |`
- `81: | `/nursing/visits` | 401 | عقد محمي؛ يحتاج session sandbox |`
- `82: | `/orders/mine` | 401 | عقد مملوك للمريض؛ يحتاج session sandbox |`
- `88: لم يظهر في scan الإنتاج أي استخدام مقصود لـ `localStorage` أو `sessionStorage` أو `document.cookie` لتخزين جلسة المريض. تطابقات `mock` التي ظهرت في الشجرة مرتبطة باختبارات Vitest وfixtures الاختبارية، لا بدليل على mock data في مسارات الإنتا`
- `90: الجلسة الحالية مبنية على httpOnly cookies وBFF boundaries، مع عدم وضع access/session tokens في body أو URL في المسارات المنفذة. يجب أن يظل هذا شرطاً إلزامياً لأي slice لاحق، مع اختبارات owner 200 / stranger 404 / unauth 401 لكل resource ممل`
### state_transitions
- `41: | الحجز | booking، cancel، reschedule، call-token BFF | منفذ بعقود idempotency واختبارات محلية؛ يلزم sandbox mutation حي |`
- `108: يمكن إعطاء **GO مشروط** فقط لنطاق محدود ومعلن: القراءة العامة المنشورة، doctor search/detail/slots، specialties، labs services/packages حيث العقد يعمل، radiology services list/modalities، home-care catalog وفق auth، appointment booking/canc`
- `114: ثانياً، يجب إغلاق شرائح GET المحمية المتبقية بحسابات sandbox معتمدة، خصوصاً nursing visits، profile/details، addresses، family read، notifications، orders/details، prescriptions/read، diagnostics results، insurance patient state، vitals his`
- `116: ثالثاً، يجب توفير `NABD_SANDBOX_*` الرسمية وتشغيل `pnpm test:sandbox` كاملاً دون skip. يجب أن تشمل النتيجة الحجز، cancel/reschedule، call-token، الدفع، pharmacy ownership/replay، diagnostics، home-care، profile، reminders، vitals، notificat`
- `120: خامساً، بعد إغلاق الوظائف، يلزم audit بصري/تفاعلي عبر كل route: RTL في اللغات الست، keyboard/focus، contrast AA، empty/error/loading، reduced motion، responsive breakpoints، deep links، refresh/session expiry، وrecovery من فشل الشبكة. نجاح `
- `178: نجحت 13 حزمة من أصل 14؛ الحزمة الفاشلة أوقفتها قاعدة الاختبار عند Home-care، ثم شُغّلت الحزم الثماني اللاحقة مستقلاً ونجحت كلها. هذا لا يثبت أن Home-care endpoint غير موجود، لأن GET بدون جلسة أعاد 401، لكنه يثبت أن حساب Sandbox الحالي لا يم`
- `185: | `POST /unified-bookings/consultation/{id}/cancel` | 401 | method/path موجود ومحمي |`
### payment_insurance_relevance
- `42: | الدفع | payment-intent للمواعيد | منفذ خلف BFF؛ يلزم إثبات PSP/تحصيل حي قبل GO مالي |`
- `51: | الملف والإعدادات | profile، insurance، settings، notifications | صفحات موجودة بدرجات مختلفة؛ العناوين، التأمين، الإشعارات والإعدادات تحتاج sandbox ownership/mutation evidence |`
- `58: الفجوات الأكبر تتركز في consultation subflows مثل waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، prescription-from-doctor وpost-call rating؛ وفي diagnostics مثل booking/sample tracking/results hi`
- `62: | شاشات موجودة في Mobile دون route Web مقابل واضح | AI، emergency/SOS، wallet، family subflows، maternity، loyalty، wearables، drug scanner | Missing أو بحاجة إلى mapping موثق |`
- `63: | أفعال Mobile بلا عقد Web منشور مثبت | بعض mutations العائلية، wallet، insurance OCR/claims، returns، chat/realtime، community، AI | Blocked/Contract review |`
- `77: | `/insurance/companies` | 200 | شركات التأمين حية ومتاحة |`
- `108: يمكن إعطاء **GO مشروط** فقط لنطاق محدود ومعلن: القراءة العامة المنشورة، doctor search/detail/slots، specialties، labs services/packages حيث العقد يعمل، radiology services list/modalities، home-care catalog وفق auth، appointment booking/canc`
- `114: ثانياً، يجب إغلاق شرائح GET المحمية المتبقية بحسابات sandbox معتمدة، خصوصاً nursing visits، profile/details، addresses، family read، notifications، orders/details، prescriptions/read، diagnostics results، insurance patient state، vitals his`
- `144: [5]: https://api.nabd.plus/api/v1/insurance/companies "Nabd Plus live insurance companies endpoint"`
- `191: لم تُشغّل mutations الحية للحجز أو الإلغاء أو إعادة الجدولة أو call-token لأن مجموعة الاختبارات الحالية read-only ولا تملك fixture موثقاً لslot متاح وappointment قابل للإلغاء، ولأن تشغيلها يتطلب عقد payload وبيانات cleanup مؤكدة. لا يجوز اع`
### error_empty_loading_retry_cancel
- `41: | الحجز | booking، cancel، reschedule، call-token BFF | منفذ بعقود idempotency واختبارات محلية؛ يلزم sandbox mutation حي |`
- `108: يمكن إعطاء **GO مشروط** فقط لنطاق محدود ومعلن: القراءة العامة المنشورة، doctor search/detail/slots، specialties، labs services/packages حيث العقد يعمل، radiology services list/modalities، home-care catalog وفق auth، appointment booking/canc`
- `116: ثالثاً، يجب توفير `NABD_SANDBOX_*` الرسمية وتشغيل `pnpm test:sandbox` كاملاً دون skip. يجب أن تشمل النتيجة الحجز، cancel/reschedule، call-token، الدفع، pharmacy ownership/replay، diagnostics، home-care، profile، reminders، vitals، notificat`
- `120: خامساً، بعد إغلاق الوظائف، يلزم audit بصري/تفاعلي عبر كل route: RTL في اللغات الست، keyboard/focus، contrast AA، empty/error/loading، reduced motion، responsive breakpoints، deep links، refresh/session expiry، وrecovery من فشل الشبكة. نجاح `
- `178: نجحت 13 حزمة من أصل 14؛ الحزمة الفاشلة أوقفتها قاعدة الاختبار عند Home-care، ثم شُغّلت الحزم الثماني اللاحقة مستقلاً ونجحت كلها. هذا لا يثبت أن Home-care endpoint غير موجود، لأن GET بدون جلسة أعاد 401، لكنه يثبت أن حساب Sandbox الحالي لا يم`
- `185: | `POST /unified-bookings/consultation/{id}/cancel` | 401 | method/path موجود ومحمي |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
