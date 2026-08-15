# خطة تنفيذ staging وE2E بعد المعالجة — منصة نبض الصحية

**حالة الخطة:** لا تبدأ قبل توفير staging منفصل ومفاتيح اختبار مصرح بها.  
**نطاق البيئة:** ممنوع اختبار الإنتاج أو استخدام حسابات وOTP وأسرار إنتاج.  
**المرجع:** [سجل المصالحة الحي](./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md) و[تقرير الجاهزية](./NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md).

> هذه الخطة لا تزرع بيانات في الإنتاج ولا تدرج بيانات اعتماد في Git أو التقرير. كل هوية اختبار وsecret وpayment sandbox ينشأ من متغيرات staging أو مدير أسرار معتمد ثم يحذف وفق سياسة الاحتفاظ.

## 1. شروط الدخول إلى E2E

| الفئة | شرط الدخول | دليل القبول |
|---|---|---|
| العزل | domain وMongo وRedis وobject storage وحسابات دفع مستقلة عن الإنتاج | manifest بيئي مراجع من مسؤول التشغيل، دون قيم secrets |
| الإعداد | `MONGO_URL` و`REDIS_URL` و`JWT_SECRET` و`ALLOWED_ORIGINS` وURLs العميل مضبوطة | backend يبدأ بنجاح؛ origins غير المصرح بها ترفض |
| الخدمات | مزود SMTP/SMS أو test sink، push sandbox، object storage، payment sandbox | health checks وطلبات اختبار غير مالية موثقة |
| البيانات | حسابات اختبار منفصلة للأدوار مع مزودين ومخزون وفتحات ومواقع اختبار | IDs محفوظة في secret store فقط، لا في Git |
| المراقبة | correlation ID، logs مقيدة، audit events، error tracking | إمكانية ربط كل سيناريو بطلباته دون كشف PII أو tokens |
| الحزمة | استخدام أرشيفات الفرع `manus/on-live-reconciliation` المحددة في manifest | SHA-256 ومراجعة الالتزام قبل النشر |

## 2. مصفوفة الأدوار والبيانات

| الدور | الحد الأدنى للبيانات اللازمة | القيود التي يجب إثباتها |
|---|---|---|
| مريض A | ملف صحي، عنوان اختبار، وصفة نشطة، وسيلة دفع sandbox | لا يرى أو يعدل بيانات المريض B |
| مريض B | بيانات مستقلة عن A | يستخدم لاختبارات BOLA/IDOR وخصوصية الطلبات |
| طبيب/مقدم خدمة | profile مُعتمد، فتحة حجز، علاقة appointment مع A | لا يقرأ ملف A الطبي قبل عقد consent، ولا يرى B |
| صيدلية | مخزون للاختبار وbid/dispatch قابلان للتتبع | لا تقبل أو تعدل طلب صيدلية أخرى |
| مختبر | خدمة صالحة وprovider account وbooking لعينة A | لا يسرد أو يعدل عينات مختبر آخر |
| مدير محدود | دور إداري اختباري بأقل صلاحية لازمة | لا يتجاوز تدقيق الوصول أو يكشف secrets |
| مدير كامل | حساب منفصل وحماية 2FA على test sink | مراجعة audit لاختبارات إدارة حساسة فقط |

## 3. سيناريوهات القبول الإلزامية

### الهوية والتهيئة والشبكة

