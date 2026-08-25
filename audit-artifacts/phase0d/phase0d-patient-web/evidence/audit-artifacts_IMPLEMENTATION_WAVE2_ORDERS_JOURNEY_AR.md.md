# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_ORDERS_JOURNEY_AR.md`
- **Member SHA-256:** `5c19a75434cc2cdeb8cc228addf66ef5ae90234275deaa96f40c3cc129651de2`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت مطابقة أول أربع tabs من `app/orders/index.tsx` في React Native مع Web Orders: all، pending، completed، cancelled. الفلترة تتم من status الحقيقي القادم من `/orders/mine`، مع bucket mapping صريح للحالات المكتملة والملغاة، وأي status غير م`
### backend_consumers_or_contracts
- `5: تمت مطابقة أول أربع tabs من `app/orders/index.tsx` في React Native مع Web Orders: all، pending، completed، cancelled. الفلترة تتم من status الحقيقي القادم من `/orders/mine`، مع bucket mapping صريح للحالات المكتملة والملغاة، وأي status غير م`
- `7: لم يتم دمج مصادر labs/radiology/nursing/insurance/returns/emergency في Web Orders حتى الآن؛ الموبايل يجمع ثمانية مصادر في مركز موحد، لكن ذلك يحتاج contracts وownership وprivacy tests لكل مصدر قبل التوسع.`
### auth_ownership
- `7: لم يتم دمج مصادر labs/radiology/nursing/insurance/returns/emergency في Web Orders حتى الآن؛ الموبايل يجمع ثمانية مصادر في مركز موحد، لكن ذلك يحتاج contracts وownership وprivacy tests لكل مصدر قبل التوسع.`
### state_transitions
- `1: # Wave 2 — Orders Center Status Tabs`
- `5: تمت مطابقة أول أربع tabs من `app/orders/index.tsx` في React Native مع Web Orders: all، pending، completed، cancelled. الفلترة تتم من status الحقيقي القادم من `/orders/mine`، مع bucket mapping صريح للحالات المكتملة والملغاة، وأي status غير م`
### payment_insurance_relevance
- `7: لم يتم دمج مصادر labs/radiology/nursing/insurance/returns/emergency في Web Orders حتى الآن؛ الموبايل يجمع ثمانية مصادر في مركز موحد، لكن ذلك يحتاج contracts وownership وprivacy tests لكل مصدر قبل التوسع.`
### error_empty_loading_retry_cancel
- `5: تمت مطابقة أول أربع tabs من `app/orders/index.tsx` في React Native مع Web Orders: all، pending، completed، cancelled. الفلترة تتم من status الحقيقي القادم من `/orders/mine`، مع bucket mapping صريح للحالات المكتملة والملغاة، وأي status غير م`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
