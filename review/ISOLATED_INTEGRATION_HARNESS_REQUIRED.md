# PR-F — متطلبات harness التكامل المعزول

لم يُنشأ أو يُشغّل harness في هذه المهمة لأن لا Mongo replica set أو Redis معزولان مصرح بهما.

| السيناريو المطلوب لاحقاً | المتطلبات |
|---|---|
| اختيار العرض ودفع البطاقة | Mongo transaction-capable replica set، adapter PSP fake محلي، webhook signed replay fixture، evidence مقيد بالعرض/version/hash. |
| التأمين | صيدلية approved/selected، concurrent decisions، partial/reject ثم patient cancellation، transaction conflict. |
| انتهاء البث | مرحلتان/ثلاث، recipients جدد، lease recovery، parallel runners، outbox E11000. |
| COD/settlement | collection proof وsettlement command غير موجودين بعد؛ لا يبدأ الاختبار قبل اعتماد العقد. |

> لا يتصل هذا التصميم بـproduction أو PSP/S3/LiveKit/OTP/push حية. تشغيله يتطلب موافقة بيئة معزولة منفصلة.