| ID | السيناريو | النتيجة المتوقعة | الدليل المطلوب |
|---|---|---|---|
| `E2E-AUTH-01` | تسجيل مريض صالح ثم refresh وإعادة تشغيل التطبيق | session صحيحة بلا token في logs أو storage غير آمن | HAR منقح وسجل audit |
| `E2E-AUTH-02` | 2FA إداري عبر test sink | OTP صالح مرة واحدة فقط، TTL/limits تعمل، ولا يظهر code في log | نتائج API منقحة وسجل Redis policy |
| `E2E-AUTH-03` | محاولات OTP متكررة أو حمولة مخالفة | throttling/رفض صحيح، بلا bypass أو تسريب | status/body منقح |
| `E2E-CFG-01` | بدء backend بإعداد كامل | health وREST وWebSocket تعمل من origins المعتمدة | startup log منقح وbrowser evidence |
| `E2E-CFG-02` | حذف متغير حرج في بيئة اختبار مقلدة | backend أو الوظيفة المتأثرة يفشل بأمان | سجل فشل متحكم به |
| `E2E-CFG-03` | origin غير مدرج واتصال Socket | CORS/handshake مرفوض | network trace |

### المريض والحجز والتحاليل

| ID | السيناريو | النتيجة المتوقعة | الدليل المطلوب |
|---|---|---|---|
| `E2E-LAB-01` | اختيار خدمة مختبر ومزوّد فعلي | القائمة تعرض مزودين وخدمات حية فقط، أو empty state صادق | لقطات قبل/بعد مع response منقح |
| `E2E-LAB-02` | إنشاء booking مع provider account صحيح | يعيد backend `id`/tracking/state حقيقية؛ لا يسمى دفعاً بلا payment contract | API trace وواجهة النجاح |
| `E2E-LAB-03` | مريض B يطلب booking أو sample للمريض A | 403/404 وفق السياسة، بلا بيانات وصفية مسربة | negative test evidence |
| `E2E-LAB-04` | مختبر ثانٍ يقرأ/يعدل sample مختبر A | مرفوض | audit/security evidence |

### الصيدلية والدفع والتوصيل

| ID | السيناريو | النتيجة المتوقعة | الدليل المطلوب |
|---|---|---|---|
| `E2E-PHARM-01` | checkout بصيغة pickup | delivery fee صفري من الخادم، order ID فعلي | request/response وواجهة tracking |
| `E2E-PHARM-02` | checkout بصيغة delivery بلا موقع صالح | يمنع قبل order أو يرفض بعقد واضح | لقطة واجهة/status |
| `E2E-PHARM-03` | workflow وصفة: upload → review → cart → order | لا URI محلي أو ID صناعي، ولا صرف تلقائي بلا تطابق/مراجعة | object reference منقح وAPI trace |
| `E2E-PHARM-04` | bid/accept ثم tracking | request ID/order ID حقيقيان؛ لا ETA أو خصم غير معاد من backend | sequence trace |
| `E2E-PHARM-05` | payment sandbox بقيمة تجارية مصرح بها | intent/verification/webhook/idempotency صحيحة؛ لا تستخدم قيمة صفرية لتجاوز المسار | سجلات مزود الدفع sandbox منقحة |
| `E2E-PHARM-06` | إعادة نفس mutation بمفتاح idempotency | رد مخزن أو conflict صحيح، ولا ينشأ خصم/طلب مكرر | request pair وaudit |
| `E2E-PHARM-07` | مريض B يفتح tracking أو يعيد طلب order A | مرفوض بلا تفاصيل order | negative test evidence |

### المزوّد والإدارة والاتصالات

| ID | السيناريو | النتيجة المتوقعة | الدليل المطلوب |
|---|---|---|---|
| `E2E-PROV-01` | دخول مقدم معتمد وفتح inbox أو إحالة مختبر | يستدعي endpoint الحي ويظهر خطأ صادق عند الفشل | trace ولقطات |
| `E2E-PROV-02` | تسجيل push بلا `EXPO_PUBLIC_PROJECT_ID` | لا token وهمي ولا تسجيل backend | device/staging log منقح |
| `E2E-PROV-03` | الوصول إلى ملف طبي عبر provider route | 403 حتى اعتماد consent contract | negative test evidence |
| `E2E-PROV-04` | QR provider | يبقى غير متاح ما لم تنفذ contract معتمدة؛ لا نجاح كاميرا أو مشاركة وهمي | فيديو/لقطة قبول |
| `E2E-ADMIN-01` | فتح الإدارة، تسجيل الدخول، التنقل، API base | لا prerender/router failure ولا relative request خاطئ | browser trace |
| `E2E-WS-01` | محادثة/Realtime من origin مصرح | نجاح role/auth مطابقان للعقد | socket trace منقح |
| `E2E-WS-02` | handshake مزور أو origin غير مصرح | مرفوض بلا user impersonation | security trace |

