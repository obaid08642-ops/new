# رسالة ومواصفات التسليم التقني للمبرمج (Developer Data Handover & Integration Spec)

**إلى:** الفريق الهندسي / مبرمج الباك إند والفرونت إند (Backend & Mobile/Frontend Engineers)  
**الموضوع:** مواصفات وتفاصيل كتالوج الأدوية والمنتجات المعتمد للإنتاج (Production Catalog v14)  
**حجم الكتالوج:** **`20,990`** صنفاً فيزيائياً حقيقياً مدققاً بنسبة 100%.

---

## 1. ملخص الملفات والبصمات الرقمية (Production Delivery Files)

* **مسار الملف الأساسي**: `/Users/ahmedobaid/Desktop/cleaned_catalog_v14_translated_4locales.jsonl`
* **مسار الملف المضغوط**: `/Users/ahmedobaid/Desktop/cleaned_catalog_v14_translated_4locales.jsonl.gz`
* **بصمة التحقق SHA-256 للملف الأساسي**:
  `f2475475c5df21382f49b20142799dcc2a33012622519b5a5dd6d05627b9973c`
* **صيغة الملف**: `JSON Lines (.jsonl)` — كل سطر يمثل كائن JSON كامل ومستقل لصنف واحد (20,990 سطر).

---

## 2. هيكل البيانات وعدد الحقول لكل صنف (Data Schema Specification)

يتكون كل صنف من **14 حقلاً رئيسياً (Root Fields)** + كائن ترجمات يحتوي على **6 لغات معتمدة**، وكل لغة بداخلها **17 حقلاً بنيوياً (Localized Fields)**.

### أ. الحقول الرئيسية في جذر الكائن (14 Root Fields):
| الحقل (Field) | النوع (Type) | الوصف والأهمية البرمجية |
| :--- | :--- | :--- |
| `productId` | `integer` | المعرف الفريد للصنف في النظام القديم/المصدر. |
| `sku` | `integer` | رقم التخزين والباركود الداخلي الفريد (Range: 10,000 → 1,000,000). |
| `barcode` | `string \| null` | الباركود التجاري العالمي (EAN/UPC) أو `null`. |
| `price` | `float` | السعر الحالي بالريال السعودي مقرب لخانتي عشريتين (مثال: `45.50`). |
| `old_price` | `float \| null` | السعر قبل الخصم (إن وجد) مقرب لخانتي عشريتين أو `null`. |
| `is_rx` | `boolean` | `true` إذا كان الصنف دواءً يحتاج وصفة طبية، `false` لمنتجات OTC والتجميل. |
| `available_online` | `boolean` | حالة التوفر للطلب أونلاين (`true`/`false`). |
| `active_ingredient` | `string \| null` | المادة الفعالة العلمية للدواء (مثال: `Paracetamol`). |
| `dosage_form` | `string \| null` | الشكل الصيدلاني (أقراص، كبسولات، شراب، كريم). |
| `strength` | `string \| null` | تركيز المادة الفعالة (مثال: `500 mg`، `10 mg/ml`). |
| `size_volume` | `string \| null` | حجم العبوة أو السعة (مثال: `100 ml`، `30 Tablets`). |
| `image_1` | `string \| null` | الرابط المباشر للصورة الأساسية للمنتج (CDN URL). |
| `image_2` | `string \| null` | الرابط المباشر للصورة الثانوية (إن وجدت). |
| `translations` | `object` | كائن يحتوي على ترجمات الصنف في 6 لغات معتمدة. |

---

### ب. كائن الترجمات واللغات الست (`translations`):
الكائن يحتوي دائماً على اللغات التالية كمفاتيح أساسية:
`translations`: `{ "ar": {...}, "en": {...}, "ur": {...}, "hi": {...}, "bn": {...}, "fil": {...} }`

