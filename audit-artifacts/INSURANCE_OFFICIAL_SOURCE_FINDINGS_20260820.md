# Official-source findings — insurance catalog reconciliation

- Insurance Authority reports page: https://www.ia.gov.sa/en/reports
  - The portal publishes a Quarterly Insurance Sector Report for Q3 2025 and provides a direct PDF download.
- Saudi Exchange, Enaya notice (3 Dec 2025): https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-news/issuer-announcements/issuer-announcements-details/?anId=91866&anCat=1&cs=8311&locale=en
  - The notice says Enaya would merge into Salama, subject to stated conditions at that time. It is evidence of a merger process, not by itself proof that an inactive legacy record should be auto-deleted.
- Saudi Exchange, Gulf Union Alahlia profile (symbol 8120): https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziTR3NDIw8LAz83d2MXA0C3SydAl1c3Q0NvE30I4EKzBEKDMKcTQzMDPxN3H19LAzdTU31w8syU8v1wwkpK8hOMgUA-oskdg!!/?companySymbol=8120
  - The listed legal name is Gulf Union Alahlia Cooperative Insurance Co. and the profile states medical insurance activity.
- Saudi Re official site: https://saudire.net/
  - Saudi Re describes itself as a composite reinsurer regulated by the Saudi Arabian Insurance Authority. It must not be added to the patient-facing health insurer list merely because it appears in the old generic list.
- HAYAH official site: https://hayah.com/
  - The site describes UAE digital insurance; it is not evidence to map the legacy Saudi "Al Hayat" record into the Saudi public insurer catalog.

From visual review of the Insurance Authority Q3 2025 report PDF (`https://www.ia.gov.sa/SectorReports/Quarterly%20Insurance%20Sector%20Report%20for%203nd%20Quarter,%202025.pdf`):

| Evidence page | Finding |
|---|---|
| Pages 1-5 | The report is a sector-performance document; early pages show macro highlights such as health GWP growth and retention ratios, not a company roster or a company count. |
| Page 19 | The appendix lists gross written premiums and net written premiums by line of business only. It does not enumerate insurer names. |
| Page 20 | The appendix breaks GWP by client segment and line of business, not by insurer. |
| Page 21 | Key indicators are aggregated by line of business and total market only. |
| Page 22 | Definitions mention reinsurance in metric construction, but the report still does not provide a legal-entity list for insurers/reinsurers. |

Conclusion at this stage: the IA quarterly sector report is useful for market context, but not sufficient by itself to prove whether the public-facing insurer catalog should contain 30, 31, 34, or 36 company records.

Additional official source discovered:

| Source | Finding | URL |
|---|---|---|
| Insurance Authority complaints index | The Authority publishes monthly PDF complaint indices specifically submitted against insurance companies. The page lists files for July through February 2026 and late 2025; these PDFs may provide a practical, official roster of current public insurers, but must be read before they are treated as a complete licensing register. | https://www.ia.gov.sa/en/information-center/reports/complaint-kpi |

Direct July 2026 PDF listed by the Authority: `https://www.ia.gov.sa/SectorReports/Complaints%20Index%20submitted%20to%20the%20Insurance%20Authority%20in%20July%202026.pdf`.

## July 2026 complaints-index image extraction — tiles 1–2

The document was rendered at 1,654 × 12,480 pixels and split vertically into 12 overlapping tiles because the original page is unusually tall. Tile 1 contains the Authority introduction. Tile 2 begins the official health-insurance ranking and visibly identifies the following entities:

| Rank | Exact visible name | Catalog relationship |
|---:|---|---|
| 01 | Tawuniya / التعاونية | Live code `tawuniya` |
| 02 | AlSagr Insurance / الصقر للتأمين | Live code `al_sagr` |
| 03 | GIG Gulf Insurance Group / مجموعة الخليج للتأمين | Live code `gig_gulf`; distinct current entity from the separate legacy AXA record and must retain provenance. |

Source: Insurance Authority, July 2026 Complaints Index PDF, visual tiles 1–2. The remaining tiles must still be read in order before calculating the roster count.

