# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE8_DESIGN_MOTION_REVIEW_AR.md`
- **Member SHA-256:** `5935587626976faa27a516355fcb2d6299d995ab4630740aa78482988535c6ac`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: المشروع يستخدم Lucide/SVG للأيقونات في السطوح الجديدة، ولا تظهر Emoji أو mock markers في مسارات الإنتاج التي شملها الفحص. توجد tokens مركزية للهوية، glass surface، shadows، focus rings، transitions، و`prefers-reduced-motion`. كما أن الصفحة `
- `17: | loading/empty/error states | مطبق في السطوح الموجودة، ويجب استكماله لكل route جديد |`
- `22: لا يكفي فحص CSS النصي لإثبات parity بصري كامل. يلزم تشغيل visual regression على كل route ولكل locale واتجاه، وفحص mobile breakpoints، contrast AA، keyboard focus order، skeleton states، slow network، reduced-motion، dark/light إن كانت مدعوم`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: المشروع يستخدم Lucide/SVG للأيقونات في السطوح الجديدة، ولا تظهر Emoji أو mock markers في مسارات الإنتاج التي شملها الفحص. توجد tokens مركزية للهوية، glass surface، shadows، focus rings، transitions، و`prefers-reduced-motion`. كما أن الصفحة `
- `18: | premium glass/shadow/spacing | موجود كـtokens وقواعد عامة، ويحتاج visual regression شامل |`
- `22: لا يكفي فحص CSS النصي لإثبات parity بصري كامل. يلزم تشغيل visual regression على كل route ولكل locale واتجاه، وفحص mobile breakpoints، contrast AA، keyboard focus order، skeleton states، slow network، reduced-motion، dark/light إن كانت مدعوم`
### state_transitions
- `17: | loading/empty/error states | مطبق في السطوح الموجودة، ويجب استكماله لكل route جديد |`
- `22: لا يكفي فحص CSS النصي لإثبات parity بصري كامل. يلزم تشغيل visual regression على كل route ولكل locale واتجاه، وفحص mobile breakpoints، contrast AA، keyboard focus order، skeleton states، slow network، reduced-motion، dark/light إن كانت مدعوم`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: | loading/empty/error states | مطبق في السطوح الموجودة، ويجب استكماله لكل route جديد |`
- `22: لا يكفي فحص CSS النصي لإثبات parity بصري كامل. يلزم تشغيل visual regression على كل route ولكل locale واتجاه، وفحص mobile breakpoints، contrast AA، keyboard focus order، skeleton states، slow network، reduced-motion، dark/light إن كانت مدعوم`
- `24: لا يتم إدخال animations ذات دلالة طبية أو تغيير مخرجات صحية؛ الحركة تقتصر على الانتقال، الإدخال، الضغط، skeleton، وتأكيد الحالة مع احترام reduced-motion.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
