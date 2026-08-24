# Phase 0B semantic evidence — permissions.ts

**Archive member:** `src/common/permissions.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–171 from the baseline archive extraction.

Lines 1–40 define the Permission enum across doctor, appointment, prescription, pharmacy inventory, lab/radiology results, facility, impersonation, user, export, and backup operations. Lines 42–47 define OwnershipOptions with model/owner/provider/param fields. Lines 49–50 expose `CheckOwnership` metadata.

Lines 52–167 define ROLE_PERMISSIONS for super-admin, admin, support, finance, patient, doctor, pharmacist, pharmacy, hospital, lab, radiology, nurse, home-care, physiotherapist, delivery, guest, nursing, ambulance, hospital-admin, branch-admin, and receptionist. Lines 169–170 expose `RequirePermissions` metadata.

**Auth/ownership:** this member defines declarative permission and ownership metadata only; enforcement is delegated to guards/interceptors/controllers. The ownership abstraction assumes model/field/param conventions that must match actual schemas.

**State transitions:** none.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** role matrix grants broad patient `USER_READ/USER_EDIT`, support `USER_IMPERSONATE`, and finance `DATA_EXPORT`; there is no pharmacy order/payment-specific permission, no explicit distinction between own versus all resources in permission strings, and no visible deny-overrides or tenant/branch scope. Permission coverage may therefore depend entirely on ownership guards and controller checks. Role aliases (`PHARMACIST`/`PHARMACY`, `NURSE`/`NURSING`, etc.) require normalization consistency.

**Test implications:** role permission matrix, unknown-role behavior, ownership metadata enforcement, patient self-only isolation, support impersonation scope, finance export scope, pharmacy/provider separation, role aliases, and controller guard composition. No tests executed during this semantic read.

**Consumer traceability:** guard/decorator usage mapping will feed the dedicated route-to-consumer phase.
