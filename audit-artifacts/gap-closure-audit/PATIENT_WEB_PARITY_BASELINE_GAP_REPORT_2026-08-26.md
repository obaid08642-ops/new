# Patient Web ↔ Patient Mobile: baseline parity gap report

## النتيجة الصادقة

يوجد في baseline **246 route/screens مرشحًا للمريض Mobile** بعد استبعاد test/spec وملفات `_layout`. وظهر في Web archive **60 صفحة UI محلية تحت `app/[locale]`**، إضافة إلى 13 BFF/API route handler، وملفات framework/SEO، وثلاث صفحات client legacy. لا تشكل API handlers أو `robots`/`sitemap`/`loading`/`error` صفحات مريض مكافئة، ولذلك لا تدخل في عد صفحات parity.[1]

لا يصح استنتاج أن 186 شاشة «مفقودة» فورًا؛ فقد تمثل بعض Mobile routes dialogs أو intermediate states أو native-only capabilities أو flows مدمجة في صفحة Web واحدة. لكن لا توجد حاليًا mapping معتمدة تثبت هذا؛ لذلك لا يصح أيضًا الادعاء بأن Web مطابق للموبايل.

| عنصر الجرد | العدد | التفسير |
|---|---:|---|
| Mobile route/screen candidates | 246 | مرجع inventory، وليس إثباتًا لكل حالة مرئية مستقلة |
| Web localized UI page candidates | 60 | صفحات `app/[locale]` باستبعاد handlers وframework metadata |
| Web BFF/API handlers | 13 | عقود محتملة؛ ليست صفحات parity |
| Exact normalized path matches | 0 | بنية `app/[locale]/.../page` تختلف عن Expo routes؛ لا يعادل الغياب نقصًا تلقائيًا |
| Rows requiring manual mapping | 246 | جميعها تحتاج قرار equivalent أو exception مبرر |

## مسارات Web UI المرئية في baseline

تغطي الصفحات الموجودة عائلات login/profile/cart/medicines/diagnostics/dashboard/health/mental-health/prescriptions/articles/orders/appointments/chat/family/home-care/consultations/settings/insurance. لا يكفي وجود عنوان عائلة للتدليل على اكتمال CTAs أو states أو payment/insurance contract أو accessibility أو parity مع Mobile.[1]

## فجوة مادية مؤكدة في الإثبات

كل Mobile route في `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv` يحمل:

```text
mapping_status=MANUAL_MAPPING_REQUIRED
visual_parity_status=NOT_REVIEWED
cta_parity_status=NOT_REVIEWED
scenario_parity_status=NOT_REVIEWED
contract_parity_status=NOT_REVIEWED
```

هذا ليس defect product مؤكدًا لكل row؛ إنه **فجوة في evidence/parity review** تمنع ادعاء أن الويب نسخة كاملة من تطبيق المريض.

## قرار التنفيذ

Agent 1 يجب أن ينفذ Wave A1.0 قبل أي claim parity:

1. يراجع كل PM screen ID مع route وvisual hierarchy وCTA وnavigation والحالات.
2. يربطها بصفحة Web محددة أو Web state/modal محدد أو `NATIVE_ONLY` مع سبب مقبول وبديل Web يحفظ هدف المريض.
3. يثبت exact backend/BFF contract وحالات unauth/owner/stranger/error/loading/empty/retry/cancel.
4. يثبت مصدر data الحقيقي أو يصنفها `BLOCKED_BY_BACKEND_CONTRACT`؛ لا يسمح بسعر أو stock أو insurance أو result أو mock success من الواجهة.
5. لا يغلق صفًا إلا مع visual/behavior/a11y/RTL evidence وcontract/runtime evidence المناسبة.

## حدود النتيجة

لا يوجد build أو browser/device test أو live API test في هذه المرحلة. التقرير static baseline analysis فقط.

## المراجع

[1]: `PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv`، `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv`، وlisting Web source archive في baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.
