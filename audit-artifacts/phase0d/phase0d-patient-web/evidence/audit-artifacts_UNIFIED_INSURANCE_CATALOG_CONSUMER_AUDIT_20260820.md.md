# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/UNIFIED_INSURANCE_CATALOG_CONSUMER_AUDIT_20260820.md`
- **Member SHA-256:** `1f5ab681048827c4d44d678204aa2b62985b2aef42f033d4b52aef60d62500f4`
- **Line count:** 104
- **Read range:** `1-104`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `46: | إعدادات تأمين الطبيب | الشاشة المشتركة نفسها | أصلح؛ حُوّل route الطبيب إلى `SharedInsuranceConfigScreen` وحُذف مكوّن الطبيب المحلي الثابت. |`
- `56: صفحة إدارة الشركات `admin/src/pages/admin/insurance-companies.tsx` تستدعي `GET /insurance/companies/all`، وتدير الشركات والفئات عبر `POST/PATCH/DELETE` الخاصة بعقد Backend، وتعرض الشعار وحالة الكتالوج وعلاقة الخلف من الحقول الخادمية. لا تحت`
- `102: [4]: `provider_admin_insurance_screen_source_classification_20260820.txt` "تصنيف شاشات Provider وAdmin"`
- `103: [5]: `patient_insurance_screen_source_classification_20260820.txt` "تصنيف شاشات Patient"`
### backend_consumers_or_contracts
- `8: > مصدر الشركات والفئات التشغيلي الوحيد هو Backend: `GET /insurance/companies` ثم `GET /insurance/companies/:id/networks`. لا يجوز للواجهة تركيب fallback محلي عند تعذر المصدر؛ تعرض حالة عدم توفر أو قائمة فارغة آمنة. يحمل رد الشركة `logo_url``
- `26: | استكشاف الاستشارات وفلتر التأمين | `GET /insurance/companies` ثم شبكات الشركة المحددة | أصلح؛ أزيل قاموس `saudiInsurances` المحلي ومطابقة الأسماء الهشة. الفلترة تعتمد معرّف الشركة و`insurance_plans` إن كانت الفئة محددة. |`
- `30: | إضافة بوليصة تأمين | `GET /insurance/companies` | كان مربوطاً؛ لا توجد قائمة محلية. |`
- `33: تم حذف `patient/src/constants/insurance.ts` بعد تحقق عدم وجود أي مستورد له؛ لذلك لم يعد الملف القديم مصدراً ثانياً يمكن أن تعود إليه الشاشات مستقبلاً.`
- `56: صفحة إدارة الشركات `admin/src/pages/admin/insurance-companies.tsx` تستدعي `GET /insurance/companies/all`، وتدير الشركات والفئات عبر `POST/PATCH/DELETE` الخاصة بعقد Backend، وتعرض الشعار وحالة الكتالوج وعلاقة الخلف من الحقول الخادمية. لا تحت`
### auth_ownership
- `5: **النطاق:** تطبيق Patient، تطبيق Provider، لوحة Admin، وعقد Backend الخاص بشركات التأمين والشبكات.`
- `12: تم البحث في ملفات TypeScript/JavaScript المصدرية فقط عبر `patient/app` و`patient/src` و`provider/src` و`admin/src`، مع استبعاد حزم البناء و`node_modules` وملفات الترجمة. شمل البحث كلمات العقد، أسماء الشركات، ثوابت الفئات، ومسارات API. ثم فُ`
- `54: ## 4. تغطية لوحة Admin`
- `56: صفحة إدارة الشركات `admin/src/pages/admin/insurance-companies.tsx` تستدعي `GET /insurance/companies/all`، وتدير الشركات والفئات عبر `POST/PATCH/DELETE` الخاصة بعقد Backend، وتعرض الشعار وحالة الكتالوج وعلاقة الخلف من الحقول الخادمية. لا تحت`
- `82: | `web_admin_dashboard.zip` | `3b4c25c5d590751d69802a9ed13cf749436cc5b787cd77e1ed1355a9ac258ac3` | ZIP سليم (68 ملفاً) وخالٍ من `node_modules` وملفات الأسرار ومخرجات البناء. |`
- `102: [4]: `provider_admin_insurance_screen_source_classification_20260820.txt` "تصنيف شاشات Provider وAdmin"`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `8: > مصدر الشركات والفئات التشغيلي الوحيد هو Backend: `GET /insurance/companies` ثم `GET /insurance/companies/:id/networks`. لا يجوز للواجهة تركيب fallback محلي عند تعذر المصدر؛ تعرض حالة عدم توفر أو قائمة فارغة آمنة. يحمل رد الشركة `logo_url``
- `26: | استكشاف الاستشارات وفلتر التأمين | `GET /insurance/companies` ثم شبكات الشركة المحددة | أصلح؛ أزيل قاموس `saudiInsurances` المحلي ومطابقة الأسماء الهشة. الفلترة تعتمد معرّف الشركة و`insurance_plans` إن كانت الفئة محددة. |`
- `30: | إضافة بوليصة تأمين | `GET /insurance/companies` | كان مربوطاً؛ لا توجد قائمة محلية. |`
- `33: تم حذف `patient/src/constants/insurance.ts` بعد تحقق عدم وجود أي مستورد له؛ لذلك لم يعد الملف القديم مصدراً ثانياً يمكن أن تعود إليه الشاشات مستقبلاً.`
- `39: | تسجيل الطبيب | `useInsuranceCatalog()` من عميل Backend الموحد | مرتبط ومختبر. |`
- `40: | تسجيل المختبر | `useInsuranceCatalog()` | مرتبط ومختبر. |`
- `41: | تسجيل الأشعة | `useInsuranceCatalog()` | مرتبط ومختبر. |`
- `42: | تسجيل الصيدلية | `useInsuranceCatalog()` | مرتبط ومختبر. |`
- `43: | تسجيل التمريض | `useInsuranceCatalog()` | مرتبط ومختبر. |`
- `44: | تسجيل المنشأة/المستشفى | `useInsuranceCatalog()` | مرتبط ومختبر. |`
- `45: | لوحة الإعدادات المشتركة للمزودين | `useInsuranceCatalog()` + `/provider-onboarding/my-profile` + `/provider/settings/delta` | مرتبط؛ يسترجع القبول والفئات ونسب التحمل الخادمية، ويرسل delta تدقيقياً، ويعرض `logo_url` الرسمي المتاح لكل شركة`
- `46: | إعدادات تأمين الطبيب | الشاشة المشتركة نفسها | أصلح؛ حُوّل route الطبيب إلى `SharedInsuranceConfigScreen` وحُذف مكوّن الطبيب المحلي الثابت. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
