# كتالوج شاشات المريض المصدرّي — مدخل لمصفوفة التكافؤ

**المصدر:** جرد `rn_screens.json` وشجرة `app/` الفعلية لتطبيق React Native + Expo.  
**الحالة:** جرد نطاق؛ لا يعني أن كل شاشة ستبنى قبل التحقق من عقدها وحالتها الإنتاجية.  
**قاعدة النقل:** كل صف يتحول في الويب إلى route أو flow أو حالة ظاهرة فقط بعد إثبات API/التفويض/البيانات الحقيقية. لا تنقل قوائم ثابتة أو نجاحات محلية أو redirect بمعرف افتراضي.

## نقاط دخول التطبيق

| نقطة الدخول | ما يمثله في الويب | حالة النطاق |
|---|---|---|
| المصادقة: welcome/login/register/OTP/forgot/reset | `/auth/*` ومضيف جلسة المريض | مطلوب |
| onboarding: اللغة/الأذونات | onboarding متصفح مناسب؛ لا تطلب أذونات الهاتف غير المتاحة | مطلوب بعد توثيق الحقول |
| تبويبات: المنزل/الاستشارات/الصيدلية/التشخيص/الخدمات/الصحة | shell خاص بالمريض مع تنقل واسع ومناسب للويب | مطلوب |
| ملف المريض والإعدادات | مسارات محمية لحساب المريض وبياناته | مطلوب |
| بحث وخرائط وإشعارات | ميزات متقاطعة داخل shell | مطلوب وفق العقد والمفاتيح |

## مجموعات الميزة المفحوصة

| المجال | أمثلة المسارات المصدرية | معادل الويب/قرار التكافؤ |
|---|---|---|
| الصيدلية والطلبات | `pharmacy/cart`، `product-detail`، `rx-order`، `order-confirm`، `order-history`، `tracking`، `reorder`، barcode/scanner/compare/wishlist | كتالوج وتفاصيل وبحث وفلاتر وسلة وcheckout ووصفة وطلب وتتبع؛ camera-only features تعالج بتحميل/إدخال مناسبين للمتصفح عند دعم الخلفية. |
| الاستشارات والحجوزات | directory، doctor-profile، doctor-search، specialty، booking، appointment detail، cancel/reschedule، follow-up، waiting rooms، call history، chat، video | دليل مقدمين وحجز وتفاصيل وتعديل ومحادثة ومكالمات/انتظار عند تحقق بنية real-time؛ لا live doctor افتراضي. |
| المختبر والأشعة | catalog، packages، test detail، cart، booking confirm، tracking، results/my-results، comparison | تصفح وحجز/عينة وتتبع ونتائج ورفع مستندات وتأمين بالاستناد إلى controllers المخبر/الأشعة. |
| الرعاية المنزلية والتمريض | `nursing/hub`، service-detail، nurse-profile، booking-confirm، live-tracking | متاح فقط عند توثيق `home-care` وتفويض مزود/مريض؛ لا يبنى Web لمزود الخدمة. |
| الصحة والملف الطبي | vitals، sleep، trends، chronic disease/meds، conditions/allergies، medications، reminders/refills، emergency contacts، health ID | dashboard طبي خاص + عمليات PATCH/POST/DELETE حقيقية للـmedical profile وhealth، مع عدم فهرسة كامل. |
| العائلة | hub، invite، join، members، permissions، calendar، member-health، chat، emergency contacts، voice call | تبديل أفراد وصلاحيات ودعوات وتقويم ومشاركة مقيدة؛ كل request يتحقق من RBAC وقرارات الخلفية. |
| التأمين والمالية | policy، add policy، coverage، network providers، claims، payment split، approvals، refund؛ wallet/cards/transactions/transfer/topup | واجهة تأمين ومالية خاصة فقط؛ لا بيانات تغطية أو بطاقات أو حالات دفع محلية بديلة. |
| الصحة السلوكية والتغذية والأمومة | mood/crisis/assessment/therapy/meditation، nutrition planner/tracker/water/meals، maternity/pregnancy/ovulation/baby development | يبنى فقط بحدود واضحة للمعلومات الصحية والحالات الحساسة ووفق API الموجودة؛ لا محتوى علاجي مولد أو توصية طبية غير موثقة. |
| الذكاء الاصطناعي والتقارير | triage/symptom checker/skin analysis/prescription translator/monthly report؛ reports/passport/timeline/view/analysis | routes محمية، consent واضح، حالة انتظار/فشل حقيقية، وعدم حفظ مدخلات/مخرجات حساسة في URL أو metadata. |
| الدعم والمجتمع والولاء | support ticket/chat، community، reviews، referrals، loyalty/rewards/challenges | يربط بالـAPI فقط؛ أي rating/review يأتي من backend ولا يولّد كبيانات عرض. |
| الإعدادات والنظام | notifications، privacy/security، sessions، language، terms/help/feedback/about/data | صفحة إعدادات متوافقة مع الويب وسجل أجهزة/جلسات، مع إصدار باطل عند فشل refresh. |

## ملاحظات تدقيق لا تعني التنفيذ التلقائي

* ظهرت ملفات قصيرة جداً في manifest مثل aliases أو placeholders أو wrappers. لا تصنف كميزة مكتملة بسبب وجود المسار فقط؛ يفحص محتواها وسلوك التنقل قبل إدراجها في حالة **Built**.
* تعالج capabilities الجوالية، مثل camera، secure storage، push token، native maps، وbackground reminders، بمعادل ويب ذي دعم متصفح صريح أو تسجل كـ**غير قابل للتكافؤ المباشر** حتى يثبت طريق خادمي بديل.
* الصفحات العامة المؤهلة فقط، مثل مقالات منشورة وكيانات مزودين/خدمات مسموح نشرها، تدخل طبقة discovery. كل route مريض أو صحي أو مالي أو جلسة أو نتيجة أو وثيقة خاص يظل `noindex` وخارج sitemap.

## معيار الإغلاق لهذا الكتالوج

لا يغلق إلا بعد أن يحمل كل route/family في المصفوفة: مصدر الشاهد، نوع الوصول، عقد API، حالة البيانات، حالات loading/empty/error/forbidden، معادل web، قرار SEO، حالة اختبار، ومرجع gap إن وجد.
