# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-5-public-medicine-detail-security.md`
- **Member SHA-256:** `ea6608d6d35a33782cc83b98575e80dbe8ccc847527268e0347687e06ed4c992`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | البيانات المنظمة | يستخدم `MedicalWebPage` المحايد فقط؛ لا يستخدم `Drug` ولا سعر أو عرض تجاري أو ادعاء علاجي. | ناجح |`
- `19: اجتاز اختبار SSR المخصص التحقق من أن HTML يحتوي فقط على الحقول المسموحة و`MedicalWebPage`، ولا يحتوي على السعر أو معرف المريض أو رابط المرفق. كما يثبت الاختبار canonical وبدائل hreflang الست و`x-default` وسياسة `noindex` للعنصر غير المصنف. `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: **النطاق:** مسار `/{locale}/medicines/{medicineId}` يقرأ تفاصيل كتالوج من نقطة عامة بلا Bearer، ويعرض فقط الحقول المسموح بها. لا يفعّل ذلك أي شراء أو وصفة أو سلة أو عملية مريض.`
- `7: | الجلسة والتفويض | الجالب العام لا يقبل أو يرسل cookie أو Bearer، ويقتصر على مسارات `/medicines` العامة المقيدة بنمط معرف صارم. | ناجح |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
