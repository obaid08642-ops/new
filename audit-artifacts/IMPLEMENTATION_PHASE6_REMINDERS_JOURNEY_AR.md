# Phase 6 — Medication Reminders Parity

## نطاق التنفيذ

تمت مطابقة جزء read-only من شاشة `health/medication-reminder-list.tsx` في React Native:

- حساب next pending dose من `today_doses` أو times الموثقة.
- حساب taken/total progress.
- إبقاء medicine name/dose/frequency/times ضمن allowlist العرض.
- رفض أوقات غير صحيحة وحالات dose غير معروفة.
- الحفاظ على empty/error/unavailable states.

## ما لم يُنفذ

الموبايل يملك mutations لـlog dose وstop reminder وcreate/edit وlocal notifications. لم أضف هذه الأفعال إلى Web لأن ذلك يحتاج request schemas، ownership/authorization tests، CSRF policy، status transition rules، وbrowser interaction semantics. إبقاء الصفحة read-only حاليًا قرار أمني مقصود وليس نقصًا مخفيًا.

## الاختبارات

| الفحص | النتيجة |
|---|---|
| reminder parser | Pass |
| reminder server boundary | Pass |
| reminders SSR privacy | Pass |
| truthful runtime gate | Pass |
| TypeScript | Pass |
| production build | Pass |
| diff check | Pass |
