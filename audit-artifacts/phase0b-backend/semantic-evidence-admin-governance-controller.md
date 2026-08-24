# Phase 0B semantic evidence — admin-governance.controller.ts

**Archive member:** `src/modules/admin-web-core/controllers/admin-governance.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–46; full 46-line member covered.

Lines 2–9 import Mongoose models for SystemConfigExtended, FraudAlert and AuditLog, Redis, CurrentUser/Roles and UserRole. Lines 11–13 define `AdminGovernanceController` at `admin/governance` with class-level `@Roles(UserRole.ADMIN)`.

Lines 14–23 declare a Redis client that is never initialized; the constructor injects config/fraud/audit models and comments out Redis connection setup. Lines 25–31 expose PUT `trigger-emergency-maintenance`; it accepts an untyped inline payload and always throws ServiceUnavailableException, explicitly refusing to persist/claim maintenance because Redis dispatch, immutable attribution, two-person approval and recovery verification are not implemented.

Lines 33–38 expose GET `fraud-alerts`, querying the injected FraudAlert model sorted by createdAt and capped at 100, returning documents directly. Lines 40–45 expose GET `audit-logs`, querying AuditLog similarly and returning documents directly.

**Audit judgment:** The emergency path is positively fail-closed and its dedicated spec confirms no config mutation when unavailable. The read routes have class-level admin role intent but no visible pagination, query bounds, field projection/redaction, cursor/retention contract or explicit tenant/ABAC filter; their actual enforcement depends on global guard configuration. Returning raw alert/audit documents may expose provider/user identifiers, metadata or operational PII. The injected FraudAlert model also participates in the duplicate FraudAlert domain-model issue documented separately.

No product code was changed and no tests were executed during this semantic read.
