# Phase 0B semantic evidence — radiology.seed.ts

**Archive member:** `src/modules/radiology/radiology.seed.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–29; full 29-line member covered.

Lines 2–4 describe an independent radiology seed covering modalities xray, ct, mri, ultrasound, mammography, dexa and fluoroscopy. Lines 5–29 define 17 fixed service records: four X-ray entries, four ultrasound entries, three CT entries, three MRI entries, one mammography entry and one DEXA entry. Records contain Arabic/English names, short codes, modality, body part, numeric price, turnaround hours and popularity; selected entries include fasting requirements/hours, contrast requirement and referral requirement.

**Truthfulness/data quality:** prices, turnaround hours and popularity are hard-coded source data, with no currency, provider/center, geographic availability, effective date, approval status, price source or measurement period. `fluoroscopy` is listed in the comment but no corresponding record is present in the array. Static `requires_referral`, `contrast_required`, and fasting rules are not linked to clinical policy or validation in this member.

**Security/ownership:** no access, tenant or provider semantics visible; seed behavior is applied by `RadiologySeed` in the module. If inserted on boot, these values may appear as active catalog records without demonstrated licensing, medical review, or provider availability.

**State/transitions:** none; static array only.

**Price/payment/insurance source:** fixed numeric prices only; no currency, tax, payment, insurance, ledger, or coverage fields.

**Test implications:** verify production seed governance, version/idempotency/environment scoping, catalog approval and freshness, currency/price semantics, modality completeness, referral/contrast/fasting policy, and provider availability. No seed executed and no tests run during this semantic read.
