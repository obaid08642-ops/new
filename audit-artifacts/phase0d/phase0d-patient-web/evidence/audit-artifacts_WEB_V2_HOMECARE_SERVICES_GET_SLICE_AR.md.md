# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_HOMECARE_SERVICES_GET_SLICE_AR.md`
- **Member SHA-256:** `1f8687d19ca0000bf80d499e562992478e3b68fa98ed3b3a459f7779a1f197ca`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: الـwrapper public لا يرسل Authorization أو session، ولا يعرض fallback أو mock data. تفاصيل الخدمة لا تحتوي CTA ينفذ booking؛ صفحة الحجز تبقى منفصلة ومحجوبة حتى تثبيت عقد create/idempotency/slot locking.`
### backend_consumers_or_contracts
- `5: - `GET /api/v1/home-care/services``
- `6: - `GET /api/v1/home-care/services/{id}``
- `8: أضيفت قائمة `/[locale]/home-care/services` وتفاصيل `/[locale]/home-care/services/[serviceId]`. parser يحافظ فقط على `id`, `slug`, الأسماء والوصف المحلي، السعر، المدة، وinsurance availability؛ ويسقط `patient_id` والحقول الداخلية. service IDs`
### auth_ownership
- `10: الـwrapper public لا يرسل Authorization أو session، ولا يعرض fallback أو mock data. تفاصيل الخدمة لا تحتوي CTA ينفذ booking؛ صفحة الحجز تبقى منفصلة ومحجوبة حتى تثبيت عقد create/idempotency/slot locking.`
### state_transitions
- `12: أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وCSS responsive ببطاقات glass وحركة 180ms وfocus states و`prefers-reduced-motion`.`
### payment_insurance_relevance
- `8: أضيفت قائمة `/[locale]/home-care/services` وتفاصيل `/[locale]/home-care/services/[serviceId]`. parser يحافظ فقط على `id`, `slug`, الأسماء والوصف المحلي، السعر، المدة، وinsurance availability؛ ويسقط `patient_id` والحقول الداخلية. service IDs`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
