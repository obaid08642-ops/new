# حزمة مراجعة وتسليم — نبض بلس Web App للمريض

**تاريخ اللقطة:** 20 أغسطس 2026.
**المستودع:** [obaid08642-ops/new — فرع `main`](https://github.com/obaid08642-ops/new)
**آخر التزام مرفوع وقت إعداد هذه الحزمة:** [`89adfa6`](https://github.com/obaid08642-ops/new/commit/89adfa6)
**النطاق:** Web App للمريض فقط. لا يشمل تحويل لوحة الإدارة أو تطبيق مزودي الخدمة إلى Web.

> **تصحيح مهم:** صورة المعاينة التي تظهر مع نقاط الحفظ هي معاينة تطويرية لتطبيق الويب الحالي، وليست عملية نشر Production ولا دليلاً على اكتمال التصميم. استخدمت كلمة «عام/منشور» سابقاً لوصف **قابلية الفهرسة SEO** للمسار، لا بمعنى أن الموقع تم نشره للمستخدمين. لم أنفذ عملية Publish؛ النشر لا يتم إلا من واجهة المشروع وبقراركم.

## 1. الحكم الصريح على التصميم الحالي

أنت محق: **الواجهة الحالية ليست بعد مطابقة مرئية لتصميم تطبيق الجوال المرجعي**. الموجود حالياً هو نواة ويب آمنة وقابلة للاختبار، تضم صفحات حقيقية وطبقة BFF وi18n وحالات خطأ/رفض، لكنه لا يحقق حتى الآن التكافؤ البصري أو تجربة التفاعل الخاصة بتطبيق React Native.

| البند | تطبيق الجوال المرجعي | Web App الحالي | قرار المراجعة |
|---|---|---|---|
| اللون الأساسي | تركوازي `#23B5CE` مع درجات `#1A9FB6` و`#DEF5F9` | يستخدم تركوازاً قريباً لكن بنظام بصري عام غير منقول بالكامل | يحتاج مواءمة tokens حرفياً |
| رأس الشاشة | رأس ملوّن غامر، زوايا سفلية دائرية، أيقونة إشعارات وملف، عنوان وسياق | رأس ويب أفقي عام للعلامة واللغة والدخول | يحتاج إعادة تصميم متجاوب، لا نسخة حرفية ضيقة |
| الصفحة الرئيسية | ترحيب ملوّن، شبكة وصول سريع 3×2، بطاقات دواء/صحة/موعد ذات أيقونات ملوّنة | صفحة تأسيس/تسويق عامة + لوحة روابط مقيدة أبسط | يحتاج تنفيذ شاشة Dashboard مرجعية كواجهة ويب فعلية |
| البطاقات | بطاقات كثيفة، أيقونات ذات خلفيات لونية، اتجاه RTL أصيل، أحجام ولمسات جوال | بطاقات عامة متشابهة بين المجالات | يحتاج مكتبة مكونات مطابقة للمرجع |
| الوضع الداكن | نظام `darkColors` صريح في المصدر | غير مكتمل كتكافؤ تجربة مع تطبيق الجوال | يحتاج قرار وتطبيق متسق بعد مراجعة المرجع |
| الحركات وحالات التحميل | انتقالات دخول خفيفة وPull-to-refresh وحالات داخل الشاشة | حالات تحميل/خطأ آمنة، لكن دون نفس لغة الحركة | يحتاج مواءمة حركة الويب وإعادة المحاولة |

**مصدر الحكم:** `nabd_plus_patient_app.zip`، خصوصاً `src/theme/colors.ts` و`app/(tabs)/index.tsx`. لا ينبغي اعتماد الشكل الحالي كتصميم نهائي أو إجراء نشر قبل إغلاق مرحلة التكافؤ البصري.

### خطة إصلاح التصميم التي يحتاجها المراجع اعتمادها

1. اعتماد **Design System ويب** من المصدر المحمول: الألوان، المسافات، الحدود، الزوايا، النصوص، الأيقونات، حالات الضوء/الداكن.
2. بناء `PatientAppShell` للويب: رأس متجاوب، تنقل سياقي، منطقة محتوى، وحل RTL/LTR لكل لغة.
3. إعادة بناء Dashboard أولاً من شاشة `app/(tabs)/index.tsx`، مع إبقاء أي بطاقة تعتمد عقداً غير مكتمل في حالة «غير متاح» صريحة بدلاً من بيانات وهمية.
4. نقل مكوّنات `Quick` و`Metric` و`FeatureCard` إلى مكونات ويب قابلة لإعادة الاستخدام، ثم تطبيقها على المواعيد والصيدلية والتشخيص والرعاية الصحية.
5. إجراء مقارنة مرئية على عرض هاتف وTablet وDesktop للعربية والإنجليزية، ثم مراجعة الوصولية والاختبارات قبل الانتقال إلى كل عائلة صفحات.

## 2. ما بُني فعلياً حتى الآن

| المجال | المنفذ والمثبت | الحدود المتعمدة |
|---|---|---|
| البنية | Next.js 16.3.1 App Router وTypeScript صارم وBFF خادمي | لا توكنات في `localStorage` أو HTML |
| الجلسة | JWT في cookies `httpOnly`، refresh واحد خادمي، إنهاء آمن عند الفشل | OTP معلق حتى يعيد Backend جلسة حقيقية |
| اللغات | `ar`, `en`, `ur`, `hi`, `bn`, `fil`؛ RTL للعربية والأردية فقط | لا ترجمة مصطنعة لبيانات API |
| القراءة الخاصة | طلبات، ملف صحي محدود، مواعيد، كتالوج، تشخيص، رعاية منزلية قائمة، عائلة، إشعارات، ملخص علامات حيوية، وصفات مختصرة، محادثات وصفية، تذكيرات | جميعها بلا تعديل أو رفع أو دفع أو إرسال حيث لا يوجد عقد مثبت |
| SEO/AEO | robots، sitemap، canonical، hreflang للغات الست، JSON-LD محافظ، favicon، manifest، `llms.txt` | المسارات الخاصة `noindex`؛ كتالوج الدواء المختلط ليس مفهرساً |
| الاختبارات | آخر تشغيل محلي: **47 ملف اختبار ناجح، 74 اختباراً ناجحاً، 23 اختبار Sandbox معزول افتراضياً** | فحوص Sandbox الحية تقرأ فقط ولا تغيّر بيانات الإنتاج |

## 3. المطلوب من فريق Backend والمبرمج

المواصفات التفصيلية ومعايير القبول موجودة في [`docs/backend-handoff-phase-5.md`](./backend-handoff-phase-5.md). هذه قائمة الإرسال المختصرة للمبرمج:

| الأولوية | الفجوة | المطلوب من Backend | ما يبقى مقفلاً في الويب إلى حين التسليم |
|---|---|---|---|
| حرجة | G-HOME-001 | `GET /home-care/bookings/{bookingId}` يطبق ملكية JWT ويعيد `404` للغريب | تفاصيل الرعاية المنزلية والتقارير والتتبع |
| حرجة | G-OTP-001 | `verify-otp` يعيد حزمة جلسة أو exchange token قصير العمر أحادي الاستخدام | دخول OTP وonboarding المرتبط به |
| حرجة | G-PROFILE-001 | DTO عرض لـ`/users/me/profile`: اسم عرض/صورة مؤقتة/لغة/بيانات هوية مسموحة | الهوية الشخصية الكاملة والإعدادات |
| عالية | G-FAMILY-001 | DTO أعضاء عائلة يتضمن `display_name` دون IDs أو permissions خام | أسماء أفراد العائلة وتفاصيل الأعضاء |
| عالية | G-DATA-004 | DTO متخصص يعدّ مزودي الخدمة المنشورين لكل تخصص | عدّ المزودين وواجهات الاستكشاف المشتقة |
| حرجة | G-SEO-002 | `GET /public/catalogue?entity_type=medicine` و`GET /public/catalogue/medicines/{slug}` مع `is_published` وslug | فهرسة تفاصيل الأدوية و`Drug` JSON-LD وsitemap للتفاصيل |
| حرجة | G-PRESCRIPTION-001 | تفاصيل وصفة مقيدة بالملكية، `404` للغريب، DTO محدود | تفاصيل وصفة، اسم/جرعة، إرسال للصيدلية، OCR، رفع، صرف |
| حرجة | G-CHAT-001 | تفاصيل محادثة ورسائل مقيدة بعضوية JWT، `404` لغير المشارك، pagination | فتح رسائل، إرسال، تسليم، تعليم قراءة، مرفقات، مكالمات |
| عالية | G-OAPI-001/002 | `servers` وBearer security وDTO/error schemas وقيود المعاملات | توليد عميل آمن ومراجعة تعاقدية كاملة |
| حرجة | G-FILE-001/G-RTC-001 | عقود رفع/قراءة موقعة، فحص MIME/حجم/حالة، وroom token قصير العمر | رفع ملفات، تقارير، WebRTC/LiveKit/المكالمات |

### حزمة يجب إرسالها للمراجع والمبرمج

| المادة | الغرض | من يرسلها |
|---|---|---|
| رابط المستودع والفرع `main` | تدقيق الشفرة وتاريخ التغييرات | مالك المشروع |
| `nabd_plus_patient_app.zip` أو رابط المصدر نفسه | مرجع UX/UI الفعلي وتدفقات الجوال | مالك المشروع |
| OpenAPI محدّث من Backend | مراجعة المسارات، DTOs، الحماية والأخطاء | Backend |
| وثائق `docs/backend-handoff-phase-5.md` و`docs/phase-3-gap-log.md` | قائمة الفجوات ومعايير قبولها | فريق الويب |
| بيانات Sandbox عبر قناة آمنة منفصلة | تشغيل اختبارات 200 و401 و404/إخفاء الوجود | Backend/مالك المشروع |
| لقطات/فيديو معتمد للشاشات النهائية في تطبيق الجوال | مطابقة دقيقة للخطوط والأيقونات والحركات | فريق التصميم/المالك |

> لا تُرسل كلمات مرور Sandbox أو tokens في GitHub issues أو commits أو ملفات مرفقة عامة. استخدموا قناة أسرار آمنة فقط.

## 4. أخطاء مؤكدة تم إصلاحها أو احتواؤها

| المشكلة | الإجراء المنفذ | التحقق |
|---|---|---|
| تطبيق الجوال استدعى `/care/appointments/mine` | التصحيح إلى `GET /care/appointments` | Sandbox وcontract test |
| تطبيق الجوال استدعى `/user/insurance` | التصحيح إلى `GET /users/me/insurance` | Sandbox وcontract test |
| refresh token لم يكن متسقاً | توحيد parser وتدوير cookies وتنظيف الجلسة عند الفشل | اختبارات BFF |
| احتمال BOLA/IDOR | صفحات خاصة عبر BFF فقط واختبارات ملكية المورد المتاح | Sandbox للطلبات والمواعيد وما يسمح به العقد |
| كتالوج مختلط | منع `Drug` وsitemap للتفاصيل وفرض `noindex` | اختبارات SSR/metadata |
| بيانات انتظار مواعيد ثابتة | حجب `queue_position/ahead_count/wait_time` | اختبار صفحة الموعد |
| تسرب حقول حساسة | allowlists واختبارات SSR تمنع token/ID/مرفقات/سعر حسب المجال | اختبارات وحدات وSSR |
| فهرسة الصفحات الخاصة | `X-Robots-Tag` وmetadata `noindex` | اختبار HTTP ووحدة |
| فهرسة اللغات ناقصة | توسيع hreflang إلى اللغات الست مع `x-default` | اختبار metadata وHTML فعلي |
| ازدحام رأس الهاتف | فصل العلامة عن إجراءات اللغة/الدخول وتمرير آمن للغات | تحقق بصري RTL/LTR |

## 5. قائمة التزامات GitHub الكاملة في نافذة العمل

القائمة التالية هي **جميع الالتزامات الـ64 الموجودة على `main` منذ 19 أغسطس 2026 19:20 UTC** وقت إعداد التقرير؛ تضم التزامات الويب، وبعض التزامات backend الموروثة في المستودع نفسه. يراجع المبرمج الالتزامات ذات الوصف `Checkpoint` أو `feat/fix/test/docs` المتعلقة بالويب، ولا يفترض أن كل التزامات backend نفذها فريق الويب.

| SHA | الوقت UTC | الرسالة |
|---|---|---|
| 89adfa6 | 2026-08-20 03:42 | docs(backend): define chat detail ownership contract |
| ebd7760 | 2026-08-20 03:40 | docs(backend): define prescription detail ownership contract |
| a110d23 | 2026-08-20 03:38 | feat(seo): harden public medicine details |
| 9da6d40 | 2026-08-20 03:30 | fix(seo): publish six-locale hreflang |
| 86e1475 | 2026-08-20 03:27 | docs(security): record response indexing policy |
| 82cdb30 | 2026-08-20 03:24 | feat(seo): add noindex response headers |
| be8ddea | 2026-08-20 03:21 | fix(ui): improve mobile language navigation |
| ca3b0ed | 2026-08-20 03:17 | docs(api): record discovery parameter mismatch |
| 2cd6093 | 2026-08-20 03:14 | fix(i18n): route manifest start through locale middleware |
| ca9775f | 2026-08-20 03:11 | test(security): prove allowlisted profile display |
| 78d7ba4 | 2026-08-20 03:06 | feat(seo): add public web manifest |
| 05f06a7 | 2026-08-20 03:02 | docs(backend): define specialty provider counts |
| b9119fa | 2026-08-20 03:00 | feat(seo): add public llms guidance |
| 8a79d89 | 2026-08-20 02:58 | test(security): verify specialty discovery coverage |
| c29a612 | 2026-08-20 02:42 | fix(seo): serve branded favicon |
| 8436394 | 2026-08-20 02:39 | docs(security): record full sandbox regression |
| e516ee1 | 2026-08-20 02:27 | test(security): guard vital summary reads |
| d4ce686 | 2026-08-20 02:24 | test(security): guard medication reminder reads |
| 66513b9 | 2026-08-20 02:21 | test(security): verify self-scoped patient reads |
| 08da1f0 | 2026-08-20 01:28 | merge: patient web six-locale delivery |
| c867e01 | 2026-08-20 01:26 | Checkpoint: PublicMedicines translated for ur/hi/bn/fil |
| 623cdb1 | 2026-08-20 01:23 | Checkpoint: private page translations for ur/hi/bn/fil |
| ea7f37b | 2026-08-20 01:15 | Checkpoint: six-locale routing, SEO, RTL/LTR and selector |
| dd385ac | 2026-08-20 00:56 | Checkpoint: security gate and deferred file/SSE/LiveKit contracts |
| 15a2b73 | 2026-08-20 00:54 | Checkpoint: profile SSR privacy boundary |
| 1206800 | 2026-08-20 00:50 | Checkpoint: default noindex policy for private layouts |
| fd61e12 | 2026-08-20 00:47 | Checkpoint: unified retry states without data leakage |
| cb894c9 | 2026-08-20 00:37 | Checkpoint: restore error/loading boundaries safely |
| a03d5ee | 2026-08-20 00:30 | merge: github/main reconciliation |
| cdd82ad | 2026-08-20 00:14 | Checkpoint: public catalogue backend contract and security guide |
| bd778aa | 2026-08-20 00:12 | Checkpoint: search measurement framework |
| f2f47e5 | 2026-08-20 00:10 | Checkpoint: mobile ASO governance playbook |
| 29d6e7c | 2026-08-20 00:08 | Checkpoint: RTL mobile login layout correction |
| f057533 | 2026-08-20 00:03 | Checkpoint: robots, sitemap, canonical, hreflang and JSON-LD |
| 7f1ccb1 | 2026-08-19 23:52 | Checkpoint: critical Backend gap handoff |
| ca70a60 | 2026-08-19 23:51 | Checkpoint: full paced read-only Sandbox gate |
| fee2719 | 2026-08-19 23:41 | Checkpoint: paced Sandbox contract runner |
| ec90629 | 2026-08-19 23:37 | Checkpoint: secure dashboard feature-link grid |
| aad2f23 | 2026-08-19 23:28 | Checkpoint: read-only medication reminders |
| c768063 | 2026-08-19 23:28 | Sync main: backend phase16–19 verified live |
| 2f51011 | 2026-08-19 23:21 | Checkpoint: read-only chat list metadata |
| de4d00d | 2026-08-19 23:13 | Checkpoint: read-only prescription list metadata |
| 8b37d1b | 2026-08-19 23:06 | docs: backend readiness verdict |
| 3a2a0db | 2026-08-19 23:06 | Checkpoint: read-only vital summary |
| 821435a | 2026-08-19 23:05 | docs: phase18 acceptance blockers |
| 2c7b506 | 2026-08-19 22:58 | Checkpoint: read-only notifications |
| 72f19e3 | 2026-08-19 22:51 | Checkpoint: read-only family list |
| 2448f85 | 2026-08-19 22:48 | docs: native build blockers |
| 0d0b3c5 | 2026-08-19 22:44 | Checkpoint: read-only home-care list |
| 5916a7d | 2026-08-19 22:36 | Checkpoint: diagnostics list/details privacy boundary |
| a02a04c | 2026-08-19 22:34 | docs: phase16 lifecycle evidence |
| 6519299 | 2026-08-19 22:34 | docs: lab report remediation candidate |
| 8124e1d | 2026-08-19 22:33 | fix: restore owned lab report access |
| 4052505 | 2026-08-19 22:26 | Checkpoint: read-only medicine catalogue/details |
| bc02b4e | 2026-08-19 22:26 | docs: consultation remediation candidate |
| fdaf728 | 2026-08-19 22:06 | Checkpoint: appointments list/details privacy boundary |
| c43ce0d | 2026-08-19 21:55 | Checkpoint: allowlisted medical profile fields |
| 6fc708c | 2026-08-19 21:45 | Checkpoint: refresh-token contract and session cleanup |
| 36b1d20 | 2026-08-19 21:39 | fix: cash consultation auto-confirmation |
| d097b1b | 2026-08-19 21:32 | docs: phase16 Sandbox candidate |
| 047b787 | 2026-08-19 21:31 | fix: hospital provider authorization normalization |
| 9c9cc60 | 2026-08-19 21:18 | feat: bind prescriptions to reviewed manual-medication flow |
| 369239b | 2026-08-19 19:31 | Initial project bootstrap |
| aab2ef7 | 2026-08-19 19:26 | Sync main: nursing authorization and prescription hardening |

## 6. مسار المراجعة المطلوب قبل اعتماد أي نشر

1. **مراجع Backend:** يراجع جميع فجوات القسم 3، ينفذ contracts، يحدث OpenAPI، ويرسل رابط sandbox/التغيير دون أسرار.
2. **مراجع Security:** يعيد اختبارات BOLA/IDOR بمالك وغريب، ويراجع منع التسرب و`noindex` ومسارات الملفات والمكالمات.
3. **مراجع UI/UX:** يعتمد screens مرجعية لتطبيق الجوال، ثم يراجع تنفيذ web responsive قبل إغلاق كل شاشة.
4. **مراجع QA:** يشغّل `pnpm check` و`pnpm test` و`pnpm build`، ثم `pnpm test:sandbox` بالدفعات المتباعدة بعد استلام العقود.
5. **مالك المشروع:** لا يضغط Publish قبل أن يوقّع المراجعون على الأمن، العقود، والتكافؤ البصري الأساسي.

## 7. قرار الحالة الحالي

**الحالة: غير جاهز للنشر كواجهة نهائية.** النواة الأمنية والقرائية موجودة ومختبرة، لكن توجد فجوات Backend حرجة، كما أن التكافؤ البصري مع تطبيق الجوال لم يبدأ بعد بالقدر المطلوب. الخطوة الصحيحة التالية هي اعتماد خطة تصميم الويب المرجعية أعلاه، ثم تنفيذها صفحةً صفحةً بالتوازي مع تسليم العقود الخلفية.
