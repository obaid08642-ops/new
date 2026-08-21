# Nabd Plus Web — الجرد الكامل للفجوات وخطة الوصول إلى Production

## 1. الحكم النهائي

الحالة الحالية ليست Production مكتملًا بنسبة 100%. الفرع يحتوي على Web application حقيقي ومختبر لجزء كبير من الرحلات **read-only** التي أمكن إثبات عقودها، لكنه لا يحتوي بعد على كل شاشات Mobile ولا كل الأزرار والـscenarios ولا العمليات transactional. لم يتم نشره على Server عام، ولم تُجرَ بعد اختبارات قبول كاملة ضد Backend Production الحقيقي.

الجرد الخام يحتوي على **250 ملف شاشة/route في Mobile** و**27 ملف route في Web**، منها صفحات المستخدم وصفحات API والبنية المساعدة. لذلك فإن المقارنة الحالية هي parity جزئية موثقة، وليست إعادة بناء كاملة لكل سطح Mobile.

## 2. المشاكل التي وجدناها في Mobile

### 2.1 مشاكل بيانات وهمية أو hardcoded مؤكدة

وجدت مراجعة الكود دليلين صريحين على مشاكل hardcoded تاريخية، لكنهما موصوفان داخل Mobile نفسه على أنهما عولجا:

| المشكلة | الدليل والحالة |
|---|---|
| Reports كان يعرض array ثابتة فيها مختبرات وتواريخ وعدد abnormal counts مصطنعة، وكان يمرر `reportId` لا تقرؤه شاشة التفاصيل | تعليق `reports/hub.tsx` يذكر أن النسخة السابقة كانت hardcoded/fabricated، وأنها استبدلت بـ`/medical-reports/mine?limit=100` مع حالات loading/error وparams صحيحة. **المشكلة التاريخية عولجت في Mobile، لكن Web reports لم يُبنَ بعد.** |
| Profile كان يعرض loyalty badge ثابتًا بقيمة `1,250` | تعليق `profile/index.tsx` يذكر أن القيمة hardcoded وتم استبدالها بطلب `/loyalty/account`. **المشكلة التاريخية عولجت في Mobile، لكن Web loyalty غير موجود.** |
| مسار Diagnostics القديم `diagnostics/upload-rx.tsx` كان placeholder باسم Upload | الملف الحالي يوجه إلى `/pharmacy/scan-prescription`. **تم تحويله إلى redirect، لكنه ليس شاشة مستقلة ولا يثبت وجود Web upload contract.** |
| مسار `consultations/video/[id].tsx` كان placeholder باسم `VideoCall - s64` | الملف الحالي يوجه إلى LiveKit route الحقيقي `/consultations/video-call`. **تم تحويله إلى redirect، لكن Web video consultation غير مبني.** |

لم أجد دليلًا صالحًا يثبت أن كل بيانات Mobile الحالية وهمية. القوائم الثابتة الخاصة بأيام الأسبوع، labels، rating tags، specialty options، وألوان الواجهة ليست patient data، ولذلك لا يصح وصفها بأنها fake patient data. أما أي feature transactional لم يتم إثبات Backend الخاص به فتم التعامل معه كـunverified، وليس كبيانات وهمية.

### 2.2 مشاكل منطقية ومخاطر يجب إغلاقها

توجد في Mobile رحلات تعتمد على polling/timers، مثل booking pending وinsurance approval وincoming call. هذا ليس دليلًا وحده على وجود bug، لكنه يحتاج اختبار cleanup عند unmount، timeout، retry، duplicate submission، app background، وانقطاع الشبكة. لم يتم اعتماد هذه الرحلات في Web لأنها تحتاج عقود events أو polling واضحة وidempotency.

توجد كذلك fallback labels مثل `مريض نبض` عندما لا يأتي اسم المستخدم، وحالات empty مثل لا توجد نتائج أو لا توجد أدوية. هذه ليست سجلات مريض وهمية، لكنها تحتاج مراجعة UX حتى لا يختلط fallback label مع بيانات حقيقية.

### 2.3 حدود مراجعة Mobile

تمت قراءة inventory والكود ومسارات عديدة، لكن لم يتم تشغيل كل 250 شاشة على أجهزة فعلية مع كل صلاحية وحالة شبكة وحساب. لذلك لا يجوز ادعاء أن كل bug runtime في Mobile اكتُشف. ما تم توثيقه هنا هو **code-level audit** لما ظهر في المصدر، مع فصل المؤكد عن الاحتمال الذي يحتاج runtime/UAT.

