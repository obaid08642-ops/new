# Phase 6 — Notification Settings Parity

## نطاق التنفيذ

أضيفت صفحة `/[locale]/notifications/settings` لتغطية canonical mobile route `/settings/notifications-settings` بدل legacy redirect الذي لا يملك UI فعليًا.

الصفحة تقرأ `/users/me/notification-settings` عبر server-only boundary وتعرض القيم boolean المعروفة فقط: general، appointments، orders، offers، medications، doctorMessages، emergency، sound، vibration. قيمة emergency تظهر مقفلة بصريًا مثل الموبايل.

## قرار أمني

لم أضف Switch أو PATCH من المتصفح. كود الموبايل الحالي يرسل PATCH، لكن إدخاله إلى الويب يحتاج إغلاق CSRF، ownership، authorization، optimistic rollback، error state، audit logging، وcontract schema. لذلك تعرض الويب الحالة المؤكدة أو `غير متاح` ولا تنشئ defaults محلية.

## الاختبارات

| الفحص | النتيجة |
|---|---|
| notification settings parser | 1/1 Pass |
| existing notification parser tests | 2/2 Pass |
| truthful runtime gate | Pass — 177 production files |
| TypeScript | Pass |
| production build | Pass |
| diff check | Pass |
