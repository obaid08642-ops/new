# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE4_DIAGNOSTICS_HOMECARE_PHARMACY_ORDERS_REVIEW_AR.md`
- **Member SHA-256:** `674aa9fccb94fde9f722ad3a1b6dffe169fe62462a4f2014ea8d9a30b40a7ceb`
- **Line count:** 78
- **Read range:** `1-78`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: **Contract inventory PASS؛ feature closure جزئي ومشروط.** تم التحقق من method/path للعقود الحية، ومراجعة صفحات Web الحالية مقابل Mobile. لم تتم إضافة routes غير مثبتة، ولم تُستخدم بيانات mock.`
- `13: | `GET /labs/bookings/mine` | 401 | مسار مملوك للمريض ومحمي |`
- `16: | `GET /radiology/bookings/mine` | 401 | حجز المريض محمي |`
- `19: | `GET /home-care/bookings/my` | 401 | العقد محمي؛ يحتاج Sandbox |`
- `37: لذلك لا يجوز نسخ زر Mobile إلى Web على أنه checkout حقيقي قبل إثبات عقد diagnostics cart. القرار الصادق هو:`
- `39: > **Package detail read: Done ضمن عقد GET. Add-to-diagnostics-cart: Partial/Deferred حتى يثبت contract واضح للسلة والـcheckout، أو يُعتمد رسمياً تنفيذ local cart غير مالي مع رحلة لاحقة متعاقدة.**`
- `45: تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/trackin`
- `47: كل واحدة ستبدأ بضربة حية method/path دون جلسة. إذا أعادت 401/403 نتحقق بعدها بحساب Sandbox؛ إذا أعادت 404 فلا ننشئ route حتى يثبت backend contract مختلف. بعد التنفيذ تُضاف اختبارات owner/stranger/unauth وreplay حيث ينطبق، ثم visual/UX state`
- `59: اختبارات الشريحة: parser وserver boundary نجحا، وfull test أصبح **132 ملفاً ناجحاً و254 اختباراً ناجحاً** مع بقاء اختبارات Sandbox متخطاة لغياب الحسابات الرسمية، وproduction build نجح وظهر route `/[locale]/wishlist`.`
- `78: الدليل الخام في `phase4-mutation-method-probe.tsv`. وجود route محمي لا يكفي لتفعيله: يلزم payload contract موثق، server-authoritative totals، ownership، Idempotency-Key، replay behavior، وSandbox owner/stranger/unauth. لذلك تبقى هذه mutatio`
### backend_consumers_or_contracts
- `11: | `GET /labs/services` | 200 | قائمة التحاليل العامة حية |`
- `12: | `GET /labs/packages` | 200 | قائمة الحزم حية |`
- `13: | `GET /labs/bookings/mine` | 401 | مسار مملوك للمريض ومحمي |`
- `14: | `GET /radiology/services` | 200 | قائمة الأشعة حية |`
- `15: | `GET /radiology/modalities` | 200 | الموداليتيز حية |`
- `16: | `GET /radiology/bookings/mine` | 401 | حجز المريض محمي |`
- `17: | `GET /home-care/services` | 401 | العقد محمي؛ يحتاج Sandbox |`
- `18: | `GET /home-care/providers` | 401 | العقد محمي؛ يحتاج Sandbox |`
- `19: | `GET /home-care/bookings/my` | 401 | العقد محمي؛ يحتاج Sandbox |`
- `20: | `GET /nursing/visits` | 401 | العقد محمي؛ يحتاج Sandbox |`
- `21: | `GET /orders/mine` | 401 | ملكية المريض مطلوبة |`
- `22: | `GET /orders/{id}` | 401 | ملكية المريض مطلوبة |`
### auth_ownership
- `45: تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/trackin`
- `47: كل واحدة ستبدأ بضربة حية method/path دون جلسة. إذا أعادت 401/403 نتحقق بعدها بحساب Sandbox؛ إذا أعادت 404 فلا ننشئ route حتى يثبت backend contract مختلف. بعد التنفيذ تُضاف اختبارات owner/stranger/unauth وreplay حيث ينطبق، ثم visual/UX state`
- `61: تم intentionally عدم تنفيذ `POST /users/me/wishlist/{id}` لإزالة العنصر أو cart add من Wishlist، لأنهما mutation contracts منفصلة ولم تُغلق بضربة method/path وownership/replay. تبقيهما المصفوفة `Partial/Deferred` بدلاً من اختلاق نجاح.`
- `78: الدليل الخام في `phase4-mutation-method-probe.tsv`. وجود route محمي لا يكفي لتفعيله: يلزم payload contract موثق، server-authoritative totals، ownership، Idempotency-Key، replay behavior، وSandbox owner/stranger/unauth. لذلك تبقى هذه mutatio`
### state_transitions
- `9: | Endpoint | Status | القراءة الصحيحة |`
- `41: هذا ليس mock data؛ بل فرق معماري بين local state في Mobile وسلة server-authoritative في Web. لا تُعرض أسعار أو نجاح شراء مصطنعة.`
- `45: تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/trackin`
- `47: كل واحدة ستبدأ بضربة حية method/path دون جلسة. إذا أعادت 401/403 نتحقق بعدها بحساب Sandbox؛ إذا أعادت 404 فلا ننشئ route حتى يثبت backend contract مختلف. بعد التنفيذ تُضاف اختبارات owner/stranger/unauth وreplay حيث ينطبق، ثم visual/UX state`
- `57: تم تنفيذ شريحة `GET /users/me/wishlist` للويب كصفحة `/{locale}/wishlist`، مع server wrapper وparser محدود وallowlist GET مملوكة للمريض وترجمات اللغات الست. الصفحة تعرض البيانات الحية فقط، وتتعامل مع 401/403/404/error/empty، وتوفر رابط تفاصي`
- `68: | Method | Path | Status |`
### payment_insurance_relevance
- `45: تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/trackin`
- `78: الدليل الخام في `phase4-mutation-method-probe.tsv`. وجود route محمي لا يكفي لتفعيله: يلزم payload contract موثق، server-authoritative totals، ownership، Idempotency-Key، replay behavior، وSandbox owner/stranger/unauth. لذلك تبقى هذه mutatio`
### error_empty_loading_retry_cancel
- `45: تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/trackin`
- `57: تم تنفيذ شريحة `GET /users/me/wishlist` للويب كصفحة `/{locale}/wishlist`، مع server wrapper وparser محدود وallowlist GET مملوكة للمريض وترجمات اللغات الست. الصفحة تعرض البيانات الحية فقط، وتتعامل مع 401/403/404/error/empty، وتوفر رابط تفاصي`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
