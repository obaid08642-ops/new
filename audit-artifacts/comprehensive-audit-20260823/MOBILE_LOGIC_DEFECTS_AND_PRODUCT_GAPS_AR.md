# عيوب Mobile والنواقص المنطقية التي يجب ألا ينسخها Web

## النطاق

هذا التقرير يميز بين ثلاثة أشياء: عيب أو compromise مؤكد في Mobile، ملف alias أو stub لا يمثل شاشة وظيفية مستقلة، ونقص موثق في roadmap يعني أن Mobile نفسه ليس مصدر حالة نهائية مكتملة. الهدف هو بناء Web أفضل من السلوك الناقص، وليس نسخ العيب لتحقيق parity شكلي.

## عيوب أو compromises مؤكدة

| الدليل | الحالة | أثر Web |
|---|---|---|
| `app/_layout.tsx`، السطور 65–69 | عند فشل `/auth/guest` offline ينشئ Mobile مستخدماً محلياً `guest_user` مع token نصي `guest_token` | ممنوع تماماً. Web يجب أن يبقى unauthenticated أو يعرض offline shell بلا session/token مزيف، ولا يسمح بحجز أو طلب أو قراءة خاصة |
| `docs/KNOWN_LIMITATIONS.md`، السطر 8 | HttpClient لا يدعم WebSockets بعد | Web لا ينسخ realtime ناقصاً؛ يلزم reconnect/ack/failure contract قبل Chat أو call status |
| `docs/KNOWN_LIMITATIONS.md`، السطر 9 | Analytics يستخدم `ConsoleProvider` stub | Web لا يرسل PII أو analytics غير موثق؛ يلزم consent gate ومزوّد production أو تعطيل كامل |
| `docs/KNOWN_LIMITATIONS.md`، السطر 10 | Feature flags remote fetching غير مربوط فعلياً بالbackend | Web لا يفتح feature flag حساساً اعتماداً على static default وحده |
| `docs/SECURITY.md`، السطر 28 | IP في audit log موصوف كـPlaceholder للشبكة | Web لا يعلن audit trail كاملاً قبل تثبيت مصدر IP/proxy trust وتدقيق الخصوصية |
| `docs/FUTURE_ROADMAP.md`، السطور 38–48 | Pharmacy/Consultations/Diagnostics/Nursing/Payments/Insurance مدرجة Planned | يجب اعتبار بعض سلوك Mobile نية منتج أو prototype، لا contract نهائياً؛ Web يعتمد فقط على backend حي |

## ملفات alias أو stubs وليست features مستقلة

تم العثور على ملفات قصيرة جداً تحتاج mapping إلى الهدف الحقيقي ولا يجب عدّها شاشة مكتملة مستقلة: `settings/support-chat.tsx`، `pharmacy/product-search.tsx`، `family/index.tsx`، `emergency/index.tsx`، `profile/edit.tsx`، `nutrition/nutrition-plan.tsx`، إضافة إلى بعض ملفات family الفرعية ذات خمس سطور. هذه الملفات قد تكون redirects أو shells؛ يجب ربطها بالهدف النهائي وفحص الهدف، لا إنشاء Web route موازي لمجرد وجودها.

## نواقص Mobile الموثقة كمنتج

Mobile نفسه يعلن أن Design System لم يُطبق على كل legacy screens، وBottomSheet لا يدعم snap points متعددة، وOTP paste يحتاج workaround Android، وRedux Persist قد يصبح بطيئاً مع state كبيرة، وroot يحتوي technical debt وملفات generated. هذه ليست أسباباً لنسخ السلوك في Web؛ بل تُسجل كتحسينات UX/quality أو تُستبعد من parity الوظيفي إذا لم تؤثر على رحلة المريض.

## القاعدة المنطقية المعتمدة

عند تعارض Mobile مع الأمن أو صحة الرحلة أو العقد الحي، الأولوية هي: contract backend المنشور، سياسة الأمان، متطلبات رحلة المريض الطبية، ثم أفضل UX. Web يمكنه تحسين نقص Mobile، لكن يجب أن يسجل ذلك صراحةً كـ`Web completion beyond Mobile` مع سبب القاعدة والاختبار.

## بوابات مطلوبة لكل إصلاح

لا يُغلق أي نقص إلا بعد: إثبات method/path حي، DTO/parser محدود، ownership، unauth/owner/stranger، loading/empty/error/retry، idempotency للعمليات القابلة للتكرار، cleanup للموارد التجريبية، keyboard/RTL/accessibility، ثم full gate وcommit و`git ls-remote` مطابق.