## July 2026 complaints-index image extraction — tiles 3–4

The health-insurance ranking continues with the following exact visible brands. The rank is a complaint-rate rank only and is not being used as a licensing determination.

| Rank | Exact visible name | Live catalog code |
|---:|---|---|
| 04 | SAICO / سايكو | `saico` |
| 05 | ACIG / أسيج | `acig` |
| 06 | Mutakamela / متكاملة للتأمين | No current live record under this exact brand; needs entity/provenance review. |
| 07 | SALAMA / سلامة | `salama` |
| 08 | Cigna Healthcare / سيجنا | `cigna` |
| 09 | Al Jazira Takaful / الجزيرة تكافل | `aljazira_takaful` |
| 10 | Gulf General / الخليجية العامة | `gulf_general` |
| 11 | UCA / الشركة المتحدة للتأمين | `united_cooperative` |
| 12 | Walaa / ولاء | `walaa` |
| 13 | Malath / ملاذ | `malath` |
| 14 | Arabian Shield Insurance / الدرع العربي للتأمين | `arabian_shield` |
| 15 | Arabia AICC / العربية | `arabia_insurance` |

Source: Insurance Authority, July 2026 Complaints Index PDF, visual tiles 3–4. Tiles 5 onward remain to be read.

## July 2026 complaints-index image extraction — tiles 5–6

The health-insurance ranking is completed at rank 23; the document then begins a separate vehicle-insurance section. Therefore, this official July 2026 health-insurance complaint index visibly lists **23 companies**, not 30, 31, 34, or 36. It is a service/complaints roster and must not be substituted for the broader public catalog without a business decision.

| Rank | Exact visible name | Live catalog relationship |
|---:|---|---|
| 16 | Bupa / بوبا | `bupa` |
| 17 | Amana / أمانة | `amana` |
| 18 | Al-Etihad / الاتحاد | `al_etihad` |
| 19 | Gulf Union Al Ahlia Cooperative Insurance | Closest live code `gulf_union`; the current legal name needs provenance normalization. |
| 20 | MedGulf / ميدغلف | `medgulf` |
| 21 | Al Rajhi Takaful / تكافل الراجحي | `al_rajhi_takaful` |
| 22 | Saudi Enaya / عناية السعودية | No live record; July 2026 official complaint index shows it separately, so it requires an evidence-backed addition or a retired/superseded decision rather than omission by assumption. |
| 23 | UCA / United Cooperative Assurance | `united_cooperative` (same commercial group/brand is already represented at rank 11 under a different visible mark; entity deduplication remains required). |

The visible 23-company health roster includes 22 unique current-looking brands after the UCA duplication is accounted for. It confirms that at least `saudi_enaya` is a material discrepancy from the 30-record live public catalog, while `mutakamela` is another discrepancy that requires an exact legal-entity determination.

Source: Insurance Authority, July 2026 Complaints Index PDF, visual tiles 5–6.

## Official logo-source verification progress

| Code | Official company domain | Official logo asset URL | Collection result |
|---|---|---|---|
| `tawuniya` | `tawuniya.com` | `https://www.tawuniya.com/assets/tawuniya-logo-CchrLQkJ.svg` | Source was rendered successfully by the official site. Converted without semantic alteration to a 256px transparent lossless WebP; SHA-256 `e82845c5ba20dfb55d3344511371712aec338fe826a255d2b23348b1220bb066`. |
| `al_rajhi_takaful` | `alrajhitakaful.com` | `https://www.alrajhitakaful.com/assets/icons/header-logo.svg` | Source was rendered successfully by the official site. Converted without semantic alteration to a 256px transparent lossless WebP; SHA-256 `739a6e2376584db4d4f5f644eee21ce4f61782b6aece1c2a8577c9c501e185c8`. |
| `bupa` | `bupa.com.sa` | `https://www.bupa.com.sa/_next/static/media/logo.2128ec6e.svg` | The Bupa Arabia official page references this SVG in its header. Collection is next. |

No brand mark has been generated or sourced from a third-party logo directory. The two completed WebP assets are local candidate assets only and are not yet linked to a live database or published application.

## Buruj status finding

