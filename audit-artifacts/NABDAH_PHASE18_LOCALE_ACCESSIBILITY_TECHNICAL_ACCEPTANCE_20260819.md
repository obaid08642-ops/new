# منصة نبض — Phase 18: قبول تقني محدود للغات والإتاحة وتجربة الاستخدام

**التاريخ:** 2026-08-19
**الفرع:** `manus/on-live-reconciliation`
**الحكم:** **TECHNICAL PASS جزئي / HUMAN & DEVICE ACCEPTANCE BLOCKED.** لا تساوي اكتمال مفاتيح الترجمة أو unit tests مراجعة لغوية طبية أو قبولاً بصرياً على جهاز.

## نطاق التحقق التقني

| المجال | التحقق المنفذ | النتيجة |
|---|---|---|
| Provider six locales | النوع المصدري يعلن `ar`, `en`, `ur`, `hi`, `bn`, `fil` | PASS |
| Provider static UI pairs | 2,813 زوج Arabic/English في resolver؛ كل زوج مكتمل لـUR/HI/BN/FIL | PASS |
| Provider dynamic templates | 82 قالباً ديناميكياً؛ كل قالب مكتمل لـUR/HI/BN/FIL مع placeholders | PASS |
| اتجاه الواجهة | `LangProvider` يجعل `I18nManager.forceRTL(true)` للعربية فقط؛ `isRTL` يساوي `lang === 'ar'` | PASS مصدرّي |
| ربط الترجمات | 50 ملفاً يستدعي pair resolver و27 ملفاً يستدعي template resolver؛ بوابة Provider تؤكد routing لكل النصوص/القوالب المزدوجة | PASS تقني |
| Provider regression | 30/30 اختباراً، وتشمل assertions six-locale key completeness وArabic-only RTL وaccessibility/feedback | PASS |
| Patient locale/accessibility | 22 suite / 56 test، تشمل `bottomNavLocale` و`ui-accessibility`، وTypeScript typecheck | PASS تقني محدود |

## الأدلة والحدود

يشير المصدر صراحة إلى أن مراجعة اللغة البشرية لازمة قبل إصدار المتاجر. كما أن fallback في `translateProviderPair` و`translateProviderTemplate` يعيد الإنجليزية عند عدم تطابق key runtime؛ اكتمال catalog الحالي لا يثبت أن كل string مستقبلي أو خطأ API أو محتوى ديناميكي سيحصل على ترجمة مناسبة. لا يعالج هذا الفحص صحة المصطلحات السريرية أو المالية أو القانونية أو قابلية القراءة.

لم يجر اختبار device-native للـscreen reader أو focus order أو contrast أو touch targets أو line wrapping أو fonts أو dark mode أو orientation أو RTL navigation؛ Phase 17 نفسه محجوب لغياب artifacts الموقعة والأجهزة. لذلك لا يوثق هذا المستند screenshots أو فيديو أو sign-off لأي لغة.

## موانع القبول البشري النهائي

| المطلوب | المالك/المراجع | سبب الحجب |
|---|---|---|
| مراجعة AR | مراجع عربي طبي/قانوني/مالي | لا sign-off بشري أو جهاز RTL |
| مراجعة EN/UR/HI/BN/FIL | مراجعون بشريون مؤهلون لكل لغة | لا sign-off أو تحقق دلالي للقوالب والأخطاء |
| critical-screen visual pass | QA/Design | لا builds موقعة أو device farm أو هاتفان حقيقيان |
| Accessibility pass | QA accessibility | لا screen reader/focus/contrast/touch evidence على native runtime |
| API/push/error copy | Product/QA | لا E2E حي مكتمل ولا notification fixtures مملوكة |

## معيار الإغلاق المتبقي

يلزم لكل لغة قبول بشري موثق للشاشات الحرجة، مع قائمة truncation/semantic/design fixes وإعادة اختبار. يجب أن تمر العربية في RTL فقط، وتبقى EN/UR/HI/BN/FIL في LTR، وأن يختبر قارئ الشاشة والفوكس والتباين وأهداف اللمس والمظهرين الفاتح/الداكن على devices موقعة. إلى أن يتحقق ذلك، لا يمكن ترقية Phase 18 إلى PASS كامل أو استخدامه لدعم حكم GO.

## References

[1]: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md` "Phase 18 ومعيار الخروج"
[2]: `../../nabdah_execution/provider/src/i18n/providerTextTranslations.ts` "resolver وأزواج النصوص وقوالبها"
[3]: `../../nabdah_execution/provider/src/context/index.tsx` "اختيار locale وArabic-only RTL"
[4]: `../../nabdah_execution/provider/provider-app.contracts.test.js` "اختبارات Provider contracts"
[5]: `../../nabdah_execution/patient/src/components/__tests__/bottomNavLocale.test.ts` "اختبارات locale للـPatient"
[6]: `../../nabdah_execution/patient/src/components/__tests__/ui-accessibility.test.ts` "اختبارات accessibility للـPatient"
