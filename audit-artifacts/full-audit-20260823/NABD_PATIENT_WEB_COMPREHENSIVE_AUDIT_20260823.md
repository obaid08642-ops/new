# تقرير التدقيق الشامل لتكافؤ Nabd Plus Patient Web

**التاريخ:** 23 أغسطس 2026  
**النطاق:** تطبيق المريض Web مقابل مصدر تطبيق Mobile المحلي  
**الفرع:** `agent/web-complete-v2-20260822`  
**الحكم الحالي:** **NO-GO للإنتاج الكامل 100%؛ GO مشروط فقط للسطوح المنفذة والمثبتة بعقودها**

## 1. الخلاصة التنفيذية

أُجري تدقيق مستقل جديد بعد إعادة جرد مصدر Mobile والويب، ولم أتعامل مع وجود ملف route أو وجود candidate في سجل سابق على أنه دليل parity. النتيجة الصادقة هي أن الويب أصبح صالحاً كمرشح إنتاج جزئي قوي للوظائف التي لها عقد حي واختبارات مطابقة، لكنه **ليس مطابقاً 100% لكل شاشات وأزرار ومسارات وسيناريوهات Mobile**.

مصدر Mobile يحتوي على **250 ملف شاشة/مسار داخل `app/`**، منها **200 شاشة تحمل مؤشرات أفعال** مثل `onPress` أو `onSubmit` أو dispatch/navigation، و**88 شاشة تحمل مؤشرات mutations**. في المقابل، الويب يحتوي على **54 ملف صفحة فعلية** و**15 مسار BFF محلياً**. هذا الفرق لا يعني آلياً أن كل ملف Mobile يحتاج صفحة مستقلة؛ بعض الملفات حالات فرعية أو مكونات تدفق. لكنه يمنع ادعاء التكافؤ الكامل قبل إغلاق mapping وظيفي لكل شاشة وفعل وسيناريو.

> **النتيجة:** ما تم تنفيذه ومثبت بعقد حي يمكن اعتماده نطاقياً. أما المنتج ككل، مع اعتبار Mobile مرجع parity، فلا يُعلن جاهزاً 100% للنشر العام.

## 2. baseline القابل لإعادة التشغيل

| المؤشر | النتيجة |
|---|---:|
| ملفات Mobile المصدرية المفحوصة (TS/TSX/JS/JSX) | 537 |
| ملفات Mobile تحت `app/` المفحوصة كشاشات/مسارات | 250 |
| مؤشرات navigation في Mobile | 469 |
| مؤشرات أفعال في Mobile | 1,083 |
| شاشات Mobile ذات مؤشرات actions | 200 |
| شاشات Mobile ذات مؤشرات mutations | 88 |
| ملفات صفحات Web | 54 |
| مسارات BFF المحلية | 15 |
| أسطر استخدام API في Web | 471 |
| سجل الرحلات الذرية المعتمد | 72 رحلة |

تم حفظ الجرد والنتائج الخام في `full-audit-20260823/`، وبالأخص `mobile_navigation_actions.tsv` و`mobile_api_calls.tsv` و`web_pages_files.txt` و`web_api_routes_files.txt` و`mobile_to_web_screen_map.json`.

## 3. ما هو مثبت حالياً في الويب

السطوح التالية لها تنفيذ Web ظاهر في الشجرة الحالية، وبعضها مدعوم باختبارات parser/SSR/security أو BFF. وجود الصفحة وحده لا يساوي اكتمال كل سيناريو Mobile، لذلك التصنيف هنا **سطح منفذ** وليس حكماً parity مطلقاً.