The official MEDGULF Saudi homepage states: “We are pleased to announce the merger of Buruj with MEDGULF.” This is first-party evidence that the `buruj` record must be reviewed for `catalog_status`, `retired_at`, and `superseded_by_company_id` before a separate Buruj icon is linked to the patient-facing catalog. The logo request is therefore being handled fail-closed: a historic/logo asset will not be published as a current separate insurer until the migration status is confirmed.

Source: https://www.medgulf.com.sa/home/

## Alalamiya / Liva status finding

The current official Liva Saudi site identifies the brand as “Liva Insurance | Previously Alalamiya.” The `alalamiya` and `liva` records in the 30-company live catalog must therefore not both be presented as independent active insurers without an approved `superseded_by_company_id` / retirement decision. Collection will target the current official Liva asset for a single active presentation only after the entity cleanup is approved.

Source: https://www.livainsurance.sa/en/home

## Wafa status finding

Search results identify Wafa as the Saudi Indian Company for Cooperative Insurance. A Saudi Central Bank notice states that its issuance/renewal activity was suspended in 2018, and a Saudi Exchange-linked result records court affirmation relating to liquidation; a 2022 report states that it was delisted. This is sufficient to keep `wafa` fail-closed and out of the current public-logo collection pending an explicit retired/superseded status in Backend. No Wafa logo has been collected or published.

Primary regulatory source: https://www.sama.gov.sa/en-US/MediaCenter/News/pages/news00024052018.aspx

## Al-Ahlia / Gulf Union status finding

The Saudi Exchange company profile previously reviewed identifies the current listed entity as **Gulf Union Alahlia Cooperative Insurance Co.** The standalone `al_ahlia` record should therefore remain unlinked to a separate current logo until Backend records the legal-entity relationship to `gulf_union` and assigns a reviewed supersession or merged status. No standalone Al-Ahlia logo has been collected or published.

## Cigna official-source candidate

The official Saudi Cigna site is `https://www.cignahealthcare.com.sa/en/`. Search results also identify the Cigna Group notice that it received a Saudi branch license in 2023. The Saudi-domain site is the only candidate source to be used for a Cigna logo; no third-party directory or global logo collection will be used.

## Allianz Saudi Fransi / Mutakamela status finding

Search results show the official Allianz completion notice for sale of its stake to ADNIC and identify a current-name change from **Allianz Saudi Fransi Cooperative Insurance** to **Mutakamela Insurance Company**. The legacy `allianz_sf` record must therefore not receive a current standalone Allianz logo. It requires a reviewed rebrand/alias or supersession relation to the current Mutakamela entity before any public display.

Official transaction source: https://www.allianz.com/en/mediacenter/news/media-releases/financials/240418-allianz-completes-transaction-to-sell-its-51-percent-stake-in-Allianz-Saudi-Fransi.html

## Chubb Arabia official-source verification

The Chubb Arabia official Saudi homepage identifies the company as licensed by the Insurance Authority and serves its header logo from `https://chubb.com.sa/wp-content/uploads/2025/08/logo-scaled.png`. This is the only logo source accepted for the `chubb_arabia` candidate.

Source: https://chubb.com.sa/

## Gulf General official-logo access finding

The Gulf General Cooperative Insurance official site identifies its header asset as `https://www.ggi-sa.com/assets/frontend/ggci/images/logo1.png`, but the host returns HTTP 403 to direct retrieval and its image element did not load a downloadable body in this review session. The record remains `pending_official_brand_source`; no third-party replacement is permitted.

Source: https://www.ggi-sa.com/en/

## Saudi Enaya reconciliation finding

Official Saudi Enaya and Saudi Exchange search results identify Saudi Enaya as a listed health-insurance specialist. Search results also report a 2025 Insurance Authority approval relating to a proposed/approved Salama–Saudi Enaya merger, while older sources describe a separate Amana transaction. The apparent timeline is not yet clean enough to create or activate a new public `saudi_enaya` record. It must be added only as a **pending-review, inactive historical/transition record** after a reviewer confirms the current legal identity and supersession path. No live catalogue mutation was performed.

