# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/reviewer-developer-handoff-2026-08-20.md`
- **Member SHA-256:** `ccf23b8761d648aa8f484e0574633f7e9e9eb8fda3f16885bbb1e0b4917af469`
- **Line count:** 239
- **Read range:** `1-239`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `67: | البنية | Next.js 16.3.1 App Router وTypeScript صارم وBFF خادمي | لا توكنات في `localStorage` أو HTML |`
- `80: | حرجة | G-HOME-001 | `GET /home-care/bookings/{bookingId}` يطبق ملكية JWT ويعيد `404` للغريب | تفاصيل الرعاية المنزلية والتقارير والتتبع |`
- `133: | 2cd6093 | 2026-08-20 03:14 | fix(i18n): route manifest start through locale middleware |`
- `146: | 623cdb1 | 2026-08-20 01:23 | Checkpoint: private page translations for ur/hi/bn/fil |`
- `151: | fd61e12 | 2026-08-20 00:47 | Checkpoint: unified retry states without data leakage |`
- `156: | f2f47e5 | 2026-08-20 00:10 | Checkpoint: mobile ASO governance playbook |`
- `157: | 29d6e7c | 2026-08-20 00:08 | Checkpoint: RTL mobile login layout correction |`
- `194: 3. **مراجع UI/UX:** يعتمد screens مرجعية لتطبيق الجوال، ثم يراجع تنفيذ web responsive قبل إغلاق كل شاشة.`
- `225: | تحقق HTTP | الصفحة العامة تعرض Open Graph/Twitter؛ `/en/login` يعيد `X-Robots-Tag: noindex, nofollow, noarchive`؛ الكتالوج المختلط يبقى `noindex`. |`
- `239: [2] [Google Search Central — Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions)`
### backend_consumers_or_contracts
- `80: | حرجة | G-HOME-001 | `GET /home-care/bookings/{bookingId}` يطبق ملكية JWT ويعيد `404` للغريب | تفاصيل الرعاية المنزلية والتقارير والتتبع |`
- `108: | تطبيق الجوال استدعى `/care/appointments/mine` | التصحيح إلى `GET /care/appointments` | Sandbox وcontract test |`
- `109: | تطبيق الجوال استدعى `/user/insurance` | التصحيح إلى `GET /users/me/insurance` | Sandbox وcontract test |`
### auth_ownership
- `16: | اللون الأساسي | تركوازي `#23B5CE` مع درجات `#1A9FB6` و`#DEF5F9` | يستخدم تركوازاً قريباً لكن بنظام بصري عام غير منقول بالكامل | يحتاج مواءمة tokens حرفياً |`
- `21: | الحركات وحالات التحميل | انتقالات دخول خفيفة وPull-to-refresh وحالات داخل الشاشة | حالات تحميل/خطأ آمنة، لكن دون نفس لغة الحركة | يحتاج مواءمة حركة الويب وإعادة المحاولة |`
- `29: **تحقق لوحة Sandbox:** نجح تسجيل الدخول بالحساب المعزول وانتقلت المعاينة إلى لوحة المريض المعاد تصميمها. لا يظهر access token في HTML. بقيت ملاحظة واجهة مفتوحة: شريط الرأس العام يعرض «دخول المريض» حتى داخل الجلسة، ويحتاج استبداله بإجراء حسا`
- `68: | الجلسة | JWT في cookies `httpOnly`، refresh واحد خادمي، إنهاء آمن عند الفشل | OTP معلق حتى يعيد Backend جلسة حقيقية |`
- `81: | حرجة | G-OTP-001 | `verify-otp` يعيد حزمة جلسة أو exchange token قصير العمر أحادي الاستخدام | دخول OTP وonboarding المرتبط به |`
- `83: | عالية | G-FAMILY-001 | DTO أعضاء عائلة يتضمن `display_name` دون IDs أو permissions خام | أسماء أفراد العائلة وتفاصيل الأعضاء |`
- `88: | عالية | G-OAPI-001/002 | `servers` وBearer security وDTO/error schemas وقيود المعاملات | توليد عميل آمن ومراجعة تعاقدية كاملة |`
- `89: | حرجة | G-FILE-001/G-RTC-001 | عقود رفع/قراءة موقعة، فحص MIME/حجم/حالة، وroom token قصير العمر | رفع ملفات، تقارير، WebRTC/LiveKit/المكالمات |`
- `102: > لا تُرسل كلمات مرور Sandbox أو tokens في GitHub issues أو commits أو ملفات مرفقة عامة. استخدموا قناة أسرار آمنة فقط.`
- `110: | refresh token لم يكن متسقاً | توحيد parser وتدوير cookies وتنظيف الجلسة عند الفشل | اختبارات BFF |`
- `114: | تسرب حقول حساسة | allowlists واختبارات SSR تمنع token/ID/مرفقات/سعر حسب المجال | اختبارات وحدات وSSR |`
- `125: | 89adfa6 | 2026-08-20 03:42 | docs(backend): define chat detail ownership contract |`
### state_transitions
- `88: | عالية | G-OAPI-001/002 | `servers` وBearer security وDTO/error schemas وقيود المعاملات | توليد عميل آمن ومراجعة تعاقدية كاملة |`
- `151: | fd61e12 | 2026-08-20 00:47 | Checkpoint: unified retry states without data leakage |`
- `152: | cb894c9 | 2026-08-20 00:37 | Checkpoint: restore error/loading boundaries safely |`
- `233: لم يُرفع أي تغيير جديد إلى GitHub `main` بعد ظهور سلسلة التزامات خارجية. رأس GitHub في وقت التحديث هو `9547349`، مبني فوق `6bfad478` الموسوم بـ`branch content authoritative`. نُشرت نسخة الويب المحققة بدلاً من ذلك إلى فرع المراجعة غير المدمر`
### payment_insurance_relevance
- `60: 4. نقل مكوّنات `Quick` و`Metric` و`FeatureCard` إلى مكونات ويب قابلة لإعادة الاستخدام، ثم تطبيقها على المواعيد والصيدلية والتشخيص والرعاية الصحية.`
- `109: | تطبيق الجوال استدعى `/user/insurance` | التصحيح إلى `GET /users/me/insurance` | Sandbox وcontract test |`
- `138: | 8a79d89 | 2026-08-20 02:58 | test(security): verify specialty discovery coverage |`
- `183: | 36b1d20 | 2026-08-19 21:39 | fix: cash consultation auto-confirmation |`
### error_empty_loading_retry_cancel
- `88: | عالية | G-OAPI-001/002 | `servers` وBearer security وDTO/error schemas وقيود المعاملات | توليد عميل آمن ومراجعة تعاقدية كاملة |`
- `151: | fd61e12 | 2026-08-20 00:47 | Checkpoint: unified retry states without data leakage |`
- `152: | cb894c9 | 2026-08-20 00:37 | Checkpoint: restore error/loading boundaries safely |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
