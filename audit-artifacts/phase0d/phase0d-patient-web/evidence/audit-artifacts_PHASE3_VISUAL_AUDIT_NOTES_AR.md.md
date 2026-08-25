# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE3_VISUAL_AUDIT_NOTES_AR.md`
- **Member SHA-256:** `aa4aab5c4a2c6264a1c58001fb54b417fb4c0b3e3617d0aa884cc705c848cba8`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: تم فتح `/en` و`/en/login` من production build المحلي دون تسجيل دخول. الصفحة العامة تعرض hero واضحًا ثنائي العمود، palette فاتحة teal/ink، بطاقات ذات radius وظلال ناعمة، وأيقونات vector من Lucide. شاشة الدخول متسقة بصريًا، responsive، وتعرض `
- `5: الملاحظات: المظهر الحالي premium ومرتب ومناسب لبوابة صحية، لكنه لا يثبت ترتيبًا عالميًا أو تفردًا بصريًا؛ لا يوجد benchmark رسمي أو design award score. الحركة المرئية الحالية محدودة غالبًا إلى hover/transition في بعض البطاقات والروابط، ولا `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: تم فتح `/en` و`/en/login` من production build المحلي دون تسجيل دخول. الصفحة العامة تعرض hero واضحًا ثنائي العمود، palette فاتحة teal/ink، بطاقات ذات radius وظلال ناعمة، وأيقونات vector من Lucide. شاشة الدخول متسقة بصريًا، responsive، وتعرض `
### state_transitions
- `5: الملاحظات: المظهر الحالي premium ومرتب ومناسب لبوابة صحية، لكنه لا يثبت ترتيبًا عالميًا أو تفردًا بصريًا؛ لا يوجد benchmark رسمي أو design award score. الحركة المرئية الحالية محدودة غالبًا إلى hover/transition في بعض البطاقات والروابط، ولا `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: الملاحظات: المظهر الحالي premium ومرتب ومناسب لبوابة صحية، لكنه لا يثبت ترتيبًا عالميًا أو تفردًا بصريًا؛ لا يوجد benchmark رسمي أو design award score. الحركة المرئية الحالية محدودة غالبًا إلى hover/transition في بعض البطاقات والروابط، ولا `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
