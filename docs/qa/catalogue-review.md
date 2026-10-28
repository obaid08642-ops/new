# Catalogue quality review (radiology, labs, nursing)

Source: read-only GET on production, `https://api.nabd.plus/api/v1/catalogs/{radiology,labs,nursing}`, 2026-10-28.
Counts returned: radiology 49, labs 152, nursing 77 (matches the request). No write was made.

How to read the tables: one row per group of items that describe the same service. "Item code" lists every code in the group. Codes that are binary garbage are shown as `<binary>`.

Cross-cutting issues (all three catalogues):
- **Translations:** `name_ur`, `name_hi`, `name_bn`, `name_tl` are empty on every row (48 radiology, 152 labs, 77 nursing). The website's six-language rule is not met for these services.
- **Pending and legacy rows are returned by the public endpoint.** Rows with `medical_review_status` `pending` or `null` are in the response (radiology 26, labs 32, nursing 41). Check that the website and apps filter them out; if not, patients see unreviewed services.
- **Duplicate services with different prices.** The same test is listed under 2 to 4 codes with different prices. Patients see different prices for the same service depending on the code.
- **Codes:** many rows use legacy codes, others use UUIDs, and some codes are duplicated. Pick one code per service.

Not real or not a nursing service (needs owner or clinical decision, nothing removed here):
- Nursing: `speech_therapy` (speech therapy is not nursing), `physiotherapy_session` and `elderly_mobility_rehab` (physiotherapy, not nursing).
- Labs: "Vitamin A" (`71388bc3-…`) and "Vitamin E" (`8a9cf5a7-…`) are not routine serum tests; confirm the lab offers them.
- No item was found with a literal test name (for example "test 1").

## Radiology (49 rows)

| Item code | Issue | Suggested fix |
|---|---|---|
| CXR, SXR, AXR, KXR | Pending legacy rows that duplicate approved XR_CHEST, XR_SPINE, XR_ABDOMEN, XR_KNEE. AXR 100 vs XR_ABDOMEN 95; KXR 95 vs XR_KNEE 85. | Retire the legacy codes. Keep one price per service. |
| USA, USP, USPR, UST | Pending legacy rows duplicating US_ABDOMEN, US_PREG, US_THYROID, and near-duplicating US_PELVIS_TV (USP 170 vs US_PELVIS_TV 200). USPR body part "obstetric" vs US_PREG "pelvis"; UST "thyroid" vs US_THYROID "neck". | Retire legacy codes. Merge USP into US_PELVIS_TV or rename so the two pelvic ultrasounds differ. Use one body-part value per service. |
| CTB, CTC | Pending legacy rows duplicating CT_BRAIN and CT_CHEST, with prices that differ (CTB 650 vs 450; CTC 720 vs 550). | Retire. Keep the approved price after confirming it with the centre. |
| CTAP | "CT Abdomen & Pelvis" (850) is a different procedure from CT_ABDOMEN "Abdomen CT with Contrast" (750). Both are listed. | Keep both only if the scan protocols differ, and say so in the name. Otherwise merge. |
| MRIB, MRIK | Pending legacy rows duplicating MRI_BRAIN (MRIB 1100 vs 900) and MRI_KNEE (MRIK 950 vs 800). | Retire; keep the approved price. |
| MRIS | "MRI Spine" (1200) vs MRI_LSPINE "Lumbar Spine MRI" (850): different regions, listed as one service. | Keep as separate services with clear names (cervical/thoracic vs lumbar), or retire the generic one. |
| MAMMO | Pending with no approved counterpart. Mammography is not the same as breast ultrasound. | Approve or remove after review. |
| HSG (3 rows) | The same code `HSG` appears three times, with three different English and Arabic names. | Keep one row: "Hysterosalpingography (HSG)", Arabic "تصوير الرحم بالصبغة (HSG)". |
| PANOREX, BARIUM, PETCT | Each code appears twice (one pending, one without status). | Keep one row per code. |
| DEXA | Arabic name contains Latin text ("قياس كثافة العظام DEXA"). | "قياس كثافة العظام (DEXA)". |
| PETCT | Arabic name "مسح PET-CT" mixes scripts; acceptable for an imaging abbreviation. | Optional. |
| ECHO | Arabic "إيكو القلب" is a transliteration; description missing. | "تخطيط صدى القلب (إيكو)". Add a description. |
| US_ABDOMEN, US_BREAST, MRI_BRAIN | Descriptions overclaim: "completely safe, no radiation" (US_ABDOMEN); "safe complement or alternative to mammogram" (US_BREAST, ultrasound is not a substitute for screening mammography); "Most accurate" (MRI_BRAIN). | Rewrite with a radiologist's review. |
| 17 pending legacy rows | No `description_en` or `description_ar`. | Remove the legacy rows (see above) or add descriptions. |