### التوطين وإمكانية الاستخدام

| ID | السيناريو | النتيجة المتوقعة | الدليل المطلوب |
|---|---|---|---|
| `E2E-I18N-01` | تغيير اللغة بين AR/EN/UR/HI/BN/FIL | النصوص الساكنة المترجمة تتغير، ولا تتعطل route أو alert | لقطات لكل لغة |
| `E2E-I18N-02` | العربية والأردية | RTL والمحاذاة والتنقل لا تنقلب بصورة مضللة أو متداخلة | iOS/Android screenshots |
| `E2E-I18N-03` | أخطاء API ومحتوى ديناميكي | لا تعرض strings تقنية أو عربية ثابتة في لغة أخرى؛ تسجل gap إن لم يوجد error code | قائمة deficits موقعة |
| `E2E-A11Y-01` | قارئ الشاشة وتكبير الخط للرحلات الحرجة | الأزرار وحقول الدفع/الطوارئ قابلة للوصول | accessibility checklist |

## 4. عقود يجب اعتمادها قبل السيناريوهات المحجوبة

| العقد | طريقة/مسار مقترح | تفويض وملكية | انتقالات/أخطاء لازمة | audit |
|---|---|---|---|---|
| consent للملف الطبي | grant/revoke/read منفصل | المريض يملك grant؛ provider يحتاج علاقة علاجية نشطة وscope | expired/revoked/not-related/forbidden | grant، read، revoke |
| QR صحي | verifier server-side لJWT قصير العمر | role، consent scope، token expiry/revocation | invalid/expired/revoked/not-consented | scan ونتيجة policy |
| موقع/route للطوارئ | read موقع active SOS فقط | owner/dispatcher وفق حالة incident وموافقة | unavailable/permission-denied/stale | location access/retention |
| error-code registry | كل endpoint حرج يعيد code ثابتاً وmessage قابل localization | لا يعيد stack/PII | validation/auth/ownership/payment/state | correlation ID |
| runtime config | schema versioned وحقول allow-list | endpoint عام بلا secrets | missing/invalid configuration | config version/access |

## 5. قواعد الإيقاف والفشل

يوقف التنفيذ فوراً عند أي اتصال غير مقصود بالإنتاج، أو ظهور secret/OTP/PII في log أو HAR أو لقطة، أو خصم مالي غير مصرح، أو تعديل بيانات خارج حسابات الاختبار، أو كشف cross-tenant data. تحفظ الأدلة منقحة، وتعطل مفاتيح sandbox المتأثرة، ثم يفتح defect مرتبط بالالتزام والـroute والـrequest والـresponse دون وضع payload حساس في Git.

## 6. معيار الخروج وقرار الإطلاق

يقبل staging فقط عندما تنجح كل السيناريوهات الحرجة والاختبارات السلبية، وتثبت مراجعة أمنية أن BOLA/IDOR وCORS/Socket وOTP/payment idempotency لا تتراجع، وتكتمل مراجعة لغوية بشرية للرحلات الحرجة. بعد ذلك فقط ينفذ release candidate محدود ومراقب؛ أما قبول المتاجر أو الإنتاج فيحتاج موافقة المنتج والأمن والتشغيل والقانون/الخصوصية وفق سياسات المؤسسة.

## المراجع

[1]: ./NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة مع المصدر الحي — منصة نبض الصحية"
[2]: ./NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة الموحد وحكم الجاهزية للإطلاق"
