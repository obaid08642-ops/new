# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_REVIEW_HANDOVER_CURRENT_STATE_20260819.md`
- **Member SHA-256:** `b43cb710ce22d10bb89352d54583a87899e5c837525215c8c369db0a4e87f13e`
- **Line count:** 139
- **Read range:** `1-139`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `34: | 7 | مقارنة المنافسين وتجربة المستخدم ومسارات الطلب والاستلام. | حُددت محاور UX؛ لا تزال المراجعة البشرية screen-by-screen مطلوبة. |`
- `51: | Provider | Expo SDK 54→57، Camera بدل barcode scanner، Audio بدل `expo-av`، إصلاح native/router/config/dedupe. | `npm ci`، TypeScript، Android/iOS/Web export، Expo Doctor 21/21. | 8 moderate، 16 high upstream، 0 critical. |`
- `100: يجب تنفيذ سيناريوهات sandbox end-to-end لكل خدمة (الطلب، استقبال المزود، القبول/الرفض، الحالة، الإلغاء، التقرير، الملكية)، ثم Android/iOS signed builds وفحص هاتفين حقيقيين لـ push وdeep links وCallKeep/full-screen intent وLiveKit وGPS والخل`
- `104: نُقلت النصوص المصدرية الثابتة والقوالب المتكافئة إلى طبقة اللغات الست. إلا أن الترجمة الآلية لا تساوي مراجعة طبية/لغوية بشرية، كما تبقى النصوص الديناميكية من API، أخطاء الخادم، notifications، الأرقام/التواريخ، القوالب غير المتكافئة، واختبار`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `37: | 10 | تدقيق التبعيات. | Admin نظيف؛ كانت Backend/Patient/Provider تحتاج migrations محكومة ثم نُفذت الدفعات الموضحة أدناه. |`
- `52: | Admin | تدقيق التبعيات. | بناء/تدقيق موثق. | 0 vulnerabilities. |`
- `73: الاحتواء لا يدعي أن الميزة أصبحت كاملة. في كل حالة ظهر فيها تاريخ محلي أو نجاح محلي أو سجل مهني/سريري لا يملك عقد خادم متحققاً، تم منع عرضه كحقيقة تشغيلية أو استبداله بحالة واضحة غير متاحة. المسارات التي تحتاج تفعيلًا وظيفياً لاحقاً تشمل ch`
- `82: | Admin | `web_admin_dashboard.zip` | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | تدقيق تبعيات نظيف؛ لا يغني عن اعتماد عمليات الإدارة. |`
- `96: يحتاج owner/legal/product إلى اعتماد صريح لمحتوى وسياسات SOS وQR وconsent وlocation واتفاقيات مقدم الخدمة. ستبقى المسارات fail-closed حتى ذلك الاعتماد؛ لا يجوز تحويل نجاح build أو ترجمة آلية إلى اعتماد قانوني. [1] [11]`
### state_transitions
- `73: الاحتواء لا يدعي أن الميزة أصبحت كاملة. في كل حالة ظهر فيها تاريخ محلي أو نجاح محلي أو سجل مهني/سريري لا يملك عقد خادم متحققاً، تم منع عرضه كحقيقة تشغيلية أو استبداله بحالة واضحة غير متاحة. المسارات التي تحتاج تفعيلًا وظيفياً لاحقاً تشمل ch`
### payment_insurance_relevance
- `116: **قرار المتاجر:** **لا تقدموا للمتاجر بعد.** يلزم إغلاق التبعيات المتبقية، الاعتمادات القانونية، Moyasar، E2E، البنى الموقعة، واختبارات الأجهزة واللغات البشرية.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