## Labs (152 rows)

| Item code | Issue | Suggested fix |
|---|---|---|
| CBC (x2), 5a3f91c7-… | Three rows: CBC pending 35, CBC approved 45 (old 60), 5a3f91c7 "Complete Blood Count (CBC)" 80 with no description. | One row, approved; price settled (45 or 80). |
| ESR (x2), d4566f2a | Two `ESR` codes: pending 25 and approved 40. The approved one is in category "infection". | One row, category "blood", one price. |
| ABO (x2), BGRP | ABO duplicated (30 and 30). BGRP "Blood Group + Rh Factor" (35) overlaps. | Merge ABO. Keep BGRP only if it is a different test. |
| FBS (x3), c9c21a45 | FBS pending 25, FBS approved 35 (old 50), c9c21a45 "Fasting Blood Sugar" 30 with no description. | One row, one price. |
| HbA1c (x4), HBA1C, 40d4dd4d | HbA1c pending 75, HbA1c approved 75, HBA1C "Glycated Hemoglobin" 75 (old 95), 40d4dd4d "Hemoglobin A1c" 90. | One row, one price. Keep the English name "HbA1c". |
| OGTT (x2) | Pending 110 and approved 110. | Retire the pending row. |
| TSH (x3) | TSH pending 85, TSH approved 80, 68f53648 "TSH" 90 with no description. | One row, one price. |
| T3 (x3), T4 (x3) | Three rows each, prices 75/75/85. Name "T3"/"T4" is ambiguous next to "Free T3 + Free T4" (T3T4, 140). | One row each, named "Total T3" and "Total T4"; one price. |
| Cortisol: COR (x2), CORTISOL | Three rows: 95, 95, and CORTISOL 120 (old 160). | One row, one price. |
| Prolactin: PRL (x2), PROLACTIN, 9e09edd5 | Four rows: 90, 90, 95 and 100 (9e09 filed under "fertility"). PROLACTIN Arabic "هرمون الحليب" is a literal translation. | One row. Arabic "برولاكتين". Category "hormones". |
| Vitamin D: VITD (x3) | VITD pending 140, VITD approved "Vitamin D (25-OH)" 130 (old 170), e29a86d3 "Vitamin D" 150. | One row, one price. |
| Vitamin B12: B12 (x3) | 95, 110, 120. | One row, one price. |
| Iron / Ferritin (FE x2, IRON, FERRITIN, 75ca5dd4) | "Iron + Ferritin" listed twice (110 and 110); "Ferritin" listed twice (100 and 90). 75ca5dd4 has Arabic "حديد Ferritin" (حديد means iron; ferritin is not iron). | Keep "Iron + Ferritin", "Iron + TIBC" and one "Ferritin". Arabic for ferritin: "فيريتين". |
| Lipid: LIP (x2), LIPID | Three rows at 95. Lipid components (HDL, LDL, Cholesterol, Triglycerides) are listed separately in "lipids". | One lipid profile row; keep components. |
| CKMB (x2) | Two rows, both 65. | One row. |
| Troponin: TRP (x2), TROPONIN | 120, 120, and "Troponin I" 140 (AR "التروبونين (إنزيم القلب)"). | One row, one price. |
| Kidney: KFT (x2), CREAT | Two rows named "Kidney Function" (75 each), and CREAT "Kidney Function (Creatinine + Urea)" 70. | Rename the two KFT rows as "Renal Function Panel"; keep CREAT as its own service. Retire the duplicate. |
| Liver: LFT (x2), ALT_AST, ALT, AST, ALP, Bilirubin | LFT duplicated (85, 85). "Liver Enzymes (ALT + AST)" overlaps with separate ALT and AST rows. | Retire the duplicate LFT. Keep the panel and the single tests with clear names. |
| Urine: UA (x2), URINE, 7d33f02a | UA "Urine Complete" 30 (x2). URINE "Complete Urine Analysis" 40 (old 55). 7d33f02a "Urinalysis" 40. Three different English names share the same Arabic "تحليل بول كامل". | One row. One price. Arabic name unique per row. |
| HIV (x3), hiv_test, 0838b40d | "HIV Test" pending, "HIV Test" approved (120), hiv_test with no status, 0838b40d "HIV Test" (Arabic "فحص HIV", 120). Two Arabic names. | One row, one Arabic name ("فحص فيروس نقص المناعة (HIV)"). |
| PAP (x2), SEMEN (x2), QFT (x2), PROG (x2), HBE (x2) | Each code appears as a pending row and as a second row with a snake_case code (pap_smea, semen_an, quantife, progeste, hb_elect). | Keep one row per test. |
| TRP, CKMB, FE, ESR, LFT, UA, ABO, COR, PRL, TSH, T3, T4 | Repeated across pending and approved rows (see above). | Covered above. |
| PSA (73) and PSA (f628b864) | Two PSA rows: 120 in "hormones" and 180 in "tumor_markers". | One row in "tumor_markers". |
| CA125, AFP | Filed under "infection". | Category "tumor_markers". |
| Magnesium (MAGNESIUM, bfbdde90), Calcium (CALCIUM, c8359850), Zinc (ZINC, f17624cc) | Each listed twice in different categories ("vitamins", "electrolytes", "minerals"). | One row per test in one category ("electrolytes" or "minerals"). |
| Testosterone (TESTO, 80fbde41) | "hormones" vs "fertility"; Arabic "هرمون الذكورة (Testosterone)" vs "تستوستيرون". | One row, category "hormones", Arabic "تستوستيرون". |
| Hepatitis B: HBSAG (90), e409b4cb "Hepatitis B" (110) | Two rows for hepatitis B; HBSAG is the surface antigen test. Hepatitis C: HCV "Hepatitis C Antibody" (90) and e0d9d76c "Hepatitis C" (130). | Keep one row per test and name it precisely (HBsAg, anti-HCV). Reconcile price. |
| Diabetes packages: PKG_DIABETES (149) and c2920aa5 (199) | Both named "Diabetes Care Package". | One package, one price. |
| Heart packages: PKG_HEART "Heart Health Package" (289) and 593eff7e "Cardiac Package" (289) | Overlapping packages. | Merge, or make the composition differ in the name. |
| Women packages: PKG_WOMEN (329) and e8d1fb4f "Women Hormones Package" (349) | Overlapping packages. | Confirm composition; rename. |
| eb951ad7 "Pregnancy Advanced Package" (459) | Components are not documented. | Add a description listing the tests. |
| 71 rows (mostly the uuid and snake_case rows) | No `description_en` or `description_ar`. | Add descriptions for the rows that stay. |

