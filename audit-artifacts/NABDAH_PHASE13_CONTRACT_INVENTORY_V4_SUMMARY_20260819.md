# Phase 13 — ملخص جرد عقود API الثابت (V4)

**تاريخ التوليد:** 2026-08-19T13:42:24.201Z  
**مسارات Backend المرصودة:** 1342  
**مواضع الاستهلاك الخام:** 333  
**العقود الفريدة بعد التجميع:** 238

> يعالج هذا الإصدار ملفات Backend متعددة Controllers وaliases المعرّفة كمصفوفة، إضافة إلى origin و`/api/v1` والاستعلامات والمعاملات. لا يمثل `WIRED_CANDIDATE` دليلاً تشغيلياً؛ تبقى role وownership وschema وstate transition والاختبار الحي منفصلة.

## ملخص التصنيف

| التطبيق | WIRED_CANDIDATE | MISSING_OR_STALE_CANDIDATE | INCONCLUSIVE_DYNAMIC_BASE |
|---|---:|---:|---:|
| patient | 4 | 0 | 1 |
| provider | 215 | 10 | 0 |
| admin | 7 | 0 | 1 |

## العقود التي تتطلب قراراً أو تحقيقاً لاحقاً

| التطبيق | الطريقة | المسار | الحالة | مواضع الاستهلاك |
|---|---|---|---|---|
| admin | FETCH | `:dynamic` | INCONCLUSIVE_DYNAMIC_BASE | src/components/PublicDirectory.tsx:124 |
| patient | DELETE | `/:dynamic` | INCONCLUSIVE_DYNAMIC_BASE | src/core/data/HttpRemoteDataSource.ts:98<br>src/data/repositories/sources/RemoteDataSource.ts:58 |
| provider | FETCH | `/` | MISSING_OR_STALE_CANDIDATE | src/context/index.tsx:220 |
| provider | GET | `/chats/provider` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:1473 |
| provider | GET | `/home-care/visits` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:369 |
| provider | GET | `/legal/policy/provider_agreement` | MISSING_OR_STALE_CANDIDATE | src/components/ContractModal.tsx:31 |
| provider | GET | `/pharmacy/inventory/expiry` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/RealScreensExtended.tsx:283 |
| provider | POST | `/chats/:dynamic/messages` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:1499 |
| provider | POST | `/home-care/notes` | MISSING_OR_STALE_CANDIDATE | src/screens/shared/BlueprintScreens.tsx:855 |
| provider | POST | `/home-care/visits/:dynamic/respond` | MISSING_OR_STALE_CANDIDATE | src/screens/nursing/NursingDashboard.tsx:433<br>src/screens/nursing/NursingDashboard.tsx:444 |
| provider | POST | `/legal/accept/provider_agreement` | MISSING_OR_STALE_CANDIDATE | src/components/ContractModal.tsx:101 |
| provider | POST | `/provider/chat/send` | MISSING_OR_STALE_CANDIDATE | src/screens/doctor/DoctorDashboard.tsx:3630 |

## حدود الإثبات

كل صف `WIRED_CANDIDATE` مصنف، لكنه لا يصبح PASS إلا مع إثبات controller/schema/role/ownership/state transition/evidence. جميع الصفوف غير المطابقة أو الديناميكية مصنفة ولا يبقى أي صف من جرد الاستدعاءات بلا حالة أولية.

