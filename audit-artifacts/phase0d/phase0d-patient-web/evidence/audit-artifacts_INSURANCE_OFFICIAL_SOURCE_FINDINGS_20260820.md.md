# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/INSURANCE_OFFICIAL_SOURCE_FINDINGS_20260820.md`
- **Member SHA-256:** `63640218478c95ac2bf870c12d8ae422e62d593ac38a2a97987a25e34a34d4b6`
- **Line count:** 186
- **Read range:** `1-186`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: - Insurance Authority reports page: https://www.ia.gov.sa/en/reports`
- `4: - The portal publishes a Quarterly Insurance Sector Report for Q3 2025 and provides a direct PDF download.`
- `16: | Evidence page | Finding |`
- `18: | Pages 1-5 | The report is a sector-performance document; early pages show macro highlights such as health GWP growth and retention ratios, not a company roster or a company count. |`
- `19: | Page 19 | The appendix lists gross written premiums and net written premiums by line of business only. It does not enumerate insurer names. |`
- `20: | Page 20 | The appendix breaks GWP by client segment and line of business, not by insurer. |`
- `21: | Page 21 | Key indicators are aggregated by line of business and total market only. |`
- `22: | Page 22 | Definitions mention reinsurance in metric construction, but the report still does not provide a legal-entity list for insurers/reinsurers. |`
- `30: | Insurance Authority complaints index | The Authority publishes monthly PDF complaint indices specifically submitted against insurance companies. The page lists files for July through February 2026 and late 2025; these PDFs may provide a p`
- `32: Direct July 2026 PDF listed by the Authority: `https://www.ia.gov.sa/SectorReports/Complaints%20Index%20submitted%20to%20the%20Insurance%20Authority%20in%20July%202026.pdf`.`
- `36: The document was rendered at 1,654 × 12,480 pixels and split vertically into 12 overlapping tiles because the original page is unusually tall. Tile 1 contains the Authority introduction. Tile 2 begins the official health-insurance ranking a`
- `92: | `bupa` | `bupa.com.sa` | `https://www.bupa.com.sa/_next/static/media/logo.2128ec6e.svg` | The Bupa Arabia official page references this SVG in its header. Collection is next. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `116: The Saudi Exchange company profile previously reviewed identifies the current listed entity as **Gulf Union Alahlia Cooperative Insurance Co.** The standalone `al_ahlia` record should therefore remain unlinked to a separate current logo unt`
- `124: Search results show the official Allianz completion notice for sale of its stake to ADNIC and identify a current-name change from **Allianz Saudi Fransi Cooperative Insurance** to **Mutakamela Insurance Company**. The legacy `allianz_sf` re`
- `136: The Gulf General Cooperative Insurance official site identifies its header asset as `https://www.ggi-sa.com/assets/frontend/ggci/images/logo1.png`, but the host returns HTTP 403 to direct retrieval and its image element did not load a downl`
- `142: Official Saudi Enaya and Saudi Exchange search results identify Saudi Enaya as a listed health-insurance specialist. Search results also report a 2025 Insurance Authority approval relating to a proposed/approved Salama–Saudi Enaya merger, w`
### state_transitions
- `6: - The notice says Enaya would merge into Salama, subject to stated conditions at that time. It is evidence of a merger process, not by itself proof that an inactive legacy record should be auto-deleted.`
- `8: - The listed legal name is Gulf Union Alahlia Cooperative Insurance Co. and the profile states medical insurance activity.`
- `69: The health-insurance ranking is completed at rank 23; the document then begins a separate vehicle-insurance section. Therefore, this official July 2026 health-insurance complaint index visibly lists **23 companies**, not 30, 31, 34, or 36. `
- `90: | `tawuniya` | `tawuniya.com` | `https://www.tawuniya.com/assets/tawuniya-logo-CchrLQkJ.svg` | Source was rendered successfully by the official site. Converted without semantic alteration to a 256px transparent lossless WebP; SHA-256 `e8284`
- `91: | `al_rajhi_takaful` | `alrajhitakaful.com` | `https://www.alrajhitakaful.com/assets/icons/header-logo.svg` | Source was rendered successfully by the official site. Converted without semantic alteration to a 256px transparent lossless WebP;`
- `94: No brand mark has been generated or sourced from a third-party logo directory. The two completed WebP assets are local candidate assets only and are not yet linked to a live database or published application.`
- `96: ## Buruj status finding`
- `98: The official MEDGULF Saudi homepage states: “We are pleased to announce the merger of Buruj with MEDGULF.” This is first-party evidence that the `buruj` record must be reviewed for `catalog_status`, `retired_at`, and `superseded_by_company_`
- `102: ## Alalamiya / Liva status finding`
- `104: The current official Liva Saudi site identifies the brand as “Liva Insurance | Previously Alalamiya.” The `alalamiya` and `liva` records in the 30-company live catalog must therefore not both be presented as independent active insurers with`
- `108: ## Wafa status finding`
- `110: Search results identify Wafa as the Saudi Indian Company for Cooperative Insurance. A Saudi Central Bank notice states that its issuance/renewal activity was suspended in 2018, and a Saudi Exchange-linked result records court affirmation re`
### payment_insurance_relevance
- `1: # Official-source findings — insurance catalog reconciliation`
- `3: - Insurance Authority reports page: https://www.ia.gov.sa/en/reports`
- `4: - The portal publishes a Quarterly Insurance Sector Report for Q3 2025 and provides a direct PDF download.`
- `8: - The listed legal name is Gulf Union Alahlia Cooperative Insurance Co. and the profile states medical insurance activity.`
- `10: - Saudi Re describes itself as a composite reinsurer regulated by the Saudi Arabian Insurance Authority. It must not be added to the patient-facing health insurer list merely because it appears in the old generic list.`
- `12: - The site describes UAE digital insurance; it is not evidence to map the legacy Saudi "Al Hayat" record into the Saudi public insurer catalog.`
- `14: From visual review of the Insurance Authority Q3 2025 report PDF (`https://www.ia.gov.sa/SectorReports/Quarterly%20Insurance%20Sector%20Report%20for%203nd%20Quarter,%202025.pdf`):`
- `21: | Page 21 | Key indicators are aggregated by line of business and total market only. |`
- `22: | Page 22 | Definitions mention reinsurance in metric construction, but the report still does not provide a legal-entity list for insurers/reinsurers. |`
- `30: | Insurance Authority complaints index | The Authority publishes monthly PDF complaint indices specifically submitted against insurance companies. The page lists files for July through February 2026 and late 2025; these PDFs may provide a p`
- `32: Direct July 2026 PDF listed by the Authority: `https://www.ia.gov.sa/SectorReports/Complaints%20Index%20submitted%20to%20the%20Insurance%20Authority%20in%20July%202026.pdf`.`
- `36: The document was rendered at 1,654 × 12,480 pixels and split vertically into 12 overlapping tiles because the original page is unusually tall. Tile 1 contains the Authority introduction. Tile 2 begins the official health-insurance ranking a`
### error_empty_loading_retry_cancel
- `110: Search results identify Wafa as the Saudi Indian Company for Cooperative Insurance. A Saudi Central Bank notice states that its issuance/renewal activity was suspended in 2018, and a Saudi Exchange-linked result records court affirmation re`
- `136: The Gulf General Cooperative Insurance official site identifies its header asset as `https://www.ggi-sa.com/assets/frontend/ggci/images/logo1.png`, but the host returns HTTP 403 to direct retrieval and its image element did not load a downl`
- `142: Official Saudi Enaya and Saudi Exchange search results identify Saudi Enaya as a listed health-insurance specialist. Search results also report a 2025 Insurance Authority approval relating to a proposed/approved Salama–Saudi Enaya merger, w`
- `148: تم تأكيد نطاق الشركة الرسمي من نتائج البحث: `https://www.malath.com.sa/`. تعذر فتح الموقع من بيئة التحقق الحالية عبر المتصفح (`ERR_CONNECTION_CLOSED`) وعبر طلب HTTPS للقراءة فقط (مهلة SSL). لذلك لم يُستخرج أي شعار، ولم يتغير `manifest.json``
- `166: هذا يثبت **مصدر الشعار** فقط. يبقى سجل `saudi_enaya` في manifest غير نشط و`catalog_status: pending_review`، ولا يجوز عرضه كشركة مستقلة للمريض أو ربطه بـCDN قبل اعتماد علاقة الاندماج/الخلف قانونياً. يمكن إعداد WebP مرشح موثق للمراجع من هذا ا`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
