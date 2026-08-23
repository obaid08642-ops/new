# تقرير فجوة Auth بين Mobile وWeb

## الحكم

الويب ليس مطابقاً حالياً لتطبيق Mobile في تجربة Auth. الموجود في Web هو LoginForm محدود داخل بطاقة بسيطة؛ أما Mobile فيبدأ بـWelcome/Auth shell مستقل ثم Login/Register/OTP بتخطيط وألوان وحالات أكثر غنى.

## Mobile surfaces المؤكدة

| السطح | الموجود في Mobile | حالة Web الحالية |
|---|---|---|
| Welcome | شعار مركزي، hero، animation دخول، theme toggle، language picker للغات الست، Guest/Register/Login | غير موجود كـWeb Auth surface مستقل |
| Login | بريد/هاتف، كلمة مرور، إظهار/إخفاء، forgot password، OTP، social Google/Apple/Snapchat/X، register link، back button | email/phone + password وOTP فقط؛ لا social/guest/welcome shell |
| Register | full name، phone، email، password، confirm password، terms/privacy checkbox، social buttons، OTP-first flow | BFF موجود، لكن لا توجد صفحة Web Register متكاملة |
| OTP | ست خانات منفصلة، resend timer، confirm، register/reset/guest branches | حقل code واحد داخل LoginForm؛ لا شاشة OTP مطابقة |
| Guest | Mobile يستدعي `/auth/guest` ويخزن token؛ هذا عيب منطقي وأمني لا ينبغي نسخه | غير موجود، وهذا صحيح أمنياً، لكن يحتاج UX صادقاً يوضح عدم الإتاحة |
| Social | Mobile يعرض Google/Apple/Snapchat/X، وbackend route `/auth/social-login` يثبت وجوده على مستوى route فقط | لا UI؛ OAuth client/config وcookie/session proof الكامل غير مثبت |

## نتائج العقود الحية

- `POST /auth/social-login` أعاد `400` مع body فارغ؛ هذا يثبت وجود route فقط، ولا يثبت DTO أو OAuth setup.
- `POST /auth/guest` لم يعط نتيجة موثوقة ضمن المهلة؛ لا يجوز تفعيله.
- `POST /auth/forgot-password` أعاد `404` بهذا المسار.
- `POST /auth/password/reset` و`/auth/send-otp` و`/auth/register` و`/auth/verify-otp` أعادت `400` مع body فارغ؛ هذا يثبت route-level validation فقط.

## الإصلاح المطلوب

يجب إعادة بناء Auth shell وLogin/Register/OTP بصرياً وفق Mobile، مع SVG/vector icons، RTL/LTR، اللغات الست، keyboard/focus/error/loading/reduced-motion، ثم ربط كل CTA بعقد مثبت. Social buttons تظهر بصرياً لكن تبقى disabled/blocked حتى توفير OAuth client configuration وDTO/session proof. Guest لا يظهر كـsuccessful login حتى يثبت backend عقداً آمناً يعتمد cookies ولا يعيد token.

هذا التقرير لا يعتبر feature implementation ولا يعلن parity؛ هو baseline صريح قبل التنفيذ.
