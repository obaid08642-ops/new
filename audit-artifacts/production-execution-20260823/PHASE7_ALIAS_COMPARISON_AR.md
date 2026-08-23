# Phase 7 — Mobile aliases مقابل Web

راجعت aliases الفعلية في Mobile. `settings/support-chat.tsx` يعيد التوجيه إلى `/support/chat`، و`pharmacy/product-search.tsx` إلى `/search`، و`family/index.tsx` إلى `/health/family-hub`، و`emergency/index.tsx` إلى `/emergency/sos`، و`profile/edit.tsx` إلى `/health/edit-profile`. كما أن `nutrition/nutrition-plan.tsx` يعيد التوجيه إلى `/nutrition/hub` لأن الخطط الأسبوعية غير persisted في API الحالي.

هذه الملفات ليست شاشات مستقلة أو implementations مكتملة؛ لذلك لا يجوز عدّها كميزات Mobile إضافية أو إنشاء Web routes موازية لمجرد وجود filenames. تُصنف كـaliases/redirects، بينما الوجهات الحقيقية تحتاج contract mapping مستقل. قاعدة Web الصحيحة هي عدم ادعاء Nutrition AI plan أو Support Chat أو Profile edit قبل وجود contract وواجهة وproof مناسبين.

الحالة: **Audit complete for sampled aliases; feature parity remains dependent on target-route contracts**.
