# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/constants/specialties.ts`
- **Member SHA-256:** `7816414d7db3b05526fb1f9468b40c4f2e32f60bf01f1da97c73eac47aaf4374`
- **Line count:** 164
- **Read range:** `1-164`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `109: { id: 'hiv', nameAr: 'فحص نقص المناعة', nameEn: 'HIV Screening', category: 'blood', price: 80, turnaround: '12 ساعة', description: 'الكشف عن فيروس نقص المناعة البشرية' },`
- `118: { id: 'genetic_screen', nameAr: 'فحص جيني ما قبل الزواج', nameEn: 'Pre-Marital Genetic Screen', category: 'genetics', price: 350, turnaround: '5 أيام', description: 'فحص جيني شامل للكشف عن الأمراض الوراثية' },`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `147: { id: '6', nameAr: 'إعطاء الأدوية', nameEn: 'Medication Administration', description: 'إعطاء الأدوية الموصوفة والتأكد من الجرعات', basePrice: 40, duration: '20 دقيقة', icon: 'medication' },`
- `160: { id: '19', nameAr: 'حقنة شرجية', nameEn: 'Enema Administration', description: 'إعطاء الحقنة الشرجية العلاجية في المنزل', basePrice: 100, duration: '30 دقيقة', icon: 'syringe' },`
### state_transitions
- `101: { id: 'psa', nameAr: 'مستضد البروستات', nameEn: 'Prostate Specific Antigen (PSA)', category: 'hormones', price: 90, turnaround: '8 ساعات', description: 'فحص للكشف المبكر عن أمراض البروستات' },`
### payment_insurance_relevance
- `15: price: number;`
- `24: price: number;`
- `33: basePrice: number;`
- `42: { id: '4', nameAr: 'قلب وأوعية دموية', nameEn: 'Cardiology', icon: 'monitor_heart', color: '#EF4444', description: 'تشخيص وعلاج أمراض القلب والأوعية الدموية' },`
- `71: { id: '33', nameAr: 'جراحة قلب مفتوح', nameEn: 'Cardiac Surgery', icon: 'monitor_heart', color: '#BE123C', description: 'العمليات الجراحية للقلب والشرايين' },`
- `87: { id: 'cbc', nameAr: 'تحليل صورة دم كاملة', nameEn: 'Complete Blood Count (CBC)', category: 'blood', price: 45, turnaround: '4 ساعات', description: 'قياس مكونات الدم الأساسية والكشف عن فقر الدم والعدوى' },`
- `88: { id: 'fbs', nameAr: 'سكر الدم صائم', nameEn: 'Fasting Blood Sugar (FBS)', category: 'blood', price: 25, turnaround: '2 ساعات', description: 'قياس مستوى السكر في الدم أثناء الصيام' },`
- `89: { id: 'hba1c', nameAr: 'السكر التراكمي', nameEn: 'HbA1c', category: 'blood', price: 55, turnaround: '6 ساعات', description: 'قياس متوسط مستوى السكر في الدم خلال 3 أشهر' },`
- `90: { id: 'lipid', nameAr: 'تحليل دهون شامل', nameEn: 'Lipid Profile', category: 'blood', price: 65, turnaround: '6 ساعات', description: 'قياس الكوليسترول والدهون الثلاثية في الدم' },`
- `91: { id: 'tft', nameAr: 'وظائف الغدة الدرقية', nameEn: 'Thyroid Function Tests', category: 'hormones', price: 85, turnaround: '8 ساعات', description: 'قياس هرمونات الغدة الدرقية TSH و T3 و T4' },`
- `92: { id: 'lft', nameAr: 'وظائف الكبد', nameEn: 'Liver Function Tests', category: 'blood', price: 70, turnaround: '6 ساعات', description: 'تقييم وظائف الكبد وقياس الإنزيمات الكبدية' },`
- `93: { id: 'rft', nameAr: 'وظائف الكلى', nameEn: 'Renal Function Tests', category: 'blood', price: 60, turnaround: '6 ساعات', description: 'تقييم وظائف الكلى وقياس الكرياتينين واليوريا' },`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
