# Local Auth Visual Findings — 2026-08-23

## Scope

تم فتح `http://127.0.0.1:3000/en/welcome` و`http://127.0.0.1:3000/en/login` في متصفح محلي دون تنفيذ أي mutation أو استخدام بيانات حقيقية.

## Observations

ظهر Welcome بتصميم داكن premium مع hero مركزي، شعار SVG، أزرار Create account وLog in وContinue as guest، تبديل لغة فعلي، وتبديل ثيم. ظهر Login ببطاقة فاتحة glass-like، hero Nabd Plus، حقلي identifier/password، password visibility، OTP action، forgot-password blocked honestly، وزر secure sign in.

شريط BETA العام الخاص ببيئة preview ظاهر أعلى الصفحتين. هذا متوقع في local preview لكنه يجب ألا يظهر في production build النهائي إلا إذا كان banner مقصوداً ومضبوطاً ببيئة التشغيل.

Social controls تعمل كحالة blocked صادقة، لكن تمثيلها المرئي الحالي يعتمد على حروف/رموز مختصرة (G/A/S/X وApple dot) وليس brand vector icons كاملة. يجب استبدالها بأيقونات SVG أصلية/مرخصة أو إبقاؤها خلف feature flag حتى تكتمل عقود OAuth.

## Result

Local render passed for Welcome and Login. الحكم البصري الكامل غير مغلق بعد: يلزم فتح Register وOTP، فحص Arabic RTL وباقي locales، والتحقق من mobile viewport وreduced-motion.

## Register and OTP visual pass

ظهر Register محلياً ببطاقة متسقة مع Login، الحقول Full name وPhone وEmail وPassword وConfirm password، checkbox للموافقة، وزر Create account. ظهر OTP محلياً بست خلايا مرقمة، زر Verify code، وtimer `00:59` لإعادة الإرسال.

الفجوات المرئية الثابتة: banner BETA العام في preview، وأيقونات social المختصرة بدلاً من vector brand marks كاملة. لم يتم اعتبار بيانات `patient@example.com` نجاحاً أو حساباً حقيقياً؛ هي query identifier للعرض المحلي فقط ولم تُرسل أي mutation.

## Arabic RTL pass

تم فتح `/ar/welcome` و`/ar/login` محلياً. النص العربي، اتجاه الصفحة، ترتيب الحقول، ومحاذاة أزرار الرحلة ظهرت من اليمين إلى اليسار بشكل صحيح، مع بقاء القشرة العامة وBETA preview كما في English. لم تظهر بيانات وهمية أو نجاحات مصطنعة. social glyphs المختصرة ما زالت ملاحظة تصميمية مفتوحة، وليست OAuth مفعلاً.
