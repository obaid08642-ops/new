# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/165_insurance_visual_check_20260822.md`
- **Member SHA-256:** `3a98b03a7082890753394298d3b4169a6a55b4e4f1f2c1926b9bbffe1c2199d6`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: تعرض الشاشة ملخصاً محدوداً للوثيقة وحالة المطالبات بوضوح ضمن حدود القراءة فقط. لا يمثل التحقق محلياً نشر إنتاجي. لقطة المصدر محفوظة في `/home/ubuntu/screenshots/localhost_2026-08-22_01-33-09_7600.webp`.`
### backend_consumers_or_contracts
- `9: | `/ar/insurance` | ناجح | رأس تأمين، بطاقة حالة وثيقة، وقسم مطالبات بحالة فراغ واضحة | لم يعد حساب Sandbox وثيقة أو مطالبات؛ لم تعرض الواجهة قيماً مالية أو معرفات أو ملفات أو إجراءات دفع بديلة. |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `9: | `/ar/insurance` | ناجح | رأس تأمين، بطاقة حالة وثيقة، وقسم مطالبات بحالة فراغ واضحة | لم يعد حساب Sandbox وثيقة أو مطالبات؛ لم تعرض الواجهة قيماً مالية أو معرفات أو ملفات أو إجراءات دفع بديلة. |`
- `14: f6ef32847076504f9ae549de3ea244a45a5fa33f666c4de2053a62b3e0ced858  evidence/visual/ar-insurance-design-v1.webp`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