Potential official sources: https://saudienaya.com/ and Saudi Exchange symbol 8311.

## Malath official-source access finding — 2026-08-20

تم تأكيد نطاق الشركة الرسمي من نتائج البحث: `https://www.malath.com.sa/`. تعذر فتح الموقع من بيئة التحقق الحالية عبر المتصفح (`ERR_CONNECTION_CLOSED`) وعبر طلب HTTPS للقراءة فقط (مهلة SSL). لذلك لم يُستخرج أي شعار، ولم يتغير `manifest.json`. تبقى `malath` بحالة `uncollected` و`pending_official_brand_source`، ولا يجوز استعمال أي شعار من نتيجة بحث أو شبكة اجتماعية أو مجمع شعارات بديلاً عن أصل صادر من نطاق الشركة أو من مادة هوية رسمية صادرة عنها.

## UCA official-source access finding — 2026-08-20

أثبت البحث نطاق UCA الرسمي `https://uca.com.sa/` وهو يعرّف الكيان باسم United Cooperative Assurance. تعذر فتحه في بيئة التحقق عبر المتصفح (`ERR_CONNECTION_CLOSED`) وبطلب HTTPS للقراءة فقط (مهلة SSL). لذلك لم يُستخرج شعار ولم يتغير `manifest.json`. تبقى `united_cooperative` بحالة `uncollected` إلى أن يتاح أصل من نطاق UCA أو مادة هوية رسمية مباشرة من الشركة؛ لا يجوز اعتماد نتيجة بحث أو متجر تطبيقات أو شبكة اجتماعية كمصدر للشعار.

## Al-Etihad official-source access finding — 2026-08-20

أثبت البحث نطاق الشركة الرسمي `https://www.aletihad.sa/` وكونه موقع Al-Etihad Co-operative Insurance Co. تعذر الوصول إليه من بيئة التحقق بالمتصفح ثم أصبح المتصفح غير متاح مؤقتاً بعد أخطاء اتصال متكررة، كما انتهى طلب HTTPS للقراءة فقط بمهلة SSL. لذلك لم يُستخرج شعار ولم يتغير `manifest.json`. تبقى `al_etihad` بحالة `uncollected` ولا يجوز اعتماد مواقع الدليل أو متجر التطبيقات أو الشبكات الاجتماعية كمصدر بديل للشعار.

## Wataniya official-source technical finding — 2026-08-20

أثبت البحث نطاق الشركة الرسمي `https://www.wataniya.com.sa/`. أمكن استرجاع صفحة الشركة الرسمية، وتبين أنها تطبيق OutSystems ديناميكي (`Wataniya_Home`) يحمّل الواجهة ومصادرها عبر JavaScript. لم يكشف HTML أو ملفات بداية التطبيق أو وحدة التحكم عن مسار ملف SVG/PNG/WebP خاص بالشعار. لذلك لا يكفي هذا الوصول لإثبات أصل شعار قابل للجمع؛ لم يُنزّل شعار ولم يتغير `manifest.json`. تبقى `wataniya` بحالة `uncollected` إلى أن يظهر أصل مباشر من نطاق الشركة أو مادة هوية رسمية صادرة منها.

## Saudi Enaya official-logo source verification — 2026-08-20

تم استرجاع الصفحة والحزمة البرمجية من نطاق عناية السعودية الرسمي `https://saudienaya.com/`. حزمة الموقع تشير صراحةً إلى شعار رأس الصفحة: `https://saudienaya.com/assets/img/logo.svg`. تم استرجاع الملف بنجاح؛ وهو SVG صالح (`image/svg+xml`، 14,568 بايت) وبصمة SHA-256 للمصدر `b8f70cb9579c19611173baae777c5a6d9afe075e883ea7509a44cf024da0b589`.

هذا يثبت **مصدر الشعار** فقط. يبقى سجل `saudi_enaya` في manifest غير نشط و`catalog_status: pending_review`، ولا يجوز عرضه كشركة مستقلة للمريض أو ربطه بـCDN قبل اعتماد علاقة الاندماج/الخلف قانونياً. يمكن إعداد WebP مرشح موثق للمراجع من هذا الأصل في حزمة منفصلة، من دون تغيير حالة الظهور العام.

