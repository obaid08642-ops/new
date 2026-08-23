# Sandbox Nursing Live Findings — 2026-08-23

تم probe مباشر على `https://api.nabd.plus/api/v1`. تسجيل الدخول المباشر إلى `/auth/login` أعاد `201` للحسابين، لكن طلب `/nursing/visits` أعاد `401` لكليهما. السبب المحتمل المثبت من فرق المسار: هذا الاختبار استخدم login على backend مباشرة، بينما Web session flow يستخدم BFF login/session exchange ويضع httpOnly cookie؛ لم يتم استخراج أو طباعة token من backend.

لذلك لا تُعتبر نتيجة `401` دليلاً على ownership أو فشل عقد Nursing visits، ولا تُعتبر pass. يلزم إعادة الاختبار عبر Web BFF `/api/auth/login` وsession cookie، أو contract موثق يسمح باستخدام backend response بأمان. لم يتم إنشاء أو تعديل أي زيارة، ولم تُحفظ credentials أو tokens أو response bodies.
