# تحليل الفجوات الشامل بين تطبيق Mobile وموقع Web

## 1. الحكم التنفيذي

أُعيد الجرد من المصدرين الفعليين: مصدر تطبيق Mobile الموجود في `/home/ubuntu/nabdah_review/extracted/mobile`، ومصدر Web الموجود في `/home/ubuntu/nabdah_impl/repo` على الفرع `agent/web-complete-v2-20260822`. النتيجة الحالية لا تسمح بإعلان **100% parity** أو جاهزية إنتاج كاملة؛ الحكم الصحيح هو **NO-GO للمنتج الكامل** مع وجود سطوح منفذة ومختبرة يمكن اعتبارها GO مشروطاً داخل نطاقها فقط.

السبب ليس عدد الصفحات وحده. التكافؤ الحقيقي يتطلب أن يكون لكل شاشة وزر وانتقال: عقد backend حي، method/path صحيحان، parser محدود، server-only authentication، ownership isolation، حالات loading/empty/error/retry، واختبار رحلة كامل حتى التأكيد أو الإلغاء أو الاسترجاع. وجود ملف أو route بالاسم نفسه لا يثبت أياً من ذلك.

## 2. أرقام الجرد القابلة لإعادة الإنتاج

| المؤشر | النتيجة الدقيقة |
|---|---:|
| ملفات مصدر Mobile التي تم فحصها | 250 |
| ملفات Mobile تحتوي مؤشرات actions | 200 |
| ملفات Mobile تحتوي مؤشرات non-GET mutation | 88 |
| صفوف navigation/screen-registration الخام | 232 |
| صفوف button/form/dialog/external-action الخام | 1,069 |
| صفوف inventory الأفعال والمسارات Mobile إجمالاً | 1,638 |
| مراجع API الخام التي التقطتها أداة الجرد | 38 |
| ملفات مصدر Web المفحوصة في app/components/lib | 298 |
| Web page routes | 56 |
| Web API route handlers | 15 |
| صفوف Web API usage | 486 |
| رحلات atomic في السجل المعتمد | 72 |
| رحلات لها أي مرجع كود Web قابل للمطابقة النصية | 31 |
| رحلات لا يظهر لها مرجع كود Web مطابق | 41 |
| رحلات mutation | 49 |
| رحلات mutation لها مرجع Web نصي فقط | 25 |

هذه الأرقام لا تساوي نسبة اكتمال. هي قياس اتساع المصدر ونقاط العمل. المصفوفة المحافظة صنفت 222 ملف Mobile كـ`MISSING_WEB_SURFACE` بالاعتماد على عدم وجود مرشح اسم Web، و8 كـ`PARTIAL_MUTATION_CONTRACT_REQUIRED`، و15 كـ`PARTIAL_ACTION_PROOF_REQUIRED`، و5 كـ`READ_CANDIDATE_CONTRACT_PROOF_REQUIRED`. المطابقة الاسمية وحدها لا تكفي، ولذلك لا ينبغي قراءة هذه التصنيفات كحكم نهائي دون capability mapping.

## 3. التوزيع حسب المجال

| المجال | ملفات Mobile | ملفات بها actions | ملفات بها mutations | مرشحو Web بالاسم | ملفات بلا مرشح Web | الرحلات | الرحلات المحجوبة/المؤجلة |
|---|---:|---:|---:|---:|---:|---:|---:|
| consultations | 28 | 25 | 7 | 1 | 27 | 8 | 8 |
| pharmacy | 22 | 21 | 12 | 3 | 19 | 11 | 11 |
| diagnostics | 20 | 15 | 3 | 4 | 16 | 0 | 0 |
| health | 26 | 20 | 10 | 7 | 19 | 10 | 0 |
| family | 12 | 10 | 6 | 2 | 10 | 7 | 7 |
| insurance | 13 | 12 | 5 | 0 | 13 | 2 | 2 |
| nutrition | 13 | 4 | 3 | 0 | 13 | 0 | 0 |
| settings | 12 | 10 | 4 | 1 | 11 | 3 | 0 |
| mental-health | 8 | 3 | 2 | 2 | 6 | 4 | 0 |
| maternity | 7 | 2 | 1 | 0 | 7 | 0 | 0 |
| ai | 8 | 5 | 3 | 0 | 8 | 0 | 0 |
| community | 2 | 2 | 2 | 0 | 2 | 1 | 0 |
| loyalty | 5 | 5 | 4 | 0 | 5 | 0 | 0 |
| wallet | 5 | 5 | 4 | 0 | 5 | 2 | 2 |
| reports | 5 | 4 | 0 | 0 | 5 | 1 | 0 |
| returns | 3 | 3 | 1 | 0 | 3 | 0 | 0 |
| nursing | 4 | 4 | 1 | 0 | 4 | 0 | 0 |
| profile | 4 | 3 | 2 | 1 | 3 | 0 | 0 |
| emergency | 4 | 3 | 2 | 1 | 3 | 0 | 0 |
| auth/onboarding/tabs | 22 | 19 | 6 | 4 | 18 | 16 | 1 |

