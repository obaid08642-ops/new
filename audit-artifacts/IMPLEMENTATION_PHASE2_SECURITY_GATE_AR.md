# Phase 2 — Security Gate Review

## نطاق المرحلة

تمت مراجعة Patient BFF وallowlist وupstream boundary قبل توسيع أي surface للمريض في المتصفح.

## النتيجة التقنية

الـBFF الحالي fail-closed في النطاق المعتمد: يسمح فقط بقراءات `GET` لمساري الطلبات الموثقين، ويرفض المسارات الإدارية والمزودين والكتابات. يتم استخراج المسار من route segments مع encoding، ويُمرر access token داخليًا فقط إلى upstream. refresh rotation يتطلب refresh cookie وdevice cookie معًا، ويُقبل فقط إذا أعاد الخادم access وrefresh token مكتملين.

لم أوسّع allowlist إلى domains إضافية لأن ذلك يتطلب عقدًا موثقًا واختبارات ownership/field-level قبل تعريض بيانات صحية أو مالية للمتصفح.

## اختبارات أضيفت

أضيفت regression tests لرفض:

- UUID غير صالح أو order path متداخل.
- traversal نصي أو encoded traversal.
- method casing غير المعياري والـPUT/DELETE على surface القراءة.

## بوابات التحقق

| الفحص | النتيجة |
|---|---|
| `pnpm check` | Pass |
| BFF route tests | 4/4 Pass |
| allowlist tests | 4/4 Pass |
| test files في baseline | 55 Pass / 14 skipped |
| tests في baseline | 94 Pass / 23 skipped |
| `git diff --check` | Pass |
| secrets في الملفات الجديدة | لم يُعثر عليها |

## قرار المرحلة

Pass مشروط: بوابة BFF الحالية آمنة ضمن surface الضيق المثبت، لكن لا يجوز اعتبارها تغطية كاملة لتطبيق React Native. المرحلة التالية هي إزالة السلوك الوهمي وإصلاح حالات الفشل على المصدر الذي سيُبنى، مع إبقاء كل contract غير مثبت محجوزًا.
