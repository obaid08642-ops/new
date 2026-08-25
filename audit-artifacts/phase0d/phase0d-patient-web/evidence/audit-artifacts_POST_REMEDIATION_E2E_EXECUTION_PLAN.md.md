# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/POST_REMEDIATION_E2E_EXECUTION_PLAN.md`
- **Member SHA-256:** `9fc798112e902a3e53e46bae85dc115e2099e54f6516c61c3e0f2f4cb7336e73`
- **Line count:** 108
- **Read range:** `1-108`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: **المرجع:** [سجل المصالحة الحي](./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md) و[تقرير الجاهزية](./NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md).`
- `28: | مختبر | خدمة صالحة وprovider account وbooking لعينة A | لا يسرد أو يعدل عينات مختبر آخر |`
- `50: | `E2E-LAB-02` | إنشاء booking مع provider account صحيح | يعيد backend `id`/tracking/state حقيقية؛ لا يسمى دفعاً بلا payment contract | API trace وواجهة النجاح |`
- `51: | `E2E-LAB-03` | مريض B يطلب booking أو sample للمريض A | 403/404 وفق السياسة، بلا بيانات وصفية مسربة | negative test evidence |`
- `58: | `E2E-PHARM-01` | checkout بصيغة pickup | delivery fee صفري من الخادم، order ID فعلي | request/response وواجهة tracking |`
- `59: | `E2E-PHARM-02` | checkout بصيغة delivery بلا موقع صالح | يمنع قبل order أو يرفض بعقد واضح | لقطة واجهة/status |`
- `60: | `E2E-PHARM-03` | workflow وصفة: upload → review → cart → order | لا URI محلي أو ID صناعي، ولا صرف تلقائي بلا تطابق/مراجعة | object reference منقح وAPI trace |`
- `72: | `E2E-PROV-03` | الوصول إلى ملف طبي عبر provider route | 403 حتى اعتماد consent contract | negative test evidence |`
- `74: | `E2E-ADMIN-01` | فتح الإدارة، تسجيل الدخول، التنقل، API base | لا prerender/router failure ولا relative request خاطئ | browser trace |`
- `82: | `E2E-I18N-01` | تغيير اللغة بين AR/EN/UR/HI/BN/FIL | النصوص الساكنة المترجمة تتغير، ولا تتعطل route أو alert | لقطات لكل لغة |`
- `83: | `E2E-I18N-02` | العربية والأردية | RTL والمحاذاة والتنقل لا تنقلب بصورة مضللة أو متداخلة | iOS/Android screenshots |`
- `93: | موقع/route للطوارئ | read موقع active SOS فقط | owner/dispatcher وفق حالة incident وموافقة | unavailable/permission-denied/stale | location access/retention |`
### backend_consumers_or_contracts
- `41: | `E2E-CFG-01` | بدء backend بإعداد كامل | health وREST وWebSocket تعمل من origins المعتمدة | startup log منقح وbrowser evidence |`
- `43: | `E2E-CFG-03` | origin غير مدرج واتصال Socket | CORS/handshake مرفوض | network trace |`
- `75: | `E2E-WS-01` | محادثة/Realtime من origin مصرح | نجاح role/auth مطابقان للعقد | socket trace منقح |`
- `94: | error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |`
- `103: يقبل staging فقط عندما تنجح كل السيناريوهات الحرجة والاختبارات السلبية، وتثبت مراجعة أمنية أن BOLA/IDOR وCORS/Socket وOTP/payment idempotency لا تتراجع، وتكتمل مراجعة لغوية بشرية للرحلات الحرجة. بعد ذلك فقط ينفذ release candidate محدود ومرا`
### auth_ownership
- `4: **نطاق البيئة:** ممنوع اختبار الإنتاج أو استخدام حسابات وOTP وأسرار إنتاج.`
- `17: | المراقبة | correlation ID، logs مقيدة، audit events، error tracking | إمكانية ربط كل سيناريو بطلباته دون كشف PII أو tokens |`
- `38: | `E2E-AUTH-01` | تسجيل مريض صالح ثم refresh وإعادة تشغيل التطبيق | session صحيحة بلا token في logs أو storage غير آمن | HAR منقح وسجل audit |`
- `39: | `E2E-AUTH-02` | 2FA إداري عبر test sink | OTP صالح مرة واحدة فقط، TTL/limits تعمل، ولا يظهر code في log | نتائج API منقحة وسجل Redis policy |`
- `40: | `E2E-AUTH-03` | محاولات OTP متكررة أو حمولة مخالفة | throttling/رفض صحيح، بلا bypass أو تسريب | status/body منقح |`
- `71: | `E2E-PROV-02` | تسجيل push بلا `EXPO_PUBLIC_PROJECT_ID` | لا token وهمي ولا تسجيل backend | device/staging log منقح |`
- `74: | `E2E-ADMIN-01` | فتح الإدارة، تسجيل الدخول، التنقل، API base | لا prerender/router failure ولا relative request خاطئ | browser trace |`
- `75: | `E2E-WS-01` | محادثة/Realtime من origin مصرح | نجاح role/auth مطابقان للعقد | socket trace منقح |`
- `92: | QR صحي | verifier server-side لJWT قصير العمر | role، consent scope، token expiry/revocation | invalid/expired/revoked/not-consented | scan ونتيجة policy |`
- `93: | موقع/route للطوارئ | read موقع active SOS فقط | owner/dispatcher وفق حالة incident وموافقة | unavailable/permission-denied/stale | location access/retention |`
- `94: | error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |`
- `99: يوقف التنفيذ فوراً عند أي اتصال غير مقصود بالإنتاج، أو ظهور secret/OTP/PII في log أو HAR أو لقطة، أو خصم مالي غير مصرح، أو تعديل بيانات خارج حسابات الاختبار، أو كشف cross-tenant data. تحفظ الأدلة منقحة، وتعطل مفاتيح sandbox المتأثرة، ثم يفت`
### state_transitions
- `17: | المراقبة | correlation ID، logs مقيدة، audit events، error tracking | إمكانية ربط كل سيناريو بطلباته دون كشف PII أو tokens |`
- `40: | `E2E-AUTH-03` | محاولات OTP متكررة أو حمولة مخالفة | throttling/رفض صحيح، بلا bypass أو تسريب | status/body منقح |`
- `49: | `E2E-LAB-01` | اختيار خدمة مختبر ومزوّد فعلي | القائمة تعرض مزودين وخدمات حية فقط، أو empty state صادق | لقطات قبل/بعد مع response منقح |`
- `50: | `E2E-LAB-02` | إنشاء booking مع provider account صحيح | يعيد backend `id`/tracking/state حقيقية؛ لا يسمى دفعاً بلا payment contract | API trace وواجهة النجاح |`
- `59: | `E2E-PHARM-02` | checkout بصيغة delivery بلا موقع صالح | يمنع قبل order أو يرفض بعقد واضح | لقطة واجهة/status |`
- `84: | `E2E-I18N-03` | أخطاء API ومحتوى ديناميكي | لا تعرض strings تقنية أو عربية ثابتة في لغة أخرى؛ تسجل gap إن لم يوجد error code | قائمة deficits موقعة |`
- `94: | error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |`
### payment_insurance_relevance
- `7: > هذه الخطة لا تزرع بيانات في الإنتاج ولا تدرج بيانات اعتماد في Git أو التقرير. كل هوية اختبار وsecret وpayment sandbox ينشأ من متغيرات staging أو مدير أسرار معتمد ثم يحذف وفق سياسة الاحتفاظ.`
- `15: | الخدمات | مزود SMTP/SMS أو test sink، push sandbox، object storage، payment sandbox | health checks وطلبات اختبار غير مالية موثقة |`
- `50: | `E2E-LAB-02` | إنشاء booking مع provider account صحيح | يعيد backend `id`/tracking/state حقيقية؛ لا يسمى دفعاً بلا payment contract | API trace وواجهة النجاح |`
- `62: | `E2E-PHARM-05` | payment sandbox بقيمة تجارية مصرح بها | intent/verification/webhook/idempotency صحيحة؛ لا تستخدم قيمة صفرية لتجاوز المسار | سجلات مزود الدفع sandbox منقحة |`
- `94: | error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |`
- `99: يوقف التنفيذ فوراً عند أي اتصال غير مقصود بالإنتاج، أو ظهور secret/OTP/PII في log أو HAR أو لقطة، أو خصم مالي غير مصرح، أو تعديل بيانات خارج حسابات الاختبار، أو كشف cross-tenant data. تحفظ الأدلة منقحة، وتعطل مفاتيح sandbox المتأثرة، ثم يفت`
- `103: يقبل staging فقط عندما تنجح كل السيناريوهات الحرجة والاختبارات السلبية، وتثبت مراجعة أمنية أن BOLA/IDOR وCORS/Socket وOTP/payment idempotency لا تتراجع، وتكتمل مراجعة لغوية بشرية للرحلات الحرجة. بعد ذلك فقط ينفذ release candidate محدود ومرا`
### error_empty_loading_retry_cancel
- `17: | المراقبة | correlation ID، logs مقيدة، audit events، error tracking | إمكانية ربط كل سيناريو بطلباته دون كشف PII أو tokens |`
- `49: | `E2E-LAB-01` | اختيار خدمة مختبر ومزوّد فعلي | القائمة تعرض مزودين وخدمات حية فقط، أو empty state صادق | لقطات قبل/بعد مع response منقح |`
- `84: | `E2E-I18N-03` | أخطاء API ومحتوى ديناميكي | لا تعرض strings تقنية أو عربية ثابتة في لغة أخرى؛ تسجل gap إن لم يوجد error code | قائمة deficits موقعة |`
- `94: | error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