المصفوفة الكاملة لكل المجالات الثلاثة والأربعين موجودة في `domain_gap_summary.tsv`، وكل ملف Mobile موجود في `mobile_web_screen_gap_matrix.tsv`.

## 4. الفجوات الوظيفية الدقيقة

### 4.1 الهوية والدخول وOnboarding

Mobile يحتوي welcome، login، register، OTP، forgot-password، reset-password، privacy، terms، provider-info، onboarding language وpermissions وguest flow. Web يحتوي login وOTP bridge المعتمدين، لكن لا يوجد دليل parity كامل لكل social-login، guest session، register، reset-password، permissions، onboarding persistence، ولا اختبارات حية كاملة لكل حالات rate limit وreplay وexpired OTP. لذلك Auth الأساسي منفذ، بينما parity الكامل لسطح الهوية وOnboarding ما زال جزئياً.

### 4.2 الاستشارات والحجز

Mobile يغطي provider discovery، specialties، doctor profile، slots، appointment type، confirmation، payment، appointment detail، reschedule، cancel، call/video room، waiting/queue وتجارب بعد الموعد. Web يملك doctor search/detail/slots، create booking BFF، cancel، reschedule PATCH، payment intent وcall-token. الفجوات المتبقية هي إثبات الرحلة الحية الكاملة من slot إلى إنشاء الحجز ثم الدفع ثم confirmation، واختبارات owner/stranger/unauth وidempotency/replay، وcall room الفعلي، وحالات expired lock وpayment failure وretry وcleanup. لا تكفي اختبارات BFF المحلية لإثبات ذلك.

### 4.3 Diagnostics: Labs وRadiology

Web يملك قوائم وخدمات وحزم التحاليل، وقائمة Radiology وتفاصيلها بالـ`_id` و`short_code` بعد الإصلاح. تم تنفيذ Radiology Detail مع parser محدود، حالات 404/error وترجمات ست لغات، ولا يوجد زر حجز وهمي. Mobile يضيف حزمة التحاليل إلى `DiagnosticsCartContext` المحلي، بينما Web يستخدم سلة backend؛ لذلك add-to-diagnostics-cart، booking sample، upload، insurance approval، result/history، report access، tracking وcheckout ليست parity مكتملة حتى يثبت contract صريح لهذه العمليات.

### 4.4 Home-care وNursing

تم تصحيح القائمة إلى `GET /unified-bookings/mine`، مع عدم اعتبار أول مورد في القائمة حجز Home-care لأن unified list تجمع consultation/lab/pharmacy أيضاً. اختبار Sandbox للقائمة المصححة نجح. ما زالت تفاصيل Home-care، provider selection، nursing visits، address/consent، booking، tracking، cancel/reschedule، visit report، GPS وbroadcast bids تحتاج capability mapping وعقود وfixtures مناسبة. لا يوجد fixture Home-care مناسب في الحساب الحالي لإثبات detail owner/stranger بصورة كاملة.

### 4.5 Pharmacy وOrders