| المجال | السطح الموجود في Web | التقييم الحالي |
|---|---|---|
| الهوية | Login وOTP bridge ومسارات session exchange/logout | منفذ بعزل session server-side؛ يلزم E2E حي بحساب sandbox |
| الاستشارات | doctor list/detail، specialties، appointments list/detail | منفذ للقراءة والحجز ضمن العقود المنشورة |
| الحجز | booking، cancel، reschedule، call-token BFF | منفذ بعقود idempotency واختبارات محلية؛ يلزم sandbox mutation حي |
| الدفع | payment-intent للمواعيد | منفذ خلف BFF؛ يلزم إثبات PSP/تحصيل حي قبل GO مالي |
| التشخيص | labs/packages، diagnostics، radiology services list | منفذ للقراءة المنشورة |
| الأشعة | قائمة الخدمات والفلاتر/الموداليتيز | **UNBLOCKED للقائمة**؛ لا يوجد اعتماد لتفاصيل `services/:id` |
| الأشعة التفاصيل | لا يجوز اعتمادها حالياً | **BLOCKED-ON-BACKEND** لأن endpoint التفاصيل يعيد 404 للموجود بسبب binary ID bug حسب التحقق السابق |
| الرعاية المنزلية | home-care list وservices وservice detail | منفذ حيث العقد الحي يسمح؛ booking/visits الخاصة بالمريض تحتاج sandbox/auth verification |
| الصيدلية | medicine catalog/detail، cart، checkout، orders، tracking، prescriptions | أجزاء منفذة، لكن لا يمكن إعلان parity لكل Mobile flows دون إغلاق بقية order/reorder/chat/returns والعقود الحية |
| الصحة | health hub، vitals، trends، sleep، chronic diseases/medications، reminders | صفحات موجودة؛ mutations وownership تحتاج إثباتاً حياً شاملاً |
| الصحة النفسية | hub، breathing، meditation، mood، crisis contacts | القراءة/الحالات موجودة؛ السيناريوهات التفاعلية ليست مثبتة 100% كتكافؤ Mobile |
| التقارير والوصفات | reports، prescriptions list/detail | القراءة موجودة؛ مشاركة التقرير/Passport/تنزيلات ومسارات خاصة تحتاج تحققاً حيّاً |
| الملف والإعدادات | profile، insurance، settings، notifications | صفحات موجودة بدرجات مختلفة؛ العناوين، التأمين، الإشعارات والإعدادات تحتاج sandbox ownership/mutation evidence |
| الأسرة والمجتمع والذكاء الاصطناعي والطوارئ والمحفظة | لا تظهر كحزمة parity كاملة في صفحات Web الحالية | فجوات أو عقود تحتاج مراجعة قبل التفعيل؛ لا mock ولا نجاح مصطنع |

## 4. الفجوات المؤكدة من المقارنة مع Mobile

التحليل الاسمي للملفات وجد أن **38 شاشة فقط لها candidate اسمي مباشر** بين Mobile وWeb، بينما **212 شاشة لا تملك candidate اسميّاً مباشراً**. هذه النتيجة ليست وحدها حكماً نهائياً لأن الويب قد يدمج عدة شاشات Mobile في صفحة أو تدفق واحد، لكنها تكشف أن mapping الحالي غير كافٍ لإثبات 100% parity.

الفجوات الأكبر تتركز في consultation subflows مثل waiting room، incoming call، call history، follow-up، clinic location، home-visit tracking، prescription-from-doctor وpost-call rating؛ وفي diagnostics مثل booking/sample tracking/results history/my-results/test detail/insurance approval/upload؛ وفي family، emergency/SOS، wallet، AI، drug scanner، maternity، loyalty، voice، wearables، delivery، returns، community post detail، nutrition trackers، وsettings subpages.

| فئة الفجوة | أمثلة من Mobile | الحالة |
|---|---|---|
| شاشات موجودة في Mobile دون route Web مقابل واضح | AI، emergency/SOS، wallet، family subflows، maternity، loyalty، wearables، drug scanner | Missing أو بحاجة إلى mapping موثق |
| أفعال Mobile بلا عقد Web منشور مثبت | بعض mutations العائلية، wallet، insurance OCR/claims، returns، chat/realtime، community، AI | Blocked/Contract review |
| تدفقات لها صفحة عامة لكن ليست كل حالاتها مثبتة | appointments، diagnostics، pharmacy، reports | Partial حتى اختبار السيناريو الكامل |
| endpoint معروف بعطب backend | radiology service detail | Blocked-on-backend؛ لا يُبنى رابط نجاح كاذب |

## 5. التحقق الحي للعقود العامة

تم إجراء طلبات GET مباشرة إلى `https://api.nabd.plus/api/v1` دون session ودون استخدام بيانات مصطنعة. النتائج التالية هي **HTTP evidence فقط**؛ 401 للعقود الخاصة سلوك أمني متوقع وليس فشلاً في الواجهة.

