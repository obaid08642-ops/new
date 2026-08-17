# Nabdah Emergency Location Policy — Review Draft

**الحالة:** مسودة مراجعة فقط — غير مفعّلة

## المبدأ

يُجمع موقع الطوارئ فقط عندما يكون ضرورياً لتقديم SOS أو تتبع استجابة نشطة، وبأقل دقة ومدة ومشاركين ممكنين. لا يجوز استخدام موقع الخلفية أو سجل المواقع العام لتغطية نقص في تصميم الطوارئ. رفض الإذن أو غياب GPS لا يتحول إلى موقع وهمي أو إحداثيات صفرية.

## حالات السياسة

| الحالة | جمع الموقع | المشاركة |
|---|---|---|
| لا توجد طوارئ نشطة | لا جمع | لا مشاركة |
| شاشة SOS قبل الإرسال | لا إرسال تلقائي؛ يمكن عرض preview محلياً | لا backend persistence |
| إنشاء SOS بموافقة واضحة | نقطة موقع واحدة بأقل دقة لازمة | dispatch/emergency service فقط |
| استجابة نشطة | تحديثات محدودة ومؤقتة وفق interval معتمد | driver/dispatch المرتبط بالحالة فقط |
| إغلاق الحالة | إيقاف التحديثات | الاحتفاظ بسجل تدقيق مختصر لا يتضمن track غير لازم |
| رفض permission | استمرار SOS دون موقع إن أمكن | لا fallback مصطنع؛ تعرض حالة unavailable |

## البيانات المقترحة

يُفضّل تخزين `emergency_id`, `captured_at`, `accuracy_m`, `coarse_lat`, `coarse_lng`, `source`، و`consent_state`. الإحداثيات الدقيقة لا تُخزن إلا إذا أثبتت الحاجة التشغيلية واعتمدت قانونياً. لا يتم تخزين altitude أو speed أو raw device identifiers افتراضياً.

يجب التحقق من نطاق latitude/longitude والدقة وtimestamp وsource. القيم المفقودة أو غير المعقولة ترفض أو تُصنف `location_unavailable`، ولا تستبدل بـ`0,0` أو مركز المدينة.

## الموافقة والاستخدام

إن كان جمع الموقع يتطلب consent مستقلاً، يجب ربطه بعقد consent المقترح `location:share:emergency` وemergency id. لا يجوز استخدام موقع SOS لأغراض التسويق أو التحليلات أو تقييم المزود. كل قراءة أو مشاركة يجب أن ترتبط بحالة طوارئ active وactor مفوض.

## الوصول والملكية

المريض يرى حالة موقعه. dispatch يرى أقل معلومات لازمة لتعيين الاستجابة. driver لا يرى إلا حالات assigned/claimed التي يملكها. admin access يجب أن يكون مقيداً ومُدققاً. لا يسمح patient A أو provider غير المرتبط بقراءة موقع emergency B.

## الاحتفاظ والحذف

الافتراضي هو الاحتفاظ بأقل مدة تشغيلية تعتمد بعد مراجعة قانونية، ثم حذف أو تقليل الدقة. يجب فصل سجل audit عن location payload؛ audit يثبت من وصل ومتى ولماذا دون نسخ track كاملاً. أي export يحتاج authorization مستقل.

## Fail-closed acceptance criteria

لا تُفعل background tracking أو live stream قبل اعتماد interval، precision، retention، roles، consent، ومصفوفة permission. عند غياب authorization أو emergency relationship يعاد `EMERGENCY_LOCATION_UNAVAILABLE` أو 403، ولا يعاد موقع آخر. كل mutation يجب أن تتحقق من ملكية emergency وربطها بالحالة.

**قرار المراجعة:** DRAFT — NOT ACTIVE — لا تغييرات تشغيلية.