## 3. الشاشات والمسارات غير المبنية في Web

### 3.1 المصادقة وOnboarding

Web لديه login، لكنه لا يطابق كامل Mobile auth/onboarding. الناقص يشمل welcome، register، forgot-password، OTP، reset-password، provider-info، privacy، terms، onboarding language، onboarding permissions، وتدفقات التحقق الإضافي.

المطلوب هو Auth contract كامل يحدد registration DTO، OTP issuance/verification/resend/expiry، reset tokens، consent records، provider selection، session refresh، lockout/rate limit، وحالات 401/403/429.

### 3.2 Consultations وAppointments

Web لديه قائمة المواعيد وتفاصيل read-only. الناقص من Mobile يشمل doctor search، specialty select، doctor profile، clinic profile/location، offer detail، booking form، booking confirmation، booking pending، booking success، cancel/reschedule، follow-up، waiting room، virtual waiting room، incoming call، video call، chat with doctor، call history، post-call rating، prescription from doctor، share report، وhome-visit tracking.

هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.

### 3.3 Health

Web لديه health summary محدود وreminders وprescriptions. الناقص يشمل medications detail، add/edit profile، chronic disease، chronic medications، conditions/allergies، health ID، emergency contacts، family health، reports، trends، sleep score، sleep tracker، smart reminders، vitals، vitals log، wearables، actionable order، medication reminder add/list، refills، وhealth score أو interpretation.

لا يجوز إضافة health score أو clinical recommendation من دون DTO وقواعد تفسير وموافقة واضحة. المطلوب هو health contract pack للتاريخ، المصدر، timestamps، units، abnormal flags، device linkage، وتحديد ما هو informational وما قد يعد clinical advice.

### 3.4 Pharmacy وMedicines

Web لديه public/private read-only catalog وmedicine detail. الناقص من Mobile يشمل product search/filters/compare/detail، barcode scanner، drug-not-found، custom item، manual order، cart، wishlist، checkout، address select، coupon، payment، order confirmation، waiting-for-pharmacy، broadcast status، order history، order tracking، reorder، RX order، scan prescription، pharmacist chat، chat with pharmacist، وcustom suggestion.

المطلوب: catalog/availability/pricing APIs، cart lifecycle، order lifecycle، upload/OCR، protected media، pharmacy ownership، payment provider، webhook verification، coupon rules، delivery/address contract، chat contract، وaudit trail. لا يجب تنفيذ أي checkout شكلي.

### 3.5 Diagnostics

Web لديه قائمة حجوزات وتفاصيل booking read-only. الناقص يشمل search، packages، package detail، lab comparison، lab detail، test detail، book sample، cart، checkout، booking confirm/success، insurance approval/upload، orders، order detail، sample tracking، technician tracking، my results، results history، reports، وupload prescription.

المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.

### 3.6 Family

Web يعرض قائمة read-only محدودة. الناقص يشمل family hub الكامل، invite، join، scan/code، permissions، permission request، member health، emergency contacts، family chat، calendar، shared calendar، add family member، وربط المواعيد والتنبيهات.

المطلوب هو membership authorization وinvitation lifecycle وrole/permission matrix وhealth-data consent وcalendar/chat contracts وaudit logs.

### 3.7 Insurance

Mobile يحتوي hub وpolicy detail وadd policy وcoverage check وnetwork providers وbenefits summary وcopay وpayment split وsubmit claim وclaim tracking وapproval pending وrefund status. لا توجد هذه الرحلة كـWeb production surface.

المطلوب هو policy/coverage/claim/payment/refund contracts، protected documents، provider network source، policy ownership، وقيود البيانات المالية والتأمينية.

### 3.8 Mental Health وAI

Mobile يحتوي breathing، meditation، mood journal، self-assessment، therapist match، crisis support، AI assistant، chat doctor، monthly report، prescription translator، skin analysis، symptom checker، symptom timeline، وtriage. لا توجد هذه الأسطح في Web.

المطلوب هنا أكثر حساسية: AI provider contract، data retention، consent، medical disclaimer، escalation/crisis policy، prompt/data isolation، model output schema، auditability، وعدم تقديم diagnosis أو emergency advice غير معتمد.

### 3.9 Nutrition وMaternity وWearables وEmergency

