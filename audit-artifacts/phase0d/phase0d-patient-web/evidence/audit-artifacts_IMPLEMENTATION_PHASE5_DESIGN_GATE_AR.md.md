# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE5_DESIGN_GATE_AR.md`
- **Member SHA-256:** `2db4e339f46a02f8b180145784b1d553e7ca2824c1137499943176f9b5aec088`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `26: | metadata/route state tests | 3/3 Pass |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: تمت إضافة طبقة semantic tokens في `app/globals.css` مستمدة من React Native tokens:`
- `33: هذا يغلق طبقة tokens وshell فقط. لم تُنفذ بعد مطابقة كل رحلات React Native أو توسيع API surface؛ تلك تبقى في مرحلة parity التالية بعد اختيار أول journey وعقده المثبت.`
### state_transitions
- `10: - success/warning/danger semantic surfaces.`
- `26: | metadata/route state tests | 3/3 Pass |`
### payment_insurance_relevance
- `18: تم فتح `/ar` على معاينة محلية. ظهر الـtopbar والـlocale selector والـpatient entry والـhero والـtrust card بصورة سليمة، مع RTL عربي واضح، gradient خلفية، vector health illustration، وCTA primary/secondary. لم تظهر بيانات مريض أو كتالوج مصطن`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
