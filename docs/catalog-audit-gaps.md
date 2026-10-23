# تدقيق الكتالوجات مقابل السوق — الفجوات والإضافات المقترحة

> المصدر: البيانات الحية (labs 69 / radio 40 / nursing 36 / pkgs 15) مقابل قوائم البرج/المختبر/دلتا ومعايير السوق.

## تحاليل — فجوات حرجة
| الخدمة الناقصة | الأولوية | ملاحظة |
|---|---|---|
| تحليل HIV | **P0** | كل المنافسين يقدمونه — غيابه فجوة سمعة |
| مسحة عنق الرحم Pap | P0 | أساسي لصحة المرأة |
| تحليل السائل المنوي | P1 | مطلوب لعيادات الخصوبة |
| Quantiferon-TB | P1 | بديل Mantoux الحديث |
| Progesterone | P1 | مكمل لهرمونات المرأة الموجودة |
| Hb Electrophoresis | P2 | فقر الدم المنجلي/المتوسطي (شائع بالسعودية) |

## تحاليل — تكرار يحتاج دمج (أدمن)
- `PKG_GENERAL` ⟷ `Comprehensive Health Package` / `PKG_DIABETES` ⟷ `Diabetes Care Package` / `PKG_HEART` ⟷ `Cardiac Package` — باقات مكررة بنفس المحتوى تقريباً.

## أشعة — فجوات
| الخدمة | الأولوية |
|---|---|
| HSG (أشعة الصبغة للرحم) | P1 |
| Barium (الباريوم) | P2 |
| Panoramic dental (بانوراما أسنان) | P1 — عيادات الأسنان تطلبها |
| PET-CT | P2 — مراكز قليلة فقط |

## تمريض — تكرار يحتاج دمج (أدمن)
- `Mother & Newborn` ⟷ `Newborn & Mother` / `IV Drip Therapy` ⟷ `IV Drip/Fluids` / `Post-Surgery` ⟷ `Post-Surgery Home Care` / `Wound Dressing` ⟷ `Advanced Wound`.

## التأمين — تدقيق السوق العميق
- القائمة الحية ~30 شركة بالفئات من الأدمن — الاحتياطي الآن **30** (25 شركة تأمين + 5 TPA موسومة).
- تحقق كل شركة مقابل سوق التأمين الصحي السعودي (CHI/SAMA): بوبا/التعاونية/ميدغلف (A/B/C صحيحة)/الراجحي/ولاء/ملاذ/أليانز/أكسا-GIG/سايكو/الدرع/الصقر/الأمانة/سلامة/اتحاد الخليج/CIG/بروج/ACIG/عناية/UCA/الأهلي/Chubb — كلها **مرخصة وحقيقية** ✅
- **TPA موسومة صراحة** (`kind:tpa`): GlobeMed/NextCare/Medivisa/MedNet/Cigna — مديرو مطالبات لا شركات تأمين، لكن المرضى يختارونهم كشبكة — الإبقاء عليهم موسومين هو الصح.
- **أُضيفت 4 كانت ناقصة**: الجزيرة تكافل / ساب تكافل / العالمية / الاتحاد ✅
- فئات بوبا/التعاونية (VIP/ذهبية/فضية/برونزية) وفئات ميدغلف (A/B/C) مطابقة للسوق ✅

---

## الحالة بتاريخ 2026-10-23 (بند بند)

| البند | الحالة | الدليل |
|---|---|---|
| HIV / Pap / السائل المنوي / Quantiferon-TB / Progesterone / Hb Electrophoresis | **موجودة** في بيانات البذر بأسعار وبأسماء بست لغات (كانت أُضيفت قبل هذا التدقيق؛ لا إضافة جديدة مطلوبة) | `backend/src/modules/catalogs/seed-data/labs.json` (`HIV Test`, `Pap Smear`, `Semen Analysis`, `Quantiferon-TB`, `Progesterone`, `Hb Electrophoresis`) والمحتوى `content/services-content.v1.json` |
| HSG / Barium / بانوراما أسنان / PET-CT | **موجودة** بنفس الشكل | `seed-data/radiology.json` (`HSG`, `Barium Study`, `Dental Panoramic`, `PET-CT Scan`) |
| دمج 3 باقات مكررة | **كُتب كهجرة مراجَعة، لم تُنفَّذ**: يُبقي الأقدم، ينقل كل المراجع، ولا يحذف أي صف (يوقفه ويضع `merged_into`) | `backend/scripts/migrations/2026-10-catalogue-merge-pairs.ts` + `content/catalog-merge-pairs.v1.json` + `catalog-merge-pairs.spec.ts` |
| دمج 4 أزواج تمريض | نفس الهجرة. **الزوج الأكثر قابلية للنقاش للمالك: `Wound Dressing` ⟷ `Advanced Wound & Diabetic Foot Care`** (قد يكونان خدمتين مختلفتين؛ يُحذف من `catalog-merge-pairs.v1.json` إن رفضه المالك) | نفس الملفات |
| الصفوف المكررة في بيانات البذر | أُزيلت من البذر (باقتان وثلاث خدمات تمريض) كي لا تُولد من جديد في قاعدة جديدة؛ الصفوف الموجودة في الإنتاج تُدمج بالهجرة وتبقى موقوفة فلا يعيد البذر إدخالها | `seed-data/labs.json`, `seed-data/nursing.json` |
| التأمين: 30 جهة (25 + 5 TPA)، 4 مضافة | **منجز** (الجزيرة تكافل، ساب تكافل، العالمية، الاتحاد موجودة في البذر)؛ وصف الـ TPA صُحّح (لم يعد يقول "شركة تأمين") وترجمات الوصف والفئات بست لغات أُضيفت | `seed-data/insurance.json` |
| ترجمة الكتالوجات بست لغات | **منجز على بيانات البذر** (الفجوات 2062 → 0) | `docs/catalogue/TRANSLATION_COVERAGE_2026-10-23.md` |

### ما بقي مفتوحاً ولماذا لم يُنفَّذ
- **أسعار 22 خدمة مضافة سابقاً** (13 تحليلاً و6 أشعة و3 تمريض في `services-content.v1.json` بعلامة `add`): تُدخل بـ`public_eligibility: false` و`needs_price: true`؛ لا يوجد سعر مرجعي في الكتالوج ولم يُخترع سعر. قرار المالك/المالية.
- **ترجمة أسماء الأدوية** (100 bn و80 hi و60 ur في `data/catalogue-input-01/untranslated.csv`): مؤجلة بقرار المالك G ولا يوجد ملف بذر للأدوية.
- **تشغيل الهجرات على الإنتاج**: `2026-10-catalogue-merge-pairs.ts` و`2026-10-catalogue-translations-fill.ts` (ومعها `2026-10-services-content.ts --force`) بانتظار موافقة المالك؛ كلها dry-run افتراضياً وترفض الإنتاج دون متغير تأكيد.
