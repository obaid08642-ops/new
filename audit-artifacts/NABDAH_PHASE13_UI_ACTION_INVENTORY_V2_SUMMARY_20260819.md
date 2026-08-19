# Phase 13 — ملخص جرد أزرار واجهة المستخدم

**تاريخ التوليد:** 2026-08-19T13:46:25.511Z  
**إجمالي الأفعال المرصودة:** 1097

> كل action مرصود يتضمن التطبيق والملف والسطر وحالة أولية؛ `HANDLER_REQUIRES_MANUAL_REVIEW` حالة **INCONCLUSIVE** صريحة وليست قبولاً. لا يسمح هذا الجرد بتشغيل أو اعتماد أي زر دون فحص عقده وسياق الملكية.

## التوزيع بحسب التطبيق

| التطبيق | Server-call مرشح | Fail-closed مرشح | محلي/تنقل مرشح | Local-feedback مرشح | يحتاج مراجعة يدوية |
|---|---:|---:|---:|---:|---:|
| patient | 0 | 0 | 8 | 2 | 42 |
| provider | 105 | 14 | 265 | 49 | 456 |
| admin | 6 | 0 | 90 | 0 | 60 |

## ملفات ذات أولوية للمراجعة التعاقدية

| التطبيق | الملف | جميع الأفعال | Server-call | Fail-closed | يحتاج مراجعة يدوية |
|---|---|---:|---:|---:|---:|
| provider | `src/screens/doctor/DoctorDashboard.tsx` | 101 | 7 | 2 | 48 |
| provider | `src/screens/nursing/NursingDashboard.tsx` | 58 | 18 | 1 | 31 |
| provider | `src/screens/lab/LabDashboard.tsx` | 69 | 16 | 1 | 28 |
| provider | `src/screens/facility/FacilityDashboard.tsx` | 67 | 6 | 1 | 29 |
| provider | `src/screens/lab/LabRegistration.tsx` | 46 | 0 | 0 | 33 |
| provider | `src/screens/radiology/RadiologyRegistration.tsx` | 46 | 0 | 0 | 33 |
| provider | `src/screens/nursing/NursingRegistration.tsx` | 39 | 0 | 0 | 30 |
| provider | `src/screens/shared/SharedScreens.tsx` | 78 | 8 | 4 | 21 |
| provider | `src/components/ui.tsx` | 36 | 1 | 0 | 27 |
| provider | `src/screens/pharmacy/PharmacyRegistration.tsx` | 35 | 0 | 0 | 27 |
| provider | `src/screens/pharmacy/PharmacyDashboard.tsx` | 43 | 9 | 0 | 17 |
| provider | `src/screens/doctor/DoctorRegistration.tsx` | 37 | 0 | 0 | 23 |
| provider | `src/screens/radiology/RadiologyDashboard.tsx` | 36 | 10 | 0 | 13 |
| provider | `src/screens/shared/BlueprintScreens.tsx` | 31 | 7 | 1 | 16 |
| provider | `src/screens/facility/FacilityRegistration.tsx` | 35 | 0 | 0 | 22 |
| patient | `src/components/ui.tsx` | 14 | 0 | 0 | 14 |
| provider | `src/screens/auth/AuthScreens.tsx` | 19 | 2 | 0 | 10 |
| provider | `src/screens/ambulance/AmbulanceDashboard.tsx` | 11 | 2 | 0 | 6 |
| admin | `src/pages/admin/users-management.tsx` | 10 | 0 | 0 | 8 |
| admin | `src/pages/admin/medicines-catalog.tsx` | 14 | 0 | 0 | 6 |
| provider | `src/screens/doctor/DoctorOpsScreens.tsx` | 7 | 3 | 0 | 3 |
| admin | `src/pages/login.tsx` | 10 | 5 | 0 | 0 |
| provider | `src/screens/nursing/NursingFieldOps.tsx` | 9 | 0 | 0 | 5 |
| admin | `src/pages/admin/insurance-queue.tsx` | 12 | 0 | 0 | 4 |
| provider | `src/screens/lab/LabQcActions.tsx` | 11 | 0 | 0 | 4 |
| patient | `src/components/Header.tsx` | 8 | 0 | 0 | 4 |
| admin | `src/pages/admin/sos-monitor.tsx` | 6 | 0 | 0 | 4 |
| provider | `src/screens/shared/FleetScreen.tsx` | 5 | 1 | 0 | 3 |
| patient | `src/design-system/components/SearchBar.tsx` | 4 | 0 | 0 | 4 |
| patient | `src/design-system/components/States.tsx` | 4 | 0 | 0 | 4 |
| provider | `src/screens/shared/RegistrationSuccess.tsx` | 4 | 3 | 0 | 1 |
| admin | `src/pages/admin/provider-moderation.tsx` | 10 | 0 | 0 | 3 |
| provider | `src/screens/shared/RealScreens.tsx` | 6 | 2 | 1 | 1 |
| admin | `src/pages/admin/shortage-reports.tsx` | 6 | 0 | 0 | 3 |
| provider | `src/screens/shared/VideoCallRoom.tsx` | 5 | 2 | 0 | 1 |
| admin | `src/pages/admin/ambulance-fleet.tsx` | 5 | 0 | 0 | 3 |
| provider | `src/screens/auth/PendingDashboard.tsx` | 4 | 1 | 1 | 2 |
| admin | `src/pages/admin/catalog-manager.tsx` | 8 | 0 | 0 | 2 |
| admin | `src/pages/admin/dashboard.tsx` | 6 | 0 | 0 | 2 |
| admin | `src/pages/admin/payouts.tsx` | 6 | 0 | 0 | 2 |

## حدود الإثبات

التصنيف الثابت لا يستبدل فحص handler عابر الملفات، ولا يثبت schema أو role أو ownership أو transition أو persistence أو audit. يستخدم Phase 14 هذه الخريطة لتصحيح/احتواء العيوب المؤكدة، وتستخدم Phase 16 traces حقيقية لإغلاق حالات INCONCLUSIVE المتبقية.