| Endpoint | HTTP | الاستنتاج |
|---|---:|---|
| `/radiology/services` | 200 | قائمة الأشعة حية ومتاحة |
| `/radiology/modalities` | 200 | الموداليتيز حية ومتاحة |
| `/labs/services` | 200 | قائمة التحاليل حية ومتاحة |
| `/care/specialties` | 200 | التخصصات حية ومتاحة |
| `/insurance/companies` | 200 | شركات التأمين حية ومتاحة |
| `/home-care/services` | 401 | عقد محمي؛ لا يصنّف blocked، بل يحتاج session sandbox |
| `/health/vitals-log` | 401 | عقد محمي؛ يحتاج session sandbox |
| `/users/me/profile` | 401 | عزل صحيح بدون session |
| `/nursing/visits` | 401 | عقد محمي؛ يحتاج session sandbox |
| `/orders/mine` | 401 | عقد مملوك للمريض؛ يحتاج session sandbox |

قاعدة التدقيق المعتمدة هنا: لا يتم وصف سطح بأنه Blocked لمجرد OpenAPI قديم إذا كان endpoint الحي يعمل؛ والاستثناء المثبت هو تفاصيل الأشعة، حيث القائمة حية لكن detail endpoint نفسه ما زال معطوباً.

## 6. الأمن والصدق في البيانات

لم يظهر في scan الإنتاج أي استخدام مقصود لـ `localStorage` أو `sessionStorage` أو `document.cookie` لتخزين جلسة المريض. تطابقات `mock` التي ظهرت في الشجرة مرتبطة باختبارات Vitest وfixtures الاختبارية، لا بدليل على mock data في مسارات الإنتاج. لم أجد مبرراً لإعلان “صفر mock مطلق” على مستوى كل repository دون استثناء؛ الصياغة الأدق هي: **لا يوجد دليل mock data في production paths التي فُحصت، بينما mocks الاختبارية موجودة ومقصودة**.

الجلسة الحالية مبنية على httpOnly cookies وBFF boundaries، مع عدم وضع access/session tokens في body أو URL في المسارات المنفذة. يجب أن يظل هذا شرطاً إلزامياً لأي slice لاحق، مع اختبارات owner 200 / stranger 404 / unauth 401 لكل resource مملوك، وIdempotency-Key لكل mutation مالي أو حجوزات.

## 7. نتائج البوابات

| البوابة | النتيجة |
|---|---|
| TypeScript check | ناجح |
| Vitest | **130 test files passed، 251 passed، 14 files/23 tests skipped** |
| Production build | ناجح، Next.js standalone route compilation مكتمل |
| Sandbox contract tests | **غير قابلة للإغلاق**: فشلت أول حزمة بسبب غياب `NABD_SANDBOX_OWNER_EMAIL/PASSWORD/BASE_URL`، ولم يتم تشغيل بقية الحزم |
| Git parity | الرأس المحلي والفرع البعيد متطابقان عند `f9bbc2dec0de4618f2a8e29f9f7d7120a502975e` |

نتيجة Sandbox ليست فشلاً في عقد الإنتاج بحد ذاته؛ هي **evidence gap**. لا يجوز تحويلها إلى نجاح بالتخطي أو credentials غير معتمدة.

## 8. الحكم الإنتاجي

**NO-GO للإنتاج الكامل 100% حالياً.** السبب ليس build أو type-check؛ كلاهما ناجح. السبب هو أن تعريف المستخدم للإنتاج يتطلب parity كامل مع Mobile، وكل الأزرار والمسارات والسيناريوهات، مع عقود حية واختبارات ownership وmutations. الأدلة الحالية تثبت مجموعة كبيرة من السطوح، لكنها لا تثبت المجموعة كلها.

يمكن إعطاء **GO مشروط** فقط لنطاق محدود ومعلن: القراءة العامة المنشورة، doctor search/detail/slots، specialties، labs services/packages حيث العقد يعمل، radiology services list/modalities، home-care catalog وفق auth، appointment booking/cancel/reschedule/call-token/payment-intent وفق حدود العقد، والصفحات التي اجتازت gates الخاصة بها. هذا ليس GO للمنتج الكامل ولا بديلاً عن sandbox.

## 9. ما يلزم للوصول إلى GO كامل

أولاً، يجب تحويل خريطة 250 ملف Mobile إلى register وظيفي نهائي يربط كل شاشة بكل زر وكل transition وكل API، مع تصنيف صريح `Done / Partial / Blocked-on-backend / Missing / Deferred`. لا يكفي filename matching، ويجب إضافة evidence لكل action.

ثانياً، يجب إغلاق شرائح GET المحمية المتبقية بحسابات sandbox معتمدة، خصوصاً nursing visits، profile/details، addresses، family read، notifications، orders/details، prescriptions/read، diagnostics results، insurance patient state، vitals history، والتفاصيل المملوكة. بعد ذلك تُغلق mutations المنشورة فقط، مع owner/stranger/unauth وreplay tests.

