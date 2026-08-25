# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-6-seo-discovery-policy.md`
- **Member SHA-256:** `802140a112debac7b9391e972bc64e4df9718021443506a6674f0dcb79095a54`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تقتصر الفهرسة الحالية على صفحتي البداية العامتين العربية والإنجليزية. تحمل الصفحة الرئيسية `WebSite` و`MedicalOrganization` و`MedicalWebPage` بخصائص اسم ورابط ولغة فقط؛ لا تضع عنواناً أو رقماً أو اعتماداً أو مراجعة أو ادعاءً طبياً لم يثبت ف`
- `16: تحقق API العام من `GET /medicines` أعاد عناصر دوائية وغير دوائية في المجموعة نفسها، مثل مستلزمات أطفال ونظارات ومنتجات عناية. لذلك يقتصر الوسم على `WebPage` العام، ولا يستخدم `Drug` أو `MedicalWebPage` أو sitemap للتفاصيل حتى يوفر Backend ع`
- `44: [7]: https://schema.org/MedicalWebPage "Schema.org — MedicalWebPage"`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
