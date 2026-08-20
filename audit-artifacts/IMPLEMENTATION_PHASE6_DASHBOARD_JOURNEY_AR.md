# Phase 6 — Dashboard Journey Parity

## نطاق التنفيذ

تم ربط Dashboard Web بقراءتين server-only مثبتتين في OpenAPI وتستخدمهما Home في React Native:

- `/users/me/profile` لاسم المريض بعد تطبيع الحقول المسموحة.
- `/home/upcoming-appointment` لعرض الموعد القادم بعد اشتراط `id` ثابت وعدم عرض payload ناقص كموعد حقيقي.

لم يتم تمرير access token إلى browser، ولم تتم إضافة هذه المسارات إلى browser BFF allowlist؛ القراءة تتم من Server Component عبر access token الموجود في cookie server-side.

## السلوك

تُجرى القراءتان بالتوازي عبر `Promise.allSettled`. إذا أعاد أي عقد `401` تتم إعادة التوجيه إلى login. إذا فشل الاتصال أو كان payload فارغًا، تعرض الصفحة حالة محايدة ولا تنشئ بيانات بديلة. حقول العرض محدودة إلى name/doctor/date/status، ولا تُعرض clinical notes أو حقول خاصة غير لازمة.

## الاختبارات

| الفحص | النتيجة |
|---|---|
| Dashboard parser tests | 2/2 Pass |
| Dashboard page visual shell test | 1/1 Pass |
| Dashboard SSR tests | 2/2 Pass |
| truthful runtime gate | Pass — 174 production files |
| TypeScript | Pass |
| production build | Pass |

## حدود المرحلة

هذه أول رحلة صغيرة من Home parity وليست تنفيذًا كاملًا لشاشة React Native؛ فما زالت reminders، nutrition، maternity، mood، vitals، emergency، triage، وfull home states تحتاج عقودًا واختبارات مستقلة قبل إدخالها إلى Dashboard Web.