ثالثاً، يجب توفير `NABD_SANDBOX_*` الرسمية وتشغيل `pnpm test:sandbox` كاملاً دون skip. يجب أن تشمل النتيجة الحجز، cancel/reschedule، call-token، الدفع، pharmacy ownership/replay، diagnostics، home-care، profile، reminders، vitals، notifications، chat وprescriptions حسب ما يدعمه العقد الحي.

رابعاً، يجب إصلاح backend bug الخاص بـ`GET /radiology/services/:id` ثم إعادة إثبات 200 للموجود و404 لغير الموجود قبل فتح رابط التفاصيل. كذلك أي domain Mobile بلا contract حي يبقى خلف feature flag بحالة blocked، لا يُعوّض ببيانات وهمية.

خامساً، بعد إغلاق الوظائف، يلزم audit بصري/تفاعلي عبر كل route: RTL في اللغات الست، keyboard/focus، contrast AA، empty/error/loading، reduced motion، responsive breakpoints، deep links، refresh/session expiry، وrecovery من فشل الشبكة. نجاح build وحده لا يثبت هذه النقاط.

## 10. ملفات الأدلة

| الملف | الغرض |
|---|---|
| `mobile_source_files.txt` | كل ملفات Mobile المصدرية المفحوصة |
| `mobile_screen_files.txt` | ملفات Mobile المرشحة كشاشات |
| `mobile_navigation_actions.tsv` | مؤشرات التنقل والأفعال |
| `mobile_api_calls.tsv` | استدعاءات API التي ظهرت في Mobile |
| `web_pages_files.txt` | صفحات Web الفعلية |
| `web_api_routes_files.txt` | مسارات BFF الفعلية |
| `mobile_to_web_screen_map.json` | المقارنة الآلية screen-level |
| `live-contract-probe.tsv` | نتائج HTTP الحية للعقود العامة/المحمية |
| `gates.log` | check/test/build الفعلية |
| `sandbox-gate.log` | سبب عدم إغلاق اختبار Sandbox |
| `summary.json` و`screen_map_summary.json` | مؤشرات الجرد الآلي |

## References

[1]: https://api.nabd.plus/api/v1/radiology/services "Nabd Plus live radiology services endpoint"
[2]: https://api.nabd.plus/api/v1/radiology/modalities "Nabd Plus live radiology modalities endpoint"
[3]: https://api.nabd.plus/api/v1/labs/services "Nabd Plus live labs services endpoint"
[4]: https://api.nabd.plus/api/v1/care/specialties "Nabd Plus live care specialties endpoint"
[5]: https://api.nabd.plus/api/v1/insurance/companies "Nabd Plus live insurance companies endpoint"
[6]: https://github.com/obaid08642-ops/new/tree/agent/web-complete-v2-20260822 "Verified Web branch"


## 11. إعادة التحقق النهائي في Phase 11

تم تشغيل `pnpm test:sandbox` فعلياً مرة أخرى. توقفت الدفعة الأولى عند `lib/api/sandbox-secrets.test.ts` لأن `NABD_SANDBOX_OWNER_EMAIL` و`NABD_SANDBOX_OWNER_PASSWORD` و`NABD_SANDBOX_BASE_URL` غير موجودة. النتيجة **محجوبة بمدخلات تشغيلية مفقودة** وليست نجاحاً أو skip صامتاً، ولم تُستخدم credentials بديلة.

بعد آخر تغييرات الأمن، نجحت البوابة المحلية الكاملة بـ**132 ملف اختبار ناجحاً، 254 اختباراً ناجحاً، 14 ملفاً و23 اختباراً متخطياً، type-check ناجح، وproduction build ناجح**. آخر رأس بعيد موثق هو `ed563e46e8d8fb3b6cec41e62c9e42d9938fdc94` قبل تحديثات تدقيق البوابات اللاحقة؛ يجب استخدام ناتج `git ls-remote` من آخر commit عند التسليم النهائي وعدم الاعتماد على هذا الرقم القديم.

تمت إضافة security headers ورفع postcss إلى 8.5.26. بقيت مراجعة advisory @babel/core low، وDocker smoke، وقياسات Core Web Vitals، واختبارات Sandbox الحية كـevidence gaps حتى تُنفذ داخل CI/staging وخارج بيئة التدقيق الحالية.
