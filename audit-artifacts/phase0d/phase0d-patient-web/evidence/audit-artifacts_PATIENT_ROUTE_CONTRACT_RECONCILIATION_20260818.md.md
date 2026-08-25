# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_ROUTE_CONTRACT_RECONCILIATION_20260818.md`
- **Member SHA-256:** `26f23dc4901207ae09fb63021108d650af96808ddaa4b0b33fa810d0a3fc002a`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Patient route/contract reconciliation`
- `3: الـreadonly probe الأولي استخدم أسماء عامة مثل `/profile` و`/family` و`/appointments/mine` و`/hospitals` و`/services`. ظهرت 404/403 في بعضها، لكن هذا لا يكفي لتصنيف عيب؛ يجب مطابقة كل شاشة مع `apiFetch` الفعلي في Patient App ومع controller/`
- `5: أظهر الفحص أن backend يضم وحدات مستقلة للمستخدمين/الملف، family، booking-flow/unified-bookings، hospital، service-catalog، providers، labs، radiology، pharmacy، home-care، notifications، wallet، insurance، articles، وSEO. لذلك سيُعاد probe `
- `7: لا تُنفذ mutations من أسماء routes التخمنية. يبدأ الاختبار الحقيقي بقراءة catalog/slots/profile/availability من consumers الصحيحة، ثم يُنشأ sandbox booking فقط عندما يكون payload والعقد واضحين، مع before/after وcleanup.`
### backend_consumers_or_contracts
- `3: الـreadonly probe الأولي استخدم أسماء عامة مثل `/profile` و`/family` و`/appointments/mine` و`/hospitals` و`/services`. ظهرت 404/403 في بعضها، لكن هذا لا يكفي لتصنيف عيب؛ يجب مطابقة كل شاشة مع `apiFetch` الفعلي في Patient App ومع controller/`
### auth_ownership
- `5: أظهر الفحص أن backend يضم وحدات مستقلة للمستخدمين/الملف، family، booking-flow/unified-bookings، hospital، service-catalog، providers، labs، radiology، pharmacy، home-care، notifications، wallet، insurance، articles، وSEO. لذلك سيُعاد probe `
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `5: أظهر الفحص أن backend يضم وحدات مستقلة للمستخدمين/الملف، family، booking-flow/unified-bookings، hospital، service-catalog، providers، labs، radiology، pharmacy، home-care، notifications، wallet، insurance، articles، وSEO. لذلك سيُعاد probe `
- `7: لا تُنفذ mutations من أسماء routes التخمنية. يبدأ الاختبار الحقيقي بقراءة catalog/slots/profile/availability من consumers الصحيحة، ثم يُنشأ sandbox booking فقط عندما يكون payload والعقد واضحين، مع before/after وcleanup.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