الناقص يشمل nutrition hub، body composition، body target، calorie analyzer، food scanner، daily tracker، log meal، exercise plan، nutrition plan، AI plan builder، water tracker؛ ويشمل maternity hub/setup/pregnancy tracker/baby growth/baby development/ovulation tracker؛ ويشمل wearables hub، emergency/SOS/tracking، map/location، وvoice.

هذه الرحلات تحتاج health data contracts، device permissions، location consent، background processing، emergency escalation، وواجهات تكامل خارجية قبل بناء Web.

### 3.10 Orders وPayments وWallet وLoyalty وReturns

Web يعرض orders read-only محدودًا. الناقص من Mobile يشمل order history/detail/tracking/cancel/refund، payment success/failed/processing/failure، wallet hub/cards/topup/transactions/transfer، loyalty hub/challenges/leaderboard/referrals/rewards، offers، returns hub/detail/new request، reviews، support tickets، وsupport chat.

المطلوب هو payment and wallet contracts، PCI boundary، webhook/idempotency، refund/return state machine، loyalty balance/event contract، offers validity، support ownership، وaudit logs.

### 3.11 Content وSettings وCommunity

الناقص يشمل articles list/detail/bookmarks، community hub/post detail، global search، services index، settings about/data/feedback/help/language/privacy/security/notifications/support chat/terms، notification actions، وaccount data export/deletion.

هذه تحتاج content API، moderation/permissions، search indexing، privacy/legal consent، data export/deletion contract، وsupport SLA.

## 4. ما تم اختباره وما لم يتم اختباره

تم اختبار parser وserver boundary وSSR لعدد من الرحلات read-only، إضافة إلى full Vitest: 57 test files passed و14 skipped، و99 tests passed و23 skipped. كما نجح TypeScript، production build، truthful gate على 177 production files، وgit diff check.

لكن الاختبارات التالية لم تُغلق بعد:

| المجال | ما لم يُختبر بالكامل |
|---|---|
| Backend integration | اتصال كل الرحلات بالـBackend الحقيقي في Staging/Production، وليس mocks الخاصة باختبارات unit/server boundary. |
| Auth runtime | login الحقيقي، OTP، refresh، expiry، logout من أجهزة متعددة، lockout، cookie domain وSameSite وSecure. |
| E2E | السيناريوهات الكاملة عبر browser على desktop/mobile، وكل حالات empty/loading/error/401/403/404/429/5xx. |
| Responsive/RTL | كل الصفحات على أحجام iPhone/Android/tablet/desktop، وكل اللغات، مع visual regression snapshots. |
| Accessibility | keyboard navigation، screen reader، focus order، contrast، reduced motion، form errors، وsemantic landmarks على كل route. |
| Performance | Web Vitals، caching، streaming، slow 3G، image policy، bundle size، memory، وserver concurrency. |
| Security operations | CSP، HSTS، CSRF، rate limiting، secret rotation، logging redaction، dependency audit، penetration test، وincident response. |
| Transactional flows | لا توجد اختبارات لهذه الوظائف لأنها غير منفذة عمدًا قبل استلام العقود. |
| Deployment | لم يتم نشر build على Server عام، ولم يتم اختبار rollback/health check/monitoring/CD. |

## 5. ما نحتاجه الآن من Backend ومنك

نحتاج API contract pack مكتوبًا لكل مجموعة: endpoint وmethod وauth requirement وrequest/response DTO وerror schema وownership rule وpagination/filtering وidempotency وrate limits وaudit requirements وprotected media policy. يجب أن يكون لكل mutation مثال نجاح وفشل، وأن يحدد الـBackend هل العملية مسموحة للمريض نفسه فقط أم لأفراد العائلة أو الطبيب أو الصيدلية.

نحتاج كذلك بيئة Staging حقيقية ببيانات Sandbox غير حساسة، base URL، حسابات اختبار بأدوار مختلفة، secrets تُحقن في server فقط، سياسة domain/cookies، وموعد واضح لتجميد DTOs. لا نحتاج منك إرسال tokens داخل المحادثة؛ المطلوب هو العقد والبيئة الآمنة أو ربطها بالطريقة المعتمدة.

