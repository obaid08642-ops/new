# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-6-public-discovery-security-gate.md`
- **Member SHA-256:** `3d9cc121d0923b866f3eb4b103f5429e4aca1db802a278bba6ac426f3565d222`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | الكتالوج المختلط | العناصر غير الدوائية تمنع استعمال `Drug` و`MedicalWebPage` وفهرسة تفاصيل الكتالوج | ناجح، فجوة G-SEO-002 مفتوحة في الخلفية |`
- `22: | `pnpm build` | ناجح؛ `robots.txt` و`sitemap.xml` static routes |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: يغطي هذا التدقيق الصفحة الرئيسية العامة `/ar` و`/en`، و`robots.txt` و`sitemap.xml`، ومسار الكتالوج العام المقيد. لا يفتح التدقيق أي مسار مريض، ولا يغيّر بيانات الخلفية، ولا يضيف endpoint متصفحياً يحمل Bearer token.`
- `9: | الجلسة | صفحات المريض تبقى خلف `requirePatientAccess` وcookies httpOnly؛ مسار الكتالوج العام لا يستقبل أو يرسل توكن مريض | ناجح |`
- `10: | BOLA/IDOR | لا يعتمد المحتوى العام على `patientId` أو `userId` أو معرف طلب/حجز؛ صفحات التفاصيل الخاصة لا تدخل sitemap | ناجح |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