Web يملك medicine catalog، medicine detail، cart، checkout، orders، tracking وwishlist read. Mobile يحتوي product search/detail، filters، compare، custom item، drug-not-found، manual order، scan prescription، prescription/OCR، pharmacist chat، waiting-for-pharmacy، payment، order confirmation، history، reorder، tracking وreturns. Wishlist read أُغلقت، لكن remove wishlist، cart lines mutations، server-authoritative totals، checkout، prescription upload/OCR، order approval/rejection، partial reorder، returns، pharmacist chat وreplay ما زالت تحتاج عقود payload وownership وIdempotency-Key واختبارات Sandbox. لا يجوز اعتبار وجود POST/DELETE محمي بـ401 دليلاً على أن الرحلة جاهزة.

### 4.6 Profile وFamily وInsurance

Mobile يحتوي profile index/edit/addresses/insurance، family list/add/edit/details/permissions، insurance hub/add-policy/claims/OCR. Web لديه Profile وبعض Insurance reads، لكن لا يوجد إغلاق كامل لعناوين المريض، تعديل الملف، إدارة العائلة وصلاحياتها، insurance OCR/claims/approval/upload، owner isolation و404 للغريب، أو مسارات save/error/retry.

### 4.7 Health وReports وMental Health وNutrition

Web يحتوي health reads متعددة، vitals/reminders وبعض mental-health surfaces. Mobile يحتوي chronic diseases/medications، sleep، trends، score، reports/passport/timeline/view/AI-analysis، nutrition hub/log-meal/plan، وwearables. الفجوات الرئيسية هي writes والملكية وتاريخ القياسات، report downloads، AI analysis، nutrition logging، plans، wearable sync وoffline reconciliation. لا يجوز استخدام نصوص static أو score محسوب محلياً كبديل عن contract حقيقي.

### 4.8 AI وCommunity وLoyalty وWallet وEmergency وVoice

Mobile يحتوي AI triage/chat، community posts/votes، loyalty، wallet cards/topup/transactions/transfer، emergency/SOS، voice، map، offers وwearables. Web لا يملك parity مكتملة لهذه المجالات. بعضها ظهر كمسارات backend محمية، لكن DTOs وسياسات السلامة والخصوصية والـrate limits والاختبارات الحية غير مغلقة. Maternity Dashboard وNutrition Plan وCommunity Vote ظهرت كمسارات 404 في الفحص الحي، ولذلك هي blocked-on-backend ولا يجوز إنشاء routes تخمينية.

## 5. تحليل رحلة المريض الكاملة

### حجز استشارة

الرحلة المطلوبة هي: دخول/OTP، اختيار specialty، البحث عن طبيب، فتح detail، اختيار type، تحميل slots، قفل slot، إرسال booking مع Idempotency-Key، payment intent عند الحاجة، confirmation، فتح call-token داخل النافذة، ثم detail، cancel أو PATCH reschedule. أجزاء Web موجودة، لكن إثبات Sandbox الكامل للحجز والـpayment والـcancel والـreschedule والـcall-token لم يُغلق بعد بfixture حي قابل للتنظيف. الحالة: **Partial / live mutation proof required**.

### شراء دواء

الرحلة المطلوبة هي: catalog/search، filters، detail، add line، تعديل الكمية، حساب total من الخادم، checkout، payment، order confirmation، pharmacist/fulfillment، tracking، reorder أو return. Web يملك أجزاء القراءة وcheckout structure وwishlist read، لكن cart/order mutations والتسويات وإثبات replay/cleanup ما زالت غير مكتملة. الحالة: **Partial / contract and Sandbox required**.

### حجز Labs/Radiology

الرحلة المطلوبة هي: services/packages، detail، location/home visit، preparation، patient data، cart أو booking، payment/insurance، confirmation، results/report، tracking. Web أغلق القراءة لـLabs وRadiology Detail، لكن booking/cart/results/insurance/report end-to-end غير مغلقة. الحالة: **Partial / diagnostics booking contract required**.

### Home-care/Nursing

الرحلة المطلوبة هي: service/provider، address and consent، schedule، nursing/visit parameters، booking، confirmation، tracking/GPS، visit report، cancel/reschedule وbilling. Web أصلح القائمة الموحدة، لكن لا يملك إثباتاً كاملاً لكل هذه الخطوات. الحالة: **Partial / home-care and nursing contracts plus fixture required**.

