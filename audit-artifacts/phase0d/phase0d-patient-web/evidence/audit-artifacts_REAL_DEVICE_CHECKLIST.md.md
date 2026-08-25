# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/REAL_DEVICE_CHECKLIST.md`
- **Member SHA-256:** `e7973dabf5a2a539df38852bd591d2f99ddca55558dfee3ca8ff755b1ddd71af`
- **Line count:** 85
- **Read range:** `1-85`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: 3. على هاتف المريض تحقق من ظهور واجهة المكالمة الواردة عندما يكون التطبيق مغلقاً: CallKit/CallKeep في iOS أو full-screen intent في Android حسب المنصة.`
- `32: 6. سجّل أي اختلاف بين Android وiOS، وأرفق screenshot أو video قصيراً لكل حالة.`
- `55: 7. التقط screenshot للخريطة والرسائل، ولا تحفظ إحداثيات حقيقية خارج سجل الاختبار الآمن.`
- `66: 6. لكل عيب، التقط screenshot مع رقم السيناريو والجهاز واللغة، ولا تعتبر النص المختصر أو الترجمة الآلية دليلاً على اعتماد ترجمة بشرية.`
- `79: | الدليل | اسم screenshot/video/log |`
- `85: لا تغلق أي بند بالقول «يعمل» من دون screenshot أو video أو log. إذا ظهر عيب مصدرّي، أوقف اختبار السيناريو، أضف العيب إلى سجل المصالحة، طبّق دورة inspect ثم implement ثم build ثم test ثم commit ثم push، وبعدها أعد اختبار السيناريو نفسه بحساب`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: > هذه القائمة مخصصة للمالك أو المختبر غير التقني. استخدم هاتفين حقيقيين فقط: هاتف للمريض وهاتف للمزوّد. استخدم حسابات sandbox فقط، واستعمل بيانات الاعتماد التي يزوّدك بها المالك خارج المستودع. لا تكتب أي كلمة مرور أو token في هذا الملف أو ا`
- `45: **معيار النجاح:** اتصال ثنائي حقيقي، صلاحيات صحيحة، reconnect مفهوم، وإنهاء نظيف. **معيار الفشل:** اتصال أحادي الاتجاه، تسريب جلسة، استمرار الصوت/الفيديو، أو فقدان ownership.`
- `57: **معيار النجاح:** طلب إذن واضح، تحديث منطقي، ownership صحيح، وإيقاف التتبع عند انتهاء الخدمة. **معيار الفشل:** تتبع بلا إذن، عرض موقع شخص آخر، استمرار التتبع بعد الإنهاء، أو crash عند فقد GPS.`
### state_transitions
- `85: لا تغلق أي بند بالقول «يعمل» من دون screenshot أو video أو log. إذا ظهر عيب مصدرّي، أوقف اختبار السيناريو، أضف العيب إلى سجل المصالحة، طبّق دورة inspect ثم implement ثم build ثم test ثم commit ثم push، وبعدها أعد اختبار السيناريو نفسه بحساب`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `85: لا تغلق أي بند بالقول «يعمل» من دون screenshot أو video أو log. إذا ظهر عيب مصدرّي، أوقف اختبار السيناريو، أضف العيب إلى سجل المصالحة، طبّق دورة inspect ثم implement ثم build ثم test ثم commit ثم push، وبعدها أعد اختبار السيناريو نفسه بحساب`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