نحتاج قرارات منتج مكتوبة للوظائف الحساسة: هل Web سيقدم كل capabilities الموجودة في Mobile أم سيقدم subset؟ هل الدفع سيتم عبر provider محدد؟ هل الفيديو LiveKit أم مزود آخر؟ ما سياسة الصور والملفات؟ ما قواعد الطوارئ وMental Health؟ وما هي اللغات والأجهزة المدعومة رسميًا؟

## 6. متطلبات Design وUI/UX وAnimation

الأساس Premium موجود، لكن parity البصري الكامل يحتاج design source of truth: Figma أو design tokens النهائية، typography/fonts، icon set المرخص، logo/brand assets، spacing/radius/shadow/elevation، states لكل component، وmotion guidelines.

سنحتاج بعد ذلك إلى تحويل كل route إلى component inventory موحد، ثم إضافة loading skeletons، empty/error/forbidden states، focus/hover/pressed states، route transitions، staggered card entrance، subtle sheet/modal transitions، reduced-motion fallback، وRTL-safe animation. يجب أن تكون الحركة وظيفية ولا تخفي تغيّرًا في الحالة أو نجاحًا وهميًا.

## 7. خطة البناء الكاملة للوصول إلى Production

### المرحلة A — Contract Freeze وMobile Audit

نثبت inventory النهائي، نضع matrix لكل شاشة وزر وroute وscenario، نصنف كل عنصر إلى implemented أو blocked أو removed أو needs API، ونراجع المشاكل التاريخية في Mobile مع صاحب المنتج. لا يبدأ أي transactional implementation قبل توقيع العقود.

### المرحلة B — Backend Contract Integration

ننفذ auth/session أولًا، ثم catalog/search، ثم appointments/diagnostics/home-care، ثم pharmacy/orders/payments، ثم health/family/insurance، ثم chat/realtime/AI. كل مرحلة تشمل parser allowlist، server boundary، authorization tests، error states، وaudit artifact.

### المرحلة C — Web Feature Parity

نبني المسارات الناقصة حسب الأولوية: auth/onboarding، consultations booking، diagnostics checkout/results، pharmacy cart/checkout، family permissions، insurance، health detail/reminders، chat/video، payments/wallet، ثم content/AI/nutrition/maternity/emergency. كل route يجب أن يملك loading/empty/error/forbidden/success/failure states حقيقية.

### المرحلة D — Premium Visual Parity

نثبت tokens والـcomponent library، ثم نطابق كل Mobile screen على responsive Web، ونضيف vector icons، micro-interactions، transitions، reduced-motion، RTL، keyboard support، وvisual regression. لا يتم اعتبار شاشة مكتملة بمجرد وجود route؛ يجب اختبار كل زر وحالة.

### المرحلة E — Security وQuality Gates

نضيف E2E على Staging، contract tests، dependency/security scan، CSP/HSTS/CSRF/rate limits، logging redaction، secret rotation، accessibility audit، performance budget، backup/rollback، وpenetration testing. أي فشل يعيد المرحلة إلى الإصلاح قبل الدمج.

### المرحلة F — Release Candidate وProduction

ننشر على Staging، نمرر UAT مع حسابات Sandbox، نراجع كل السيناريوهات، ننشئ release candidate، ثم نشر تدريجي مع health checks وmonitoring وrollback. بعد ذلك فقط يمكن القول إن النسخة المعتمدة جاهزة لاستخدام الناس، مع إبقاء أي capability غير مدعومة خارج الواجهة أو معلّمة كـunavailable بدل fake success.

## 8. تعريف Done بنسبة 100%

لن نعتبر المشروع 100% production-ready إلا إذا تحققت الشروط التالية معًا: كل Mobile screen أو تم نقلها أو صدر قرار منتج موثق باستبعادها؛ كل زر مرتبط بعقد حقيقي أو غير ظاهر؛ كل scenario له success/loading/empty/error/forbidden state؛ كل mutation لها authorization وidempotency وaudit؛ كل ملفات المريض محمية؛ لا tokens في المتصفح؛ لا fake data؛ full E2E وaccessibility وperformance وsecurity gates ناجحة؛ نشر Staging وProduction تم فعليًا مع rollback؛ وتم توقيع UAT من صاحب المنتج.

النتيجة الحالية إذن هي **مرحلة foundation + read-only parity candidate**، وليست نهاية الطريق. الخطوة الصحيحة التالية هي استلام Contract Pack وقرار الأولويات، ثم بدء المرحلة A رسميًا بدل إضافة شاشات شكلية بلا Backend.
