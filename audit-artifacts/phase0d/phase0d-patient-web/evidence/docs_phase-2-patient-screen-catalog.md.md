# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-2-patient-screen-catalog.md`
- **Member SHA-256:** `c3fa39018b1679f17f0c51090725a3254a5bdb31eee1cc3333264aaed87a6280`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: **المصدر:** جرد `rn_screens.json` وشجرة `app/` الفعلية لتطبيق React Native + Expo.`
- `5: **قاعدة النقل:** كل صف يتحول في الويب إلى route أو flow أو حالة ظاهرة فقط بعد إثبات API/التفويض/البيانات الحقيقية. لا تنقل قوائم ثابتة أو نجاحات محلية أو redirect بمعرف افتراضي.`
- `11: | المصادقة: welcome/login/register/OTP/forgot/reset | `/auth/*` ومضيف جلسة المريض | مطلوب |`
- `21: | الصيدلية والطلبات | `pharmacy/cart`، `product-detail`، `rx-order`، `order-confirm`، `order-history`، `tracking`، `reorder`، barcode/scanner/compare/wishlist | كتالوج وتفاصيل وبحث وفلاتر وسلة وcheckout ووصفة وطلب وتتبع؛ camera-only feature`
- `22: | الاستشارات والحجوزات | directory، doctor-profile، doctor-search، specialty، booking، appointment detail، cancel/reschedule، follow-up، waiting rooms، call history، chat، video | دليل مقدمين وحجز وتفاصيل وتعديل ومحادثة ومكالمات/انتظار عند `
- `23: | المختبر والأشعة | catalog، packages، test detail، cart، booking confirm، tracking، results/my-results، comparison | تصفح وحجز/عينة وتتبع ونتائج ورفع مستندات وتأمين بالاستناد إلى controllers المخبر/الأشعة. |`
- `24: | الرعاية المنزلية والتمريض | `nursing/hub`، service-detail، nurse-profile، booking-confirm، live-tracking | متاح فقط عند توثيق `home-care` وتفويض مزود/مريض؛ لا يبنى Web لمزود الخدمة. |`
- `27: | التأمين والمالية | policy، add policy، coverage، network providers، claims، payment split، approvals، refund؛ wallet/cards/transactions/transfer/topup | واجهة تأمين ومالية خاصة فقط؛ لا بيانات تغطية أو بطاقات أو حالات دفع محلية بديلة. |`
- `29: | الذكاء الاصطناعي والتقارير | triage/symptom checker/skin analysis/prescription translator/monthly report؛ reports/passport/timeline/view/analysis | routes محمية، consent واضح، حالة انتظار/فشل حقيقية، وعدم حفظ مدخلات/مخرجات حساسة في URL أو`
- `37: * الصفحات العامة المؤهلة فقط، مثل مقالات منشورة وكيانات مزودين/خدمات مسموح نشرها، تدخل طبقة discovery. كل route مريض أو صحي أو مالي أو جلسة أو نتيجة أو وثيقة خاص يظل `noindex` وخارج sitemap.`
- `41: لا يغلق إلا بعد أن يحمل كل route/family في المصفوفة: مصدر الشاهد، نوع الوصول، عقد API، حالة البيانات، حالات loading/empty/error/forbidden، معادل web، قرار SEO، حالة اختبار، ومرجع gap إن وجد.`
### backend_consumers_or_contracts
- `5: **قاعدة النقل:** كل صف يتحول في الويب إلى route أو flow أو حالة ظاهرة فقط بعد إثبات API/التفويض/البيانات الحقيقية. لا تنقل قوائم ثابتة أو نجاحات محلية أو redirect بمعرف افتراضي.`
- `11: | المصادقة: welcome/login/register/OTP/forgot/reset | `/auth/*` ومضيف جلسة المريض | مطلوب |`
### auth_ownership
- `11: | المصادقة: welcome/login/register/OTP/forgot/reset | `/auth/*` ومضيف جلسة المريض | مطلوب |`
- `26: | العائلة | hub، invite، join، members، permissions، calendar، member-health، chat، emergency contacts، voice call | تبديل أفراد وصلاحيات ودعوات وتقويم ومشاركة مقيدة؛ كل request يتحقق من RBAC وقرارات الخلفية. |`
- `31: | الإعدادات والنظام | notifications، privacy/security، sessions، language، terms/help/feedback/about/data | صفحة إعدادات متوافقة مع الويب وسجل أجهزة/جلسات، مع إصدار باطل عند فشل refresh. |`
- `36: * تعالج capabilities الجوالية، مثل camera، secure storage، push token، native maps، وbackground reminders، بمعادل ويب ذي دعم متصفح صريح أو تسجل كـ**غير قابل للتكافؤ المباشر** حتى يثبت طريق خادمي بديل.`
### state_transitions
- `22: | الاستشارات والحجوزات | directory، doctor-profile، doctor-search، specialty، booking، appointment detail، cancel/reschedule، follow-up، waiting rooms، call history، chat، video | دليل مقدمين وحجز وتفاصيل وتعديل ومحادثة ومكالمات/انتظار عند `
- `27: | التأمين والمالية | policy، add policy، coverage، network providers، claims، payment split، approvals، refund؛ wallet/cards/transactions/transfer/topup | واجهة تأمين ومالية خاصة فقط؛ لا بيانات تغطية أو بطاقات أو حالات دفع محلية بديلة. |`
- `41: لا يغلق إلا بعد أن يحمل كل route/family في المصفوفة: مصدر الشاهد، نوع الوصول، عقد API، حالة البيانات، حالات loading/empty/error/forbidden، معادل web، قرار SEO، حالة اختبار، ومرجع gap إن وجد.`
### payment_insurance_relevance
- `27: | التأمين والمالية | policy، add policy، coverage، network providers، claims، payment split، approvals، refund؛ wallet/cards/transactions/transfer/topup | واجهة تأمين ومالية خاصة فقط؛ لا بيانات تغطية أو بطاقات أو حالات دفع محلية بديلة. |`
### error_empty_loading_retry_cancel
- `22: | الاستشارات والحجوزات | directory، doctor-profile، doctor-search، specialty، booking، appointment detail، cancel/reschedule، follow-up، waiting rooms، call history، chat، video | دليل مقدمين وحجز وتفاصيل وتعديل ومحادثة ومكالمات/انتظار عند `
- `41: لا يغلق إلا بعد أن يحمل كل route/family في المصفوفة: مصدر الشاهد، نوع الوصول، عقد API، حالة البيانات، حالات loading/empty/error/forbidden، معادل web، قرار SEO، حالة اختبار، ومرجع gap إن وجد.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
