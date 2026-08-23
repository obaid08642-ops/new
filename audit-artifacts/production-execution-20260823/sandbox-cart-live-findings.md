# Sandbox Cart Live Findings — 2026-08-23

تمت المصادقة بحساب Sandbox owner على الموقع المنشور `https://nabd.plus` بنجاح (`200`). القراءة من `/api/patient/cart` أعادت `200`.

أما المساران اللذان يستخدمهما سكريبت medicines القديم لتوفير fixture (`/api/patient/medicines?limit=1` و`/api/patient/addresses`) فأعاد كل منهما `404`. لم يتم تنفيذ `POST /api/cart/items` أو `POST /api/cart/checkout` أو reorder/cancel، لأن medicine/address fixtures الصحيحة غير مثبتة، ولا يجوز إنشاء mutation أو ترك بيانات Sandbox دون cleanup مؤكد.

هذه النتيجة لا تعني فشل عقد cart نفسه؛ تعني أن اختبار mutation الحالي يفتقد fixtures ومسارات القراءة الصحيحة. يلزم استخراج endpoints الحية من العقد المرفق/backend أو استخدام fixture معروف مع مسار cleanup مؤكد قبل تشغيل owner/stranger/replay.