## 6. الأزرار والمسارات والـscenarios

تم حفظ inventory خام لكل زر ومؤشر form/dialog/external action في `mobile_action_route_inventory.tsv`، ولكل navigation وscreen registration في الملف نفسه، ولكل Web action في `web_action_route_inventory.tsv`. عدد Mobile action rows هو 1,638، لكن بعضها قد يكون أكثر من marker في ملف واحد أو callback مشتركاً؛ لذلك الخطوة التالية اللازمة هي مراجعة semantic لكل row وربطه بـcapability وjourney، لا عدّه كزر مستقل تلقائياً.

كل عنصر تفاعلي يجب أن يملك قبل اعتماده: destination صحيح، loading state، disabled state، keyboard/focus path، RTL label، empty/error/retry، no-op protection، authorization behavior، analytics/privacy decision، وtest. أي زر لا يملك backend contract أو قراراً واضحاً يجب أن يكون hidden أو blocked بصياغة صادقة، وليس نجاحاً وهمياً.

## 7. الأمن والبيانات والأداء

تم إثبات عدم وجود token storage واضح في browser storage، ووجود server-side cookie boundary وBFF لبعض المسارات، وإضافة headers أمنية. ما زالت قبل GO النهائي: Docker image smoke في CI/staging، CSP بعد اختبار scripts/media، حسم advisory dependency، قياسات Core Web Vitals وAPI latency تحت mobile throttling، visual regression، replay/ownership الحي لكل mutation، وreview كامل لـdangerouslySetInnerHTML وdirect backend calls.

لم تُستخدم بيانات mock في مسارات الإنتاج المفحوصة، لكن توجد mocks داخل الاختبارات وهذا مقبول فقط إذا لم تتسرب إلى runtime. أي placeholder أو route غير متعاقد يجب أن يبقى محجوباً أو يُزال من رحلة المستخدم.

## 8. خطة الإغلاق ذات الأولوية

| الأولوية | نطاق الإغلاق | شرط الإنهاء |
|---|---|---|
| P0 | Booking/payment/call-token | live method/path، fixture slot، owner/stranger/unauth، idempotency/replay، cleanup |
| P0 | Pharmacy cart/checkout/orders | payload contract، totals server-authoritative، payment-safe Sandbox، replay وreturn states |
| P0 | Diagnostics booking/results | contract واضح للسلة أو الحجز، upload/insurance/results، ownership وjourney test |
| P0 | Home-care/Nursing | unified list/detail DTOs، provider/address/visit flow، fixture وownership |
| P1 | Auth/Onboarding parity | register/guest/social/reset/permissions/expiry/rate-limit و6 locales |
| P1 | Profile/Family/Insurance | reads/writes، 404 isolation، upload/OCR/claims، audit trail |
| P1 | Health/Reports/Nutrition | authoritative history، report access، writes، offline/retry، no fabricated scores |
| P1 | Chat/Notifications/Support | realtime/ack/read states، ownership، reconnect، rate limits |
| P2 | AI/Community/Loyalty/Wallet/Emergency/Voice | backend contracts، safety/privacy review، feature flags ثم live tests |
| P2 | UI/UX and motion | vector icon/button system، loading/empty/error states، RTL، reduced-motion، visual regression |
| P2 | SEO/GEO/AEO/ASO | public/private classification، structured data، metadata، robots/sitemap/llms، locale indexing |
| Release | CI/staging | Docker build، CSP، dependency closure، Lighthouse/RUM، E2E، rollback/observability |

## 9. الخلاصة

يمكنني إكمال هذا العمل، لكن الدقة تقتضي عدم تسميته مكتملاً الآن. ما تم إثباته هو baseline واسع ومجموعة شرائح حية، وليس parity كاملاً لكل 250 ملف Mobile أو كل 1,638 action marker. الملفات الخام والمصفوفات المرفقة هي مصدر التتبع لكل شاشة وزر ومسار، وستكون كل شريحة لاحقة: contract validation، implementation، review، tests، full gate، commit و`git ls-remote` مطابق.

**القرار الحالي: NO-GO للجاهزية 100%، مع قائمة إغلاق قابلة للتنفيذ ومثبتة بالأدلة.**
