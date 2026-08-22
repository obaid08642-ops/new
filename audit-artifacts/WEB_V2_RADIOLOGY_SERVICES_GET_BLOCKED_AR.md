# Radiology Services + Detail — Blocked

## الحكم

**الحالة: BLOCKED — لم يتم إنشاء route أو parser أو wrapper.** السبب أن `GET /radiology/services` و`GET /radiology/services/{id}` ظهرا في مصدر Mobile وخريطة التشغيل القديمة، لكن لم يمكن إثباتهما من OpenAPI المرجعي الحالي أو من مصدر backend المتاح في workspace.

## أدلة التدقيق

| المصدر | النتيجة |
|---|---|
| Mobile diagnostics hub | يستدعي `/radiology/services` للعرض |
| Mobile route map | يذكر `GET /radiology/services` ضمن Radiology |
| OpenAPI المرجعي المتاح في repo | لا توجد نسخة قابلة للقراءة/التتبع تثبت schema للمسار |
| backend source المتاح | لم يظهر controller أو schema Radiology public catalog قابلاً للمطابقة |
| Web implementation | لم تتم إضافة أي route أو mock أو fallback |

## سبب الحجب

Contract-First يمنع بناء صفحة تعتمد على shape مفترض. لا نعرف بشكل موثق حقول الاسم العربي/الإنجليزي، السعر، الوصف، availability، query parameters، تفاصيل العنصر، أكواد الأخطاء، أو هل المسار public أم authenticated. لذلك فإن بناء UI الآن سيخرق شرط عدم التخمين.

## المطلوب لفتح الشريحة

يلزم توفير أو نشر عقد واضح يتضمن:

1. `GET /radiology/services` مع query parameters وresponse schema.
2. `GET /radiology/services/{id}` مع identifier policy و404 behavior.
3. الحقول العامة المسموح بعرضها وأي حقول يجب strip منها.
4. security mode و401/403/404/503 responses.
5. إثبات endpoint في OpenAPI المنشور أو controller/DTO متزامن مع backend.

بعد توفر ذلك تُنفذ الشريحة بنفس نمط Labs: parser محدود، wrapper بلا tokens إن كان public، صفحات SSR بست لغات، empty/error states، اختبارات SSR/security، full gates، ثم push و`git ls-remote` مطابق.

## قرار الصدق

لم يتم اختراع route `/radiology/services`، ولم يتم اعتبار Mobile fetch وحده عقداً كافياً، ولم تُستخدم بيانات mock. يمكن متابعة شريحة GET أخرى مثبتة، أو فتح هذه الشريحة فور تزويد العقد المطلوب.
