# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PLAN_COMPLETENESS_GAP_REVIEW_20260818.md`
- **Member SHA-256:** `77d041d009ddac6cb00b32ac246c390bbdfedf13130423d41ae192156483c3ba`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The master plan already covers the four products, the major service families, the universal journey, screen/button/state completeness, Backend/Database contracts, security, payments, communications, localization, devices, builds, E2E, and r`
- `15: | Observability and operations | Structured logs, correlation IDs, metrics, traces, alert thresholds, dead-letter queues, retry visibility, health/readiness, deploy/rollback, and production-safe error messages |`
- `16: | Backup and recovery | Database backup/restore drills, storage recovery, Redis/session recovery, migration rollback, data-integrity checks, RPO/RTO evidence, and disaster runbook |`
- `18: | Web, SEO, GEO, and sharing | Public pages, canonical URLs, sitemap/robots, structured data, localized metadata, link previews, dynamic service/provider/medicine pages, crawler behavior, and no claims of guaranteed ranking |`
- `19: | Accessibility and design system | Keyboard/screen reader labels, focus order, contrast, touch targets, dynamic type, RTL mirroring, reduced motion, empty/error clarity, and consistency across applications |`
- `22: | Support and incident operations | Ticket escalation, SLA/status, refund/dispute handoff, user communication during outage, admin runbooks, audit trail, and closure verification |`
### backend_consumers_or_contracts
- `17: | Scalability and reliability | Queue behavior, idempotency, rate limits, connection pooling, cache invalidation, WebSocket multi-instance readiness, load/soak tests, horizontal scaling, and degradation behavior |`
### auth_ownership
- `12: | Pricing and commercial rules | Price source, taxes/fees/commission, discounts/promotions, copay, rounding/currency, quote expiry, price changes, and patient/provider/admin agreement |`
- `13: | Fraud and abuse | OTP brute force, account enumeration, fake provider/patient actions, coupon/ledger abuse, duplicate orders, replayed webhooks, file abuse, chat spam, rating abuse, suspicious location/device, and admin audit |`
- `16: | Backup and recovery | Database backup/restore drills, storage recovery, Redis/session recovery, migration rollback, data-integrity checks, RPO/RTO evidence, and disaster runbook |`
- `20: | Store/release operations | Android/iOS/Huawei builds where supported, signing/secrets, privacy manifests, permissions, deep links, push certificates, crash reporting, TestFlight/Play internal track, rollback, and release notes |`
- `22: | Support and incident operations | Ticket escalation, SLA/status, refund/dispute handoff, user communication during outage, admin runbooks, audit trail, and closure verification |`
- `26: These are additions to the existing plan, not replacements. They must be mapped to Patient, Provider, Admin, Backend, Database, and each service journey. A workflow cannot be closed while a critical cross-cutting dependency is untested; it `
### state_transitions
- `5: The master plan already covers the four products, the major service families, the universal journey, screen/button/state completeness, Backend/Database contracts, security, payments, communications, localization, devices, builds, E2E, and r`
- `11: | Search/discovery and catalogs | Search relevance, filters, sorting, pagination, empty results, provider/service/medicine/test catalogs, price/availability freshness, deep links, and no stale or fabricated catalog entries |`
- `15: | Observability and operations | Structured logs, correlation IDs, metrics, traces, alert thresholds, dead-letter queues, retry visibility, health/readiness, deploy/rollback, and production-safe error messages |`
- `19: | Accessibility and design system | Keyboard/screen reader labels, focus order, contrast, touch targets, dynamic type, RTL mirroring, reduced motion, empty/error clarity, and consistency across applications |`
- `22: | Support and incident operations | Ticket escalation, SLA/status, refund/dispute handoff, user communication during outage, admin runbooks, audit trail, and closure verification |`
### payment_insurance_relevance
- `5: The master plan already covers the four products, the major service families, the universal journey, screen/button/state completeness, Backend/Database contracts, security, payments, communications, localization, devices, builds, E2E, and r`
- `11: | Search/discovery and catalogs | Search relevance, filters, sorting, pagination, empty results, provider/service/medicine/test catalogs, price/availability freshness, deep links, and no stale or fabricated catalog entries |`
- `12: | Pricing and commercial rules | Price source, taxes/fees/commission, discounts/promotions, copay, rounding/currency, quote expiry, price changes, and patient/provider/admin agreement |`
- `14: | Privacy and compliance | Consent scope/revocation, minimum necessary access, retention/deletion/export, medical-file access logs, insurance data minimization, legal text versioning, and incident response |`
- `22: | Support and incident operations | Ticket escalation, SLA/status, refund/dispute handoff, user communication during outage, admin runbooks, audit trail, and closure verification |`
### error_empty_loading_retry_cancel
- `11: | Search/discovery and catalogs | Search relevance, filters, sorting, pagination, empty results, provider/service/medicine/test catalogs, price/availability freshness, deep links, and no stale or fabricated catalog entries |`
- `15: | Observability and operations | Structured logs, correlation IDs, metrics, traces, alert thresholds, dead-letter queues, retry visibility, health/readiness, deploy/rollback, and production-safe error messages |`
- `19: | Accessibility and design system | Keyboard/screen reader labels, focus order, contrast, touch targets, dynamic type, RTL mirroring, reduced motion, empty/error clarity, and consistency across applications |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