## Nursing (77 rows)

| Item code | Issue | Suggested fix |
|---|---|---|
| 5245e78d, ef35bff2 (Vital Signs Monitoring) | Two rows, both 100. The first is pending and in "basic_nursing"; the second is approved and in "vitals". | One row, category "vitals". |
| dc1526c4, b018287d (Blood Draw for Labs) | Two rows, both 120. Also "Blood Sample Collection" at home (70) is the same service. | Merge the three into one row with one price. |
| a183d390, 33214ef8 (Medical Injections IV/IM) | Two rows at 150. Overlaps intramuscular_injection (60) and intravenous_injection_cannula (80). | Keep the specific injection rows and retire the general one, or name the general one as a bundle. |
| 3057313b, 9156aa94, iv_drip_fluids_vitamins (IV Drip) | Three rows at 180. | One row. |
| db1b168d, afc52622 (Advanced Wound & Diabetic Foot Care) | Two rows at 250. Overlaps diabetic_foot_care (160) and wound_dressing (120). | One row. Keep the other services separate. |
| 26b4036a, 694c83a7 (Urinary Catheter Care) | Two rows at 200. Overlaps urinary_catheterization (140). | One row. Keep the catheterization row. |
| 93ad8b81, 22502800 (Tracheostomy Care) | Two rows at 300. | One row. |
| f216b61e, 46641867 (Home Oxygen Therapy) | Two rows at 250. Overlaps oxygen_therapy_setup (190). | One row. |
| a607ca33, 776da61d (Post-Surgery Care) | Two rows at 500. Overlaps post_surgery_home_care (200) with a different price. | One row. Settle the price. |
| e6b13211, b4ce607b (Elderly Companion & Care) | Two rows at 600. Overlaps elderly_daily_care (250) and elderly_overnight_care (350). | One row. |
| 0187542d, e3d89072 (Mother & Newborn Care) and newborn_mother_care (Newborn & Mother Care) | The same service with prices 450 and 220. | One row, one price. Arabic "حديثي الولادة" (not "حديث"). |
| 9d568f08, 9b2c1773 (Home ICU Care) | Two rows at 1200. One is pending. | One row, approved. |
| dialysis_home (x2) | The same code appears twice, both 450, one with no status. | One row. |
| lactation (x2) | The same code appears twice, both 180, one with no status. | One row. |
| speech_therapy | Speech therapy is not nursing. | Move to the therapy catalogue, or retire. |
| physiotherapy_session, elderly_mobility_rehab | Physiotherapy is not nursing. | Owner decides where physiotherapy lives. |
| 24 rows, codes `<binary>` (the rows named Intramuscular Injection, Intravenous Injection / Cannula, IV Drip / Fluids & Vitamins, Antibiotic IV Course, Wound Dressing, Bedsore Care, Diabetic Foot Care, Suture Removal, Urinary Catheterization, Feeding Tube Care, Stoma Care, Blood Sample Collection, Elderly Daily Care, Elderly Overnight Care, Post-Surgery Home Care, Newborn & Mother Care, Child Vaccination at Home, Physiotherapy Session, Elderly Mobility Rehab, Oxygen Therapy Setup, Palliative Care Visit, Medication Management Visit, Nebulization Session, Blood Pressure Follow-up Program) | The code field holds binary bytes, not text. Each row duplicates a named row with a readable code (for example "wound_dressing"). | Delete these rows once no booking references them. Check the references first. |
| Arabic "تغيير على الجروح" (wound_dressing) | Wording is not idiomatic. | "تغيير ضمادات الجروح". |
| Arabic "العناية بأنبوب التغذية (NG)" | Acceptable. | No change. |
| Missing translations | Listed in the cross-cutting section. | Add ur, hi, bn, tl. |

## What was checked

- Duplicate codes and duplicate English and Arabic names within each catalogue (automated, with a check of every row).
- Missing names and descriptions per language.
- Review status (pending and null rows).
- Category and modality per row (read by hand, against the service name).
- Price consistency between duplicate rows.
- Binary or corrupt code fields (nursing).

Not checked here: clinical accuracy of each description (a clinician should review the descriptions flagged above), and whether patient-facing screens hide pending rows (that needs the patient web check in part 3).
