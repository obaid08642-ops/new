# Nabdah master plan completeness gap review — 2026-08-18

## Review result

The master plan already covers the four products, the major service families, the universal journey, screen/button/state completeness, Backend/Database contracts, security, payments, communications, localization, devices, builds, E2E, and release gates. The following cross-cutting areas were not explicit enough and are now added as mandatory gates rather than assumed to be covered by a general heading.

## Newly explicit cross-cutting gates

| Area | Required validation |
|---|---|
| Search/discovery and catalogs | Search relevance, filters, sorting, pagination, empty results, provider/service/medicine/test catalogs, price/availability freshness, deep links, and no stale or fabricated catalog entries |
| Pricing and commercial rules | Price source, taxes/fees/commission, discounts/promotions, copay, rounding/currency, quote expiry, price changes, and patient/provider/admin agreement |
| Fraud and abuse | OTP brute force, account enumeration, fake provider/patient actions, coupon/ledger abuse, duplicate orders, replayed webhooks, file abuse, chat spam, rating abuse, suspicious location/device, and admin audit |
| Privacy and compliance | Consent scope/revocation, minimum necessary access, retention/deletion/export, medical-file access logs, insurance data minimization, legal text versioning, and incident response |
| Observability and operations | Structured logs, correlation IDs, metrics, traces, alert thresholds, dead-letter queues, retry visibility, health/readiness, deploy/rollback, and production-safe error messages |
| Backup and recovery | Database backup/restore drills, storage recovery, Redis/session recovery, migration rollback, data-integrity checks, RPO/RTO evidence, and disaster runbook |
| Scalability and reliability | Queue behavior, idempotency, rate limits, connection pooling, cache invalidation, WebSocket multi-instance readiness, load/soak tests, horizontal scaling, and degradation behavior |
| Web, SEO, GEO, and sharing | Public pages, canonical URLs, sitemap/robots, structured data, localized metadata, link previews, dynamic service/provider/medicine pages, crawler behavior, and no claims of guaranteed ranking |
| Accessibility and design system | Keyboard/screen reader labels, focus order, contrast, touch targets, dynamic type, RTL mirroring, reduced motion, empty/error clarity, and consistency across applications |
| Store/release operations | Android/iOS/Huawei builds where supported, signing/secrets, privacy manifests, permissions, deep links, push certificates, crash reporting, TestFlight/Play internal track, rollback, and release notes |
| Content governance | Translation completeness, medical/legal copy review, versioned consent and policy text, provider-generated content moderation, prohibited fabricated reviews/ratings, and safe AI disclosures |
| Support and incident operations | Ticket escalation, SLA/status, refund/dispute handoff, user communication during outage, admin runbooks, audit trail, and closure verification |

## Scope decision

These are additions to the existing plan, not replacements. They must be mapped to Patient, Provider, Admin, Backend, Database, and each service journey. A workflow cannot be closed while a critical cross-cutting dependency is untested; it is marked `BLOCKED` with the exact missing evidence.
