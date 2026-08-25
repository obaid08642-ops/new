# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_WEB_PARITY_PHASE8_HANDOVER_AR.md`
- **Member SHA-256:** `76cf76c21e9b2692c819e3f6c90a6b29370ecda94c8c8940b154e8c57eccde1b`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | Home Care / Pharmacy / Diagnostics | تم توثيق حدود read-only، وعدم نقل booking/payment/catalog transactions غير المثبتة. |`
- `42: تبقى عمليات pharmacy cart/checkout/payment/prescription upload، home-care booking/payment/tracking، diagnostics reports/documents/pricing، chat realtime/send/read state، وhealth score/vitals log غير منفذة على Web حتى تثبت عقود DTO وownershi`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: تم استئناف Wave 2 على فرع `agent/nabdah-web-parity-phase0` مع الالتزام بعقدين أساسيين: **Truthful implementation** و**server-only patient session**. كل دفعة مرّت بمراجعة parity، اختبار boundary، typecheck، build، ثم commit وpush. لم يتم تعد`
- `11: | Private Medicines | تم توحيد `/medicines` مع Premium catalogue surface، مع session server-only وحقول parser المسموح بها فقط. لا price أو patient data أو availability guarantee أو شراء. |`
- `13: | Family | تم عرض display name وrelation من backend allowlist، مع حجب identifiers وpermissions وhealth records وinvites. |`
- `42: تبقى عمليات pharmacy cart/checkout/payment/prescription upload، home-care booking/payment/tracking، diagnostics reports/documents/pricing، chat realtime/send/read state، وhealth score/vitals log غير منفذة على Web حتى تثبت عقود DTO وownershi`
- `46: الفرع صالح للمراجعة والدمج عبر Pull Request مستقل بعد مراجعة الفريق. لا توجد تغييرات غير ملتزمة، ولا توجد أسرار أو tokens أو بيانات مريض تجريبية مضمّنة في HTML أو browser storage ضمن الاختبارات المغلقة.`
### state_transitions
- `14: | Prescriptions | بقي read-only parity الذي يعرض state وcount/date وdoctor/medication names من سجل المريض المصرح؛ الجرعات والتشخيص والملاحظات والملفات وعمليات الصرف/الإرسال محجوبة. تم تصحيح SSR test وnotices في اللغات الست. |`
- `15: | Chat | بقي thread metadata فقط؛ فتح المحادثة والإرسال والمرفقات وread/delivery state موثقة كـblocked. |`
- `42: تبقى عمليات pharmacy cart/checkout/payment/prescription upload، home-care booking/payment/tracking، diagnostics reports/documents/pricing، chat realtime/send/read state، وhealth score/vitals log غير منفذة على Web حتى تثبت عقود DTO وownershi`
### payment_insurance_relevance
- `11: | Private Medicines | تم توحيد `/medicines` مع Premium catalogue surface، مع session server-only وحقول parser المسموح بها فقط. لا price أو patient data أو availability guarantee أو شراء. |`
- `16: | Home Care / Pharmacy / Diagnostics | تم توثيق حدود read-only، وعدم نقل booking/payment/catalog transactions غير المثبتة. |`
- `42: تبقى عمليات pharmacy cart/checkout/payment/prescription upload، home-care booking/payment/tracking، diagnostics reports/documents/pricing، chat realtime/send/read state، وhealth score/vitals log غير منفذة على Web حتى تثبت عقود DTO وownershi`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