## Gulf Union Alahlia official-source access finding — 2026-08-20

أثبت البحث نطاق الكيان الحالي المندمج `https://gulfunion.com.sa/` باسم Gulf Union Alahlia. أمكن استرجاع HTML من الموقع، لكن محاولة طلب حزمة الواجهة الرئيسية أعادت صفحة حماية/تحقق بدلاً من JavaScript التطبيق، فلم يمكن تعقب مورد الشعار من التطبيق آلياً. لا يكفي ظهور favicon أو مادة من متجر التطبيقات دليلاً على شعار الشركة. يبقى سجلا `gulf_union` و`al_ahlia` قيد مراجعة علاقة الكيان المندمج، ولا يُجمع أو ينشر شعار منفصل لأي منهما قبل استخراج أصل من نطاق الشركة أو استلام مادة هوية رسمية مباشرة.

## Alinma Tokio Marine historical-entity finding — 2026-08-20

أظهر ملف السوق السعودية للرمز 8312 اسم Alinma Tokio Marine Co. ووصفاً تاريخياً لنشاط التأمين، لكنه يتضمن آخر تحديث للشركة في 2017 وبيانات تداول غير نشطة. كما ظهرت نتائج بحث تشير إلى شطب أسهم الشركة في 2023؛ يلزم تثبيت الوضع القانوني والخلف قبل أي إعادة تفعيل. لا يُستخدم الشعار الظاهر في ملف السوق السعودية، رغم كونه متاحاً كصورة، لأنه ليس أصلاً من موقع الشركة؛ سياسة الكتالوج تقصر جمع الشعار على نطاق الشركة أو مادة هوية رسمية صادرة منها. يبقى `alinma_tokio_marine` معلّقاً وغير نشط إلى حين هذا التحقق.

## Gulf General official-logo source verification — 2026-08-20

تم استرجاع الأصل من مورد رسمي ظاهر في موقع الخليجية العامة: `https://www.ggi-sa.com/assets/frontend/ggci/images/logo1.png`. نجح الطلب مع مرجع صفحة الشركة الرسمي وأعاد PNG صالحاً (`image/png`، 3,677 بايت) ببصمة SHA-256 للمصدر `52f8e57fcdf86cc44c121f37906be564227cf8d09e3591ba4de59928c286c647`. هذا أصل شركة رسمي صالح للتحويل غير الدلالي إلى WebP مرشح؛ لا يزال النشر وربط `logo_url` من اختصاص المراجع بعد التحقق من الأصل المحول.

## Wafa retirement finding — 2026-08-20

تؤكد نتائج المصدر التنظيمي أن SAMA أوقفت وفا عن إصدار أو تجديد الوثائق في 2018، وأن السوق السعودية نشرت إعلاناً عن تأييد فتح إجراءات التصفية، كما نشرت هيئة السوق المالية إعلان إلغاء الإدراج في 2022. هذه أدلة كافية لإبقاء `wafa` سجلاً تاريخياً متقاعداً وغير ظاهر للعامة؛ لا يُجمع أو ينشر شعار وفا في مسار الشركات النشطة، ولا يحذف السجل من البيانات التاريخية. المصادر التنظيمية: `https://www.sama.gov.sa/en-US/MediaCenter/News/pages/news00024052018.aspx` و`https://cma.gov.sa/MediaCenter/NEWS/Pages/CMA_N_3089.aspx`.

## Buruj merger confirmation — 2026-08-20

تظهر الصفحة الرسمية لـMEDGULF النص الصريح: “We are pleased to announce the merger of Buruj with MEDGULF.” كما تبقي خدمات دعم عملاء Buruj ضمن نطاق MEDGULF. هذا تأكيد طرف أول يكفي لإبقاء `buruj` كسجل تاريخي/انتقالي مع علاقة خلف مراجعَة إلى `medgulf` بدلاً من جمع شعار بروج منفصل أو عرضه كشركة نشطة للعامة. المصدر: `https://www.medgulf.com.sa/home/`.
