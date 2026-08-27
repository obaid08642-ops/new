# قرار تشغيلي مطلوب قبل استدعاء أمر انتهاء البث والعروض

لا تشغّل `expireDuePharmacyOffers` تلقائياً حالياً. هذه الوثيقة **لا** تمنح إذن تشغيل ولا تحدد الخيار نيابةً عن مالك البنية.

## متطلبات مشتركة قبل أي قرار

يلزم أولاً تطبيق ترحيل الفهارس في بيئة معزولة تمثيلية فقط، بعد backup وpre-check للتكرارات، والتحقق من الاسماء `domain_outbox_pharmacy_idempotency_unique` و`pharmacy_broadcast_recipient_unique` وفهارس المسح. يلزم أيضاً service identity مقيد، network restriction، سجلات `now/cursor/result`، metrics للتأخر وlease conflict/outbox failure، تنبيهات، runbook للاستعادة، واختبار restart/concurrency. لا يمر الاستدعاء وقتاً من العميل.

| الخيار | الاستخدام | الشروط والقيود |
|---|---|---|
| مستدعٍ دوري خارجي محمي كل 1–5 دقائق | ملائم عندما يكون تأخر الانتهاء القصير مقبولاً وبحجم محدود. | هوية خدمة، حد شبكة، مراقبة، metrics/alerts، runbook، rehearsal للترحيل وبيئة Mongo transaction-capable معزولة. يعالج `next_cursor` حتى يصبح null ولا يستدعي push مباشرة. |
| عامل queue متين | ملائم للحجم الأعلى أو متطلبات الدقة والتعامل مع فشل متكرر. | Redis سليم ومراقب بعد معالجة `MISCONF`، queue متينة، retries/backoff، DLQ، concurrency/restart tests، ولوحة مراقبة وتسوية. |

> لا يُفعَّل cron أو queue worker أو migration أو endpoint caller في production قبل قرار مالك البنية ونجاح الاختبارات المعزولة وتغيير تشغيلي موثق.
