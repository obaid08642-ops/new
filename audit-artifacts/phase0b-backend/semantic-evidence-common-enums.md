# Phase 0B semantic evidence — common/enums.ts

**Archive member:** `src/common/enums.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–220 and 221–334 from the baseline archive extraction; the second range closed the truncation boundary.

Lines 2–23 define UserRole values including patient, provider-side aliases, admin/support/finance, guest, delivery, nursing, and pharmacist. Lines 25–58 define `PROVIDER_ROLES` and `isProviderRole`, which lower-case the role and additionally accept literal `provider`, admin, and super-admin.

Lines 60–77 define ProviderType and ProviderStatus. Lines 79–111 define the legacy OrderState and OrderRejectionReason values, including pharmacy, insurance, fulfillment, delivery, escalation, and cancellation states. Lines 113–139 define PrescriptionState, EmergencyState, and MedicationDoseState. Lines 141–166 define AppointmentMode, AppointmentStatus, and DeliveryState. Lines 168–184 define NotificationType and NotificationPriority.

Lines 186–203 define academic-degree values, list export, and Saudi insurance-company slugs. Lines 205–250 define SPECIALTY_MASTER with bilingual specialty slugs, including general practice, medical/surgical specialties, mental health, pregnancy/IVF, laboratory, and radiology.

Lines 252–258 define FacilityType. Lines 260–281 define a second legacy OrderState transition table. Lines 283–292 define EmergencyState transitions. Lines 294–309 define the unified seven-state ServiceState lifecycle across pharmacy/lab/radiology/nursing/consultation. Lines 311–319 define unified transitions. Lines 321–334 define ServiceDomain and PrescriptionState transitions.

**Auth/ownership:** role aliases and provider-role normalization are centralized here; ownership is not enforced. Accepting literal `provider` plus admin/super-admin in `isProviderRole` broadens provider-scope behavior.

**State transitions:** multiple parallel order transition systems exist: legacy OrderState, pharmacy-specific states elsewhere, and unified ServiceState. These are intended to coexist but require explicit mapping and can drift.

**Price/payment/insurance source:** insurance company names are constants only; no validation/coverage logic visible.

**Security/truthfulness observations:** provider/admin role broadening can grant provider-scope to admin paths if callers use only `isProviderRole`; role aliases may diverge from `ROLE_PERMISSIONS`; hard-coded Saudi insurance/specialty registries can become stale; duplicate OrderState/transition contracts create ambiguity; transition tables are plain objects without runtime validation or versioning.

**Test implications:** role normalization, provider alias scope, permission consistency, all transition tables, unified-domain mapping, specialty/insurance registry freshness, and enum serialization. No tests executed during this semantic read.

**Consumer traceability:** role/state enum usage mapping will feed the dedicated route-to-consumer phase.
