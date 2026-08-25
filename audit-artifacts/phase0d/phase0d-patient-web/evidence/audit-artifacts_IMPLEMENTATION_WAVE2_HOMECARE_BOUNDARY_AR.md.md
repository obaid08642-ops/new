# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_HOMECARE_BOUNDARY_AR.md`
- **Member SHA-256:** `5b742166a4636e5a759a026dba650ad0861aa7fff63b069f6ee98e74978759a2`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: راجعت `app/(tabs)/nursing.tsx` في React Native، بما يشمل البحث، الفلاتر، التأمين/النقد، الباقات، الخدمات، الصور، الأسعار، quick booking، وservice details. Web الحالي يقرأ حجوزات Home Care السابقة/القائمة بعقد server-only.`
- `9: لم أضف catalog أو الأسعار أو booking flow أو payment/insurance أو nurse profile/tracking. هذه الميزات تعتمد على `/home-care/services` و`/home-care/packages` ومسارات الحجز والدفع والملفات، ويجب تثبيت schemas وownership وauthorization وprice `
- `13: لا توجد بيانات أو أسعار أو صور fallback جديدة. Web parity لهذه الرحلة **blocked جزئيًا** إلى حين اعتماد عقود catalog/booking، بينما read-only bookings الحالية تبقى كما هي.`
### backend_consumers_or_contracts
- `5: راجعت `app/(tabs)/nursing.tsx` في React Native، بما يشمل البحث، الفلاتر، التأمين/النقد، الباقات، الخدمات، الصور، الأسعار، quick booking، وservice details. Web الحالي يقرأ حجوزات Home Care السابقة/القائمة بعقد server-only.`
- `9: لم أضف catalog أو الأسعار أو booking flow أو payment/insurance أو nurse profile/tracking. هذه الميزات تعتمد على `/home-care/services` و`/home-care/packages` ومسارات الحجز والدفع والملفات، ويجب تثبيت schemas وownership وauthorization وprice `
### auth_ownership
- `9: لم أضف catalog أو الأسعار أو booking flow أو payment/insurance أو nurse profile/tracking. هذه الميزات تعتمد على `/home-care/services` و`/home-care/packages` ومسارات الحجز والدفع والملفات، ويجب تثبيت schemas وownership وauthorization وprice `
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `9: لم أضف catalog أو الأسعار أو booking flow أو payment/insurance أو nurse profile/tracking. هذه الميزات تعتمد على `/home-care/services` و`/home-care/packages` ومسارات الحجز والدفع والملفات، ويجب تثبيت schemas وownership وauthorization وprice `
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
