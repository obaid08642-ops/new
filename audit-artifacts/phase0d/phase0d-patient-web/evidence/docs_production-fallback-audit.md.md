# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/production-fallback-audit.md`
- **Member SHA-256:** `8c9c946b1544e9d8070ff182613433c341397bce65400988d63c84018893c230`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | logout | فشل upstream لا يمنع مسح cookies المحلية | قرار مقصود: إنهاء الجلسة محلياً ولا ادعاء نجاح تعديل بيانات خارجية |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: | جلسة الدخول | لا يوجد `localStorage` أو `sessionStorage` أو وضع ضيف | تظل الجلسة في cookies خادمية httpOnly؛ يخرج الدخول برسالة آمنة عند الفشل |`
- `13: | logout | فشل upstream لا يمنع مسح cookies المحلية | قرار مقصود: إنهاء الجلسة محلياً ولا ادعاء نجاح تعديل بيانات خارجية |`
- `14: | refresh | فشل أو نقص refresh يعيد `null` وينهي الجلسة | لا يصنع access token أو refresh token بديلاً |`
- `22: لم يُعثر على تخزين توكنات في المتصفح، أو مسار ضيف، أو قائمة أعمال تجارية ثابتة، أو نجاح محلي بديل في كود Web App الإنتاجي الذي دُقق. لا يغطي هذا الحكم عقوداً غير مبنية (رفع الملفات وSSE وLiveKit وOTP)؛ وهي تبقى محجوبة حتى تسليم backend موثق`
### state_transitions
- `10: | صفحات القراءة الخاصة | قراءة JSON الفاشلة تصبح `null` ثم تمر عبر محلل Zod مقيد | لا تُنشأ عناصر؛ يظهر empty فقط لاستجابة ناجحة فارغة، وتظهر unavailable للرفض أو فشل upstream |`
- `18: هذا النمط لا ينشئ بيانات بديلة؛ إنه يمنع خطأ parsing من الوصول إلى HTML. يمرر `null` إلى محلل الاستجابة الذي يعيد بنية مقيدة وفارغة فقط. لا يجب استخدامه مع رسالة تؤكد نجاحاً، أو لإتاحة إجراء تغيير حالة. تظل استجابة HTTP وقرار الصفحة هما الف`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `10: | صفحات القراءة الخاصة | قراءة JSON الفاشلة تصبح `null` ثم تمر عبر محلل Zod مقيد | لا تُنشأ عناصر؛ يظهر empty فقط لاستجابة ناجحة فارغة، وتظهر unavailable للرفض أو فشل upstream |`
- `16: ## توضيح استعمال `json().catch(() => null)``
- `18: هذا النمط لا ينشئ بيانات بديلة؛ إنه يمنع خطأ parsing من الوصول إلى HTML. يمرر `null` إلى محلل الاستجابة الذي يعيد بنية مقيدة وفارغة فقط. لا يجب استخدامه مع رسالة تؤكد نجاحاً، أو لإتاحة إجراء تغيير حالة. تظل استجابة HTTP وقرار الصفحة هما الف`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
