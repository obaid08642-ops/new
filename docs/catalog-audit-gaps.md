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

## التأمين
- القائمة الحية ~30 شركة بالفئات من الأدمن — الاحتياطي 26. أي شركة جديدة تُضاف من صفحة `insurance-companies` تظهر فوراً عبر `/catalogs/insurance`.
