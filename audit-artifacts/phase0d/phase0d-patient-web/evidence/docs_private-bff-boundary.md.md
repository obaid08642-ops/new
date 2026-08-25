# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/private-bff-boundary.md`
- **Member SHA-256:** `6fb6931be349cccd389ebe806a87067f2e1467d479f12043311e197600052a45`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: يبقى Route Handler في `/api/patient/[...path]` بوابة BFF للنداءات التي تبدأ من المتصفح. أما القراءات التي تبدأ من Server Components فتستخدم البوابة الخادمية نفسها مباشرة، لأن تحويلها إلى طلب HTTP داخلي لا يضيف حماية ويزيد سطح الجلسة والتشغي`
### backend_consumers_or_contracts
- `11: يبقى Route Handler في `/api/patient/[...path]` بوابة BFF للنداءات التي تبدأ من المتصفح. أما القراءات التي تبدأ من Server Components فتستخدم البوابة الخادمية نفسها مباشرة، لأن تحويلها إلى طلب HTTP داخلي لا يضيف حماية ويزيد سطح الجلسة والتشغي`
### auth_ownership
- `3: تعمل صفحات المريض الخاصة كمكونات خادمية في Next.js. تستخرج الجلسة من cookies ذات `httpOnly` على الخادم، ثم تمرر access token إلى بوابة خادمية داخلية فقط. لا يُدرج التوكن في HTML أو JavaScript أو عنوان URL، ولا تستدعي المتصفحات الخلفية الإنت`
- `11: يبقى Route Handler في `/api/patient/[...path]` بوابة BFF للنداءات التي تبدأ من المتصفح. أما القراءات التي تبدأ من Server Components فتستخدم البوابة الخادمية نفسها مباشرة، لأن تحويلها إلى طلب HTTP داخلي لا يضيف حماية ويزيد سطح الجلسة والتشغي`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
