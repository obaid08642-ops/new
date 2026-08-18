# مانع Firebase Test Lab — 2026-08-17

## النتيجة

لم يبدأ Firebase Test Lab في هذه الجولة. فحص الأدوات أظهر أن `firebase` و`gcloud` غير متاحين في sandbox، ولا توجد متغيرات GCP/Firebase أو credentials صالحة في البيئة. لم أطلب أو أضع مفاتيح داخل المستودع، ولم أرفع APK غير موجود.

## سبب عدم الإغلاق

المزرعة تحتاج APK/AAB حقيقياً أولاً، ثم مشروع GCP/Firebase مفعلاً مع billing، وcredentials أو CI service account مصرحاً له برفع artifact وتشغيل Robo/scripted tests. هذه متطلبات خارجية لا يجوز تخمينها أو استبدالها ببيانات وهمية.

## المطلوب من المالك

يوفر المالك حساب Expo/EAS أو Android build host لإنتاج APKs، ثم مشروع Firebase Test Lab/GCP مع التفويض المناسب. بعد ذلك تُرفع نسخ الاختبار فقط، ويُشغّل Robo test على 5–10 أجهزة/إصدارات، ويحفظ تقرير الأعطال والأداء واللقطات في `audit-artifacts`.

## الحكم

حالة المزرعة: **BLOCKED — external credentials/build artifacts unavailable**. لا توجد نتيجة Passed أو Failed يمكن نسبتها إلى Firebase Test Lab، ولا تُغلق المرحلة إلا بعد دليل تشغيل فعلي قابل للمراجعة.
