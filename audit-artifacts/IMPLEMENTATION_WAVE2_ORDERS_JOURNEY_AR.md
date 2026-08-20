# Wave 2 — Orders Center Status Tabs

## نطاق التنفيذ

تمت مطابقة أول أربع tabs من `app/orders/index.tsx` في React Native مع Web Orders: all، pending، completed، cancelled. الفلترة تتم من status الحقيقي القادم من `/orders/mine`، مع bucket mapping صريح للحالات المكتملة والملغاة، وأي status غير معروف يبقى pending بدل أن يُعرض كحالة ناجحة.

لم يتم دمج مصادر labs/radiology/nursing/insurance/returns/emergency في Web Orders حتى الآن؛ الموبايل يجمع ثمانية مصادر في مركز موحد، لكن ذلك يحتاج contracts وownership وprivacy tests لكل مصدر قبل التوسع.

## الاختبارات

| الفحص | النتيجة |
|---|---|
| orders SSR tests | 2/2 Pass |
| orders parser tests | 2/2 Pass |
| truthful runtime gate | Pass — 177 production files |
| TypeScript | Pass |
| production build | Pass |
| diff check | Pass |
