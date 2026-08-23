# Phase 9 — Design System وUX والحركة والإتاحة

## ما تم التحقق منه

الـglobal CSS يعرّف tokens للألوان والمساحات والحواف والظلال وeasing والحركة. انتقال دخول الصفحات `page-enter` لا يعمل إلا تحت `prefers-reduced-motion: no-preference`. كما أن focus-visible موحد بعلامة واضحة، وبطاقات الأسطح الرئيسية تستخدم transitions على transform وbox-shadow وborder-color، مع إلغاء التحويلات غير الضرورية في reduced motion.

تم التحقق من وجود قواعد reduced-motion في الأسطح الرئيسية: appointments، consultations، reminders، profile، prescriptions، orders، home-care، notifications، medicine catalog، family، health، dashboard، chat، diagnostics، articles، cart، mental health، وdetail surfaces.

## قرار التنفيذ

لا توجد فجوة CSS عالمية مثبتة تستدعي إعادة كتابة حالية. الحالة: **Baseline motion/accessibility guarded**. لا يزال يلزم visual regression فعلي على المتصفحات واللغات الست، ومراجعة keyboard/contrast/RTL لكل route، وإضافة skeleton/empty/error states حيث يثبت غيابها، قبل اعتبار Phase 9 مكتملة.
