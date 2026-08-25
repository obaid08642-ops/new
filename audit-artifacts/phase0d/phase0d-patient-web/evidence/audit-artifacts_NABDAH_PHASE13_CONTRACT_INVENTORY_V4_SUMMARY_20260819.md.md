# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_CONTRACT_INVENTORY_V4_SUMMARY_20260819.md`
- **Member SHA-256:** `a89d772802e68b52d7eea8d5710443a06d2f7c275db6e2d91fda17f3d3a647cb`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: | provider | GET | `/chats/provider` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:1473 |`
- `26: | provider | GET | `/home-care/visits` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:369 |`
- `28: | provider | GET | `/pharmacy/inventory/expiry` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/RealScreensExtended.tsx:283 |`
- `29: | provider | POST | `/chats/:dynamic/messages` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:1499 |`
- `30: | provider | POST | `/home-care/notes` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/BlueprintScreens.tsx:855 |`
- `31: | provider | POST | `/home-care/visits/:dynamic/respond` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:433<br>src/screens/nursing/NursingDashboard.tsx:444 |`
- `33: | provider | POST | `/provider/chat/send` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:3630 |`
### backend_consumers_or_contracts
- `8: > يعالج هذا الإصدار ملفات Backend متعددة Controllers وaliases المعرّفة كمصفوفة، إضافة إلى origin و`/api/v1` والاستعلامات والمعاملات. لا يمثل `WIRED_CANDIDATE` دليلاً تشغيلياً؛ تبقى role وownership وschema وstate transition والاختبار الحي من`
- `26: | provider | GET | `/home-care/visits` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:369 |`
- `28: | provider | GET | `/pharmacy/inventory/expiry` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/RealScreensExtended.tsx:283 |`
- `30: | provider | POST | `/home-care/notes` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/BlueprintScreens.tsx:855 |`
- `31: | provider | POST | `/home-care/visits/:dynamic/respond` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:433<br>src/screens/nursing/NursingDashboard.tsx:444 |`
### auth_ownership
- `8: > يعالج هذا الإصدار ملفات Backend متعددة Controllers وaliases المعرّفة كمصفوفة، إضافة إلى origin و`/api/v1` والاستعلامات والمعاملات. لا يمثل `WIRED_CANDIDATE` دليلاً تشغيلياً؛ تبقى role وownership وschema وstate transition والاختبار الحي من`
- `16: | admin | 7 | 0 | 1 |`
- `22: | admin | FETCH | `:dynamic` | INCONCLUSIVE_DYNAMIC_BASE | src/components/PublicDirectory.tsx:124 |`
- `37: كل صف `WIRED_CANDIDATE` مصنف، لكنه لا يصبح PASS إلا مع إثبات controller/schema/role/ownership/state transition/evidence. جميع الصفوف غير المطابقة أو الديناميكية مصنفة ولا يبقى أي صف من جرد الاستدعاءات بلا حالة أولية.`
### state_transitions
- `8: > يعالج هذا الإصدار ملفات Backend متعددة Controllers وaliases المعرّفة كمصفوفة، إضافة إلى origin و`/api/v1` والاستعلامات والمعاملات. لا يمثل `WIRED_CANDIDATE` دليلاً تشغيلياً؛ تبقى role وownership وschema وstate transition والاختبار الحي من`
- `37: كل صف `WIRED_CANDIDATE` مصنف، لكنه لا يصبح PASS إلا مع إثبات controller/schema/role/ownership/state transition/evidence. جميع الصفوف غير المطابقة أو الديناميكية مصنفة ولا يبقى أي صف من جرد الاستدعاءات بلا حالة أولية.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
