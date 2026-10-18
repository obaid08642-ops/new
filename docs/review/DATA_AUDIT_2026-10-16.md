# Production data audit (review session, 2026-10-16)

**Source:** read-only export from production (server-ops run 38849057276, owner-approved). It covers:
- every medicine (20,990 records, 60 fields, plus 17 translated fields × 6 languages);
- insurance companies and networks;
- lab, radiology and nursing services;
- specialties;
- the CDN bucket key list.

No patient or account data was read. The checks are scripts run over **every** record, not samples.

Wrong-script test: a translated field counts as wrong when most of its letters are not in the language's script. That means Arabic letters for ar/ur, Devanagari for hi, Bengali for bn, and Latin for en/tl.

## 1. Medicines (20,990)

**Correct:**
- Every record is approved and public.
- No price is zero.
- No slug is repeated in any language.
- Every picture reference exists on the CDN. Picture counts: 9,477 have 1, 7,769 have 2, 1,993 have 3, 509 have 4, 1,242 have 5. The product page shows them all.
- The category tree is filled for all records except 391 that have no third level.

**Problems:**

| # | Finding | Records | Owner |
|---|---|---|---|
| M1 | **Category labels not translated.** `sub_sub_category` in ur, hi, bn and tl is the English text in 20,466 records (97.5%). `main_category` is English in 1,870 and `sub_category` in about 1,900. | ~20,500 | fix session (#1556) |
| M2 | **Medical texts in English inside ur/hi/bn.** `indications_uses` is not in the language's script in about 6,600 records per language. The same holds for `storage_conditions` (~1,950), `dosage_instructions` (~830) and `warnings_precautions` (600–1,000). | ~6,600 | fix session (#1556) |
| M3 | Product names in ur/hi/bn in Latin script: 2,419 / 1,719 / 2,770. Brand names in Latin are acceptable; generic words are not. | ~2,700 | fix session, rule first |
| M4 | Arabic fields with non-Arabic text: `description` 166, `indications_uses` 246, `sub_category` 167 (for example the sub-categories "Vitamins & Healthy Nutrition", "Bio Biloba … 60 Tablets", "Promotions", "Electrorush"). | ~400 | fix session |
| M5 | **Overlapping main categories.** 13 main categories, including: "الأدوية والعلاج" (2,454) next to "أدوية ومكملات غذائية" (121); "العناية الشخصية" next to "النظافة الشخصية والحماية" (234) and "العناية بالجسم والاستحمام" (78); "تجميل وعناية" (31) next to "المكياج والإكسسوارات"; "الصحة والعافية المتخصصة" holds 2 items. 63 third-level categories hold 2 items or fewer. | — | owner approves a merge map, then the fix session migrates |
| M6 | **Same Arabic name on several records:** 76 groups, 713 records (for example "لاميكتال 100 مجم، لعلاج الصرع - 30 قرص"). Merge or tell apart (pack size, maker). | 713 | fix session, admin review queue |
| M7 | **Active ingredient** is filled in 12.5% of all records. For the 2,575 medicines it is 76%; strength is 68%, form 77%. There are 1,323 spellings for 2,621 values, and 141 values are leaflet text. Equivalents (#1547) need a normalized ingredient. | 2,575 medicines | fix session (#1556) |
| M8 | **No barcode on any record (0%).** The barcode camera (owner decision 36) cannot match a product. | 20,990 | owner: is there a barcode source? |
| M9 | 92 records flagged `translation_conflict`. | 92 | fix session |
| M10 | 100 records priced above 5,000 SAR (for example Harvoni 47,139 SAR). They may be right; they need a check against the reference price. | 100 | admin review |
| M11 | Medical completeness of the 2,575 medicines: dosage 89%, indications 94%, warnings 82%, storage 81%, side effects 73%, package size 71%. | — | content (owner) |
| M12 | 794 prescription items, 701 of them `available_online`. This is fine only while checkout requires the prescription upload (owner rule). | 794 | verify in the live gate |

## 2. Service lists

| List | Rows | Finding |
|---|---|---|
| Insurance companies | 45 | 3 names repeated (تكافل الراجحي, الاتحاد للتأمين التعاوني, الخليجية العامة للتأمين). **Only 18 of 45 have classes (tiers).** Missing classes include Malath, Salama, GIG, Allianz SF, Chubb, Walaa/Liva, Al Jazira Takaful, Tokio Marine, Al Etihad, Gulf General, Cigna, Enaya, Al Rajhi Takaful, Al Sagr, GlobeMed, NextCare, MedVisa, Mednet. Two record shapes coexist (old `ar`/`en` and new `name_ar`/`name_en`). |
| Insurance networks | 357 | **59 networks point to a company id that does not exist.** Network names repeat across companies (Blue, Silver, Gold, Bronze), which is expected. |
| Insurance coverage rules | 0 | empty |
| Lab services | 152 | 21 names repeated (for example فصيلة الدم, HbA1c, OGTT, T3). Preparation text 50%, description 53%, fasting info 62%, turnaround 66%. |
| `lab_tests` (old) | 51 | a second, older lab list next to `lab_services`; one must be the source |
| Radiology services | 48 | 9 names repeated. Preparation 47%, description 64%. |
| Nursing services | 77 | **38 names repeated** (half the list). Preparation 46%. |
| Specialties | 51 | 11 names repeated; two record shapes (old/new). |
| All lists | — | **Arabic and English only.** None has ur, hi, bn or tl, against the six-language rule. |

## 3. What to do (no invented data)

1. **Fix session, one PR per item, migration scripts with a dry run first:**
   - M1/M2/M4 translations: machine translation flagged for review, never left in English;
   - M6 duplicates: merge, or mark distinct;
   - M7 ingredient normalization;
   - M9 the translation conflicts;
   - duplicate service rows: merge into one record and point bookings at it;
   - the 59 orphan insurance networks;
   - one lab list;
   - six languages for every service list.
2. **Owner:**
   - approve a merge map for the overlapping categories (M5);
   - say whether a barcode source exists (M8);
   - supply the classes of the 27 insurance companies without them, or approve taking them from each insurer's published network list.
3. **Admin review queue:** prices above 5,000 SAR, and ingredient values that cannot be parsed.
4. **Re-run this audit after the migrations.** The scripts are kept with the review session and re-run on the same export.