#### الحقول داخل كل لغة (17 Localized Fields):
| الحقل (Field) | النوع (Type) | الوصف التقني |
| :--- | :--- | :--- |
| `name` | `string` | الاسم التجاري والتسويقي للمنتج بتلك اللغة. |
| `official_name` | `string \| null` | الاسم الرسمي/العلمي للمنتج. |
| `slug` | `string` | رابط فريد ونظيف 100% بدون معرفات عشوائية مناسب لـ SEO (مثال: `panadol-extra-500mg-24-tablets`). |
| `search_aliases` | `array[string]` | مصفوفة مرادفات ذكية (الاسم المقابل، المادة الفعالة، الماركة، كلمات الاستخدام). |
| `main_category` | `string` | الفئة الرئيسية الحقيقية للصنف (مستوى 1). |
| `sub_category` | `string` | الفئة الفرعية (مستوى 2). |
| `sub_sub_category`| `string \| null` | الفئة الفرعية الفرعية التخصصية (مستوى 3) — متوفرة لـ 98.13% من الأصناف. |
| `description` | `string \| null` | الوصف التسويقي والصيدلاني الشامل للمنتج. |
| `indications_uses` | `array[string] \| string \| null` | دواعي الاستعمال الطبية والفوائد. |
| `dosage_instructions`| `array[string] \| string \| null`| إرشادات الجرعة وطريقة التناول. |
| `warnings_precautions`| `array[string] \| string \| null`| التحذيرات والاحتياطات وموانع الاستعمال. |
| `side_effects` | `array[string] \| string \| null`| الآثار الجانبية المحتملة. |
| `storage_conditions`| `string \| null` | ظروف الحفظ والتخزين (درجة الحرارة والرطوبة). |
| `how_to_use` | `string \| null` | طريقة الاستخدام والتحضير. |
| `package_content_details`| `string \| null` | تفاصيل محتويات العبوة والملحقات. |
| `brand_benefits` | `string \| null` | فوائد ومميزات العلامة التجارية. |
| `more_information` | `null` | مفرغ وموزع بالكامل على الحقول الهيكلية. |

---

## 3. شجرة الفئات الرئيسية المعتمدة في الكتالوج (Main Taxonomy)

تم تطهير الكتالوج من كافة الفئات المؤقتة أو الترويجية، وأصبح مصنفاً تحت **13 فئة حقيقية**:
1. **المكياج والإكسسوارات** (`Makeup & Accessories`) — 4,157 صنفاً
2. **العناية الشخصية** (`Personal Care`) — 3,806 صنفاً
3. **العناية بالبشرة** (`Skin Care`) — 3,042 صنفاً
4. **العناية بالشعر** (`Hair Care`) — 2,907 أصناف
5. **الأدوية والعلاج** (`Medicine & Treatment`) — 2,454 صنفاً
6. **الأم والطفل** (`Mother & Baby`) — 1,829 صنفاً
7. **الفيتامينات والتغذية الصحية** (`Vitamins & Healthy Nutrition`) — 1,458 صنفاً
8. **الرعاية الصحية المنزلية والأجهزة الطبية** (`Home Health Care & Medical Devices`) — 871 صنفاً
9. **النظافة الشخصية والحماية** (`Personal Hygiene & Protection`) — 234 صنفاً
10. **أدوية ومكملات غذائية متخصصة** (`Medications & Supplements`) — 121 صنفاً
11. **العناية بالجسم والاستحمام** (`Bath & Body Care`) — 78 صنفاً
12. **تجميل وعناية تخصصية** (`Specialized Beauty & Care`) — 31 صنفاً
13. **الصحة والعافية** (`Specialized Wellness`) — صنفان

---

## 4. إرشادات الربط وقواعد البيانات (Database Seeding & Indexing Rules)

### أ. في قاعدة البيانات (PostgreSQL / MongoDB / MySQL):
* إنشاء Unique Index على: `sku` و `translations.{lang}.slug`.
* إنشاء Index على: `barcode`, `is_rx`, `available_online`, `translations.{lang}.main_category`.

### ب. في محرك البحث اللحظي (Typesense / Meilisearch / Elasticsearch):
* **حقول البحث الموزونة (Searchable Fields)**:
  1. `translations.{lang}.name` (Weight: 10)
  2. `translations.{lang}.search_aliases` (Weight: 9)
  3. `active_ingredient` (Weight: 8)
  4. `barcode` & `sku` (Weight: 8)
  5. `brand` (Weight: 7)
* تفعيل التسامح مع الأخطاء الإملائية (Typo Tolerance) ومطابقة الحروف العربية.

### ج. في كود واجهات الويب (Frontend SEO / Schema.org):
* استخدام `translations.{lang}.slug` في بناء مسار المنتج: `/{lang}/p/{slug}`.
* تضمين `Product` + `MedicalDrug` JSON-LD Schema وربط `search_aliases` بـ `alternateName`.
