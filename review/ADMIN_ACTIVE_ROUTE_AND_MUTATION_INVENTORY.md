# ADMIN_ACTIVE_ROUTE_AND_MUTATION_INVENTORY

**Generated from source:** backend controllers, admin pages, and BFF files. Manual authority review is required for each row.

| Method + normalized path | Controller | Handler | Permission/role evidence | Verdict |
|---|---|---|---|---|
| `GET /` | `backend/src/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/liveness` | `backend/src/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/readiness` | `backend/src/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/referrals/report` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/loyalty/overview` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/users/:param/overview` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/disputes` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/users` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/users/stats` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/sub-admins` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/sub-admins` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/sub-admins/:param` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `DELETE /admin/sub-admins/:param` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/providers/create` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/users/:param/ban` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/users/:param/unban` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `DELETE /admin/users/:param` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/approve/:param` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/suspend/:param` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/provider-deltas` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/provider-deltas/:param/approve` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/provider-deltas/:param/reject` | `backend/src/modules/admin/admin.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/analytics-suite/funnels` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ; UserRole.ADMIN` | `canonical` |
| `GET /admin/analytics-suite/cohorts` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ; Permission.ANALYTICS_READ` | `canonical` |
| `GET /admin/analytics-suite/provider-league` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ; Permission.ANALYTICS_READ` | `canonical` |
| `GET /admin/analytics-suite/search` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ; Permission.ANALYTICS_READ` | `canonical` |
| `GET /admin/analytics-suite/nps` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ; Permission.ANALYTICS_READ` | `canonical` |
| `GET /admin/analytics-suite/anomalies` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.ANALYTICS_READ; Permission.ANALYTICS_READ` | `canonical` |
| `GET /admin/analytics-suite` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.SCHEDULED_REPORTS_MANAGE; Permission.SCHEDULED_REPORTS_MANAGE; UserRole.ADMIN` | `canonical` |
| `POST /admin/analytics-suite` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.SCHEDULED_REPORTS_MANAGE; Permission.SCHEDULED_REPORTS_MANAGE` | `canonical` |
| `PATCH /admin/analytics-suite/:param` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.SCHEDULED_REPORTS_MANAGE` | `canonical` |
| `POST /admin/analytics-suite/:param/run` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.OPS_CRONS_RUN` | `canonical` |
| `GET /admin/analytics-suite/:param/runs` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.SCHEDULED_REPORTS_MANAGE; Permission.SCHEDULED_REPORTS_MANAGE` | `canonical` |
| `DELETE /admin/analytics-suite/:param` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` | `method` | `Permission.SCHEDULED_REPORTS_MANAGE; Permission.SCHEDULED_REPORTS_MANAGE` | `canonical` |
| `GET /admin/cms/articles` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` | `method` | `Permission.CMS_EDIT` | `canonical` |
| `POST /admin/cms/articles` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/cms/:param/publish` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/cms/:param/schedule` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/cms/:param/unpublish` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/coupons` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `Permission.COUPONS_MANAGE` | `canonical` |
| `POST /admin/coupons` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `Permission.COUPONS_MANAGE` | `canonical` |
| `PATCH /admin/coupons/:param` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/coupons/validate` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/coupons/redeem` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `guard-only` | `canonical` |
| `DELETE /admin/coupons/:param` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/crm/patients` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /admin/crm/patients/:param/360` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.CRM_READ` | `canonical` |
| `POST /admin/crm/patients/:param/legacy-impersonate-disabled` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.USER_IMPERSONATE` | `canonical` |
| `GET /admin/crm/requests` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.GDPR_MANAGE` | `canonical` |
| `POST /admin/crm/requests` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.GDPR_MANAGE` | `canonical` |
| `POST /admin/crm/:param/start` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.GDPR_MANAGE` | `canonical` |
| `POST /admin/crm/:param/export/complete` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.GDPR_MANAGE` | `canonical` |
| `POST /admin/crm/:param/delete/complete` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` | `method` | `Permission.GDPR_MANAGE` | `canonical` |
| `GET /admin/disputes` | `backend/src/modules/admin-enterprise/admin-disputes.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/disputes/:param` | `backend/src/modules/admin-enterprise/admin-disputes.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/disputes/:param/resolve` | `backend/src/modules/admin-enterprise/admin-disputes.controller.ts` | `method` | `Permission.DISPUTES_RESOLVE` | `canonical` |
| `GET /admin/finance/revenue` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_READ; UserRole.ADMIN` | `canonical` |
| `GET /admin/finance/commissions` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_READ; Permission.FINANCE_CONFIG_EDIT` | `canonical` |
| `POST /admin/finance/commissions/config` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_READ; Permission.FINANCE_CONFIG_EDIT; Permission.FINANCE_READ` | `canonical` |
| `GET /admin/finance/reconciliation` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_CONFIG_EDIT; Permission.FINANCE_READ; Permission.FINANCE_READ` | `canonical` |
| `GET /admin/finance/payouts` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_READ; Permission.FINANCE_READ; Permission.FINANCE_PAYOUT_APPROVE` | `canonical` |
| `POST /admin/finance/payouts/:param/approve` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_READ; Permission.FINANCE_PAYOUT_APPROVE; Permission.FINANCE_PAYOUT_APPROVE` | `canonical` |
| `POST /admin/finance/payouts/:param/reject` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_PAYOUT_APPROVE; Permission.FINANCE_PAYOUT_APPROVE; Permission.FINANCE_READ` | `canonical` |
| `GET /admin/finance/providers/:param/statement` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` | `method` | `Permission.FINANCE_PAYOUT_APPROVE; Permission.FINANCE_READ` | `canonical` |
| `GET /admin/governance-controls/home-curation` | `backend/src/modules/admin-enterprise/admin-governance-controls.controller.ts` | `method` | `Permission.CMS_EDIT; Permission.CMS_EDIT; UserRole.ADMIN` | `canonical` |
| `POST /admin/governance-controls/home-curation` | `backend/src/modules/admin-enterprise/admin-governance-controls.controller.ts` | `method` | `Permission.CMS_EDIT; Permission.CMS_EDIT` | `canonical` |
| `GET /admin/governance-controls/feature-flags` | `backend/src/modules/admin-enterprise/admin-governance-controls.controller.ts` | `method` | `Permission.OPS_QUEUES_MANAGE` | `canonical` |
| `POST /admin/governance-controls/feature-flags` | `backend/src/modules/admin-enterprise/admin-governance-controls.controller.ts` | `method` | `Permission.OPS_QUEUES_MANAGE` | `canonical` |
| `POST /admin/impersonation/start` | `backend/src/modules/admin-enterprise/admin-impersonation.controller.ts` | `method` | `Permission.USER_IMPERSONATE; UserRole.ADMIN` | `canonical` |
| `POST /admin/impersonation/:param/revoke` | `backend/src/modules/admin-enterprise/admin-impersonation.controller.ts` | `method` | `Permission.USER_IMPERSONATE` | `canonical` |
| `GET /admin/impersonation` | `backend/src/modules/admin-enterprise/admin-impersonation.controller.ts` | `method` | `Permission.USER_IMPERSONATE` | `canonical` |
| `GET /admin/ops/queues` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `Permission.OPS_QUEUES_MANAGE` | `canonical` |
| `GET /admin/ops/queues/:param/jobs` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/ops/queues/:param/jobs/:param/retry` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/ops/queues/:param/retry-failed` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/ops/translations` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `Permission.TRANSLATIONS_EDIT` | `canonical` |
| `POST /admin/ops/translations` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/ops/seo/controls` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `Permission.SEO_CONTROL` | `canonical` |
| `POST /admin/ops/seo/controls` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` | `method` | `Permission.SEO_CONTROL` | `canonical` |
| `GET /admin/orders` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_READ; UserRole.ADMIN` | `canonical` |
| `GET /admin/orders/export` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ANALYTICS_EXPORT` | `canonical` |
| `GET /admin/orders/:param/:param` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_READ; Permission.ORDER_CANCEL` | `canonical` |
| `POST /admin/orders/:param/:param/cancel` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_READ; Permission.ORDER_CANCEL; Permission.ORDER_REFUND` | `canonical` |
| `POST /admin/orders/:param/:param/refund` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_CANCEL; Permission.ORDER_REFUND; Permission.ORDER_COMPENSATE` | `canonical` |
| `POST /admin/orders/:param/:param/compensate` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_REFUND; Permission.ORDER_COMPENSATE; Permission.ORDER_REASSIGN` | `canonical` |
| `POST /admin/orders/:param/:param/reassign` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_COMPENSATE; Permission.ORDER_REASSIGN; Permission.ORDER_NOTE_ADD` | `canonical` |
| `POST /admin/orders/:param/:param/note` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_REASSIGN; Permission.ORDER_NOTE_ADD; Permission.ORDER_SLA_EXTEND` | `canonical` |
| `POST /admin/orders/:param/:param/sla-extend` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` | `method` | `Permission.ORDER_NOTE_ADD; Permission.ORDER_SLA_EXTEND` | `canonical` |
| `GET /admin/audit` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.DATA_EXPORT` | `canonical` |
| `GET /admin/session` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.USER_READ` | `canonical` |
| `GET /admin/rbac/catalog` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.RBAC_MANAGE` | `canonical` |
| `GET /admin/rbac/roles` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.RBAC_MANAGE` | `canonical` |
| `POST /admin/rbac/roles` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.RBAC_MANAGE` | `canonical` |
| `PATCH /admin/rbac/roles/:param` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.RBAC_MANAGE` | `canonical` |
| `DELETE /admin/rbac/roles/:param` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.RBAC_MANAGE` | `canonical` |
| `POST /admin/rbac/users/:param/roles` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` | `method` | `Permission.USER_EDIT, Permission.RBAC_MANAGE` | `canonical` |
| `GET /admin/segments/fields` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `Permission.CRM_READ; Permission.CRM_READ; UserRole.ADMIN` | `canonical` |
| `GET /admin/segments` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `Permission.CRM_READ; Permission.CRM_READ` | `canonical` |
| `POST /admin/segments/preview` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `Permission.CRM_READ` | `canonical` |
| `POST /admin/segments` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `guard-only` | `canonical` |
| `DELETE /admin/segments/:param` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/segments/:param/members` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` | `method` | `Permission.CRM_READ` | `canonical` |
| `GET /admin/command-center-v2` | `backend/src/modules/admin-enterprise/command-center-v2.controller.ts` | `method` | `Permission.COMMAND_CENTER_VIEW` | `canonical` |
| `GET /privacy/requests` | `backend/src/modules/admin-enterprise/patient-gdpr.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /privacy/requests` | `backend/src/modules/admin-enterprise/patient-gdpr.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /privacy/exports/fetch` | `backend/src/modules/admin-enterprise/patient-gdpr.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /b2b/requests` | `backend/src/modules/admin-governance/b2b.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /b2b/requests/:param/approve` | `backend/src/modules/admin-governance/b2b.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /b2b/requests/:param/reject` | `backend/src/modules/admin-governance/b2b.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/governance/system-config` | `backend/src/modules/admin-governance/system-config.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `PUT /admin/governance/system-config` | `backend/src/modules/admin-governance/system-config.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/config/sla` | `backend/src/modules/admin-web-core/controllers/admin-config.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `PUT /admin/config/sla` | `backend/src/modules/admin-web-core/controllers/admin-config.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /admin/extended-operations/procurement/pending` | `backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/extended-operations/issue-quote/:param` | `backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts` | `method` | `guard-only` | `canonical` |
| `PUT /admin/governance/trigger-emergency-maintenance` | `backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/governance/fraud-alerts` | `backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/governance/audit-logs` | `backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /nabd-extensions/admin/analytics/heatmaps` | `backend/src/modules/admin-web-core/controllers/analytics.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/finance/commissions` | `backend/src/modules/admin-web-core/controllers/finance.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/finance/withdrawals/pending` | `backend/src/modules/admin-web-core/controllers/finance.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/finance/withdrawals/:param/execute` | `backend/src/modules/admin-web-core/controllers/finance.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/finance/withdrawals/:param/reject` | `backend/src/modules/admin-web-core/controllers/finance.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /providers/provider-deltas` | `backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /providers/provider-deltas/:param/approve` | `backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /providers/provider-deltas/:param/reject` | `backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /system-health/liveness` | `backend/src/modules/admin-web-core/controllers/system-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /system-health/readiness` | `backend/src/modules/admin-web-core/controllers/system-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /ai/config` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /ai/config` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /ai/admin/gateway` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /ai/admin/gateway/provider/:param` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /ai/admin/gateway/mode` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /ai/admin/usage` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /ai/triage` | `backend/src/modules/ai/ai.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /ai/triage/history` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/voice-to-order` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/prescription-ocr` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/parse-excel` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/copilot/suggest` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/ocr-translate` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/skin-analysis` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/medicine-image-search` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/barcode-lookup` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/analyze-meal` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/analyze-report` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/generate-exercise-plan` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /ai/generate-diet-plan` | `backend/src/modules/ai/ai.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/resolve/:param/:param` | `backend/src/modules/articles/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/otp/request` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/otp/verify` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/session/exchange` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/password/forgot` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/password/reset` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/register` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/login` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/guest` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/convert-guest` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/login/verify-2fa` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /auth/me` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /auth/trusted-devices` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /auth/trusted-devices/:param` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/heartbeat` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /auth/sessions/online` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/refresh` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/logout-all` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/consent` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/logout` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/send-otp` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/verify-otp` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/reset-password` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/social-login` | `backend/src/modules/auth/auth.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/passkey/enroll/options` | `backend/src/modules/auth/passkey.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/passkey/enroll/verify` | `backend/src/modules/auth/passkey.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /auth/passkey/devices` | `backend/src/modules/auth/passkey.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /auth/passkey/devices/:param` | `backend/src/modules/auth/passkey.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /auth/passkey/login/verify` | `backend/src/modules/auth/passkey.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /bans` | `backend/src/modules/bans/bans.controller.ts` | `method` | `UserRole.SUPER_ADMIN, UserRole.ADMIN` | `read-only` |
| `DELETE /bans/:param` | `backend/src/modules/bans/bans.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /bans` | `backend/src/modules/bans/bans.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /care/appointments` | `backend/src/modules/care/appointments.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/appointments` | `backend/src/modules/care/appointments.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/appointments/:param` | `backend/src/modules/care/appointments.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /care/appointments/waitlist/join` | `backend/src/modules/care/appointments.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /care/appointments/:param/cancel` | `backend/src/modules/care/appointments.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /care/appointments/:param/reschedule` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN` | `read-only` |
| `PATCH /care/appointments/:param/confirm` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.ADMIN, UserRole.PATIENT` | `read-only` |
| `PATCH /care/appointments/:param/check-in` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.ADMIN, UserRole.PATIENT; UserRole.DOCTOR, UserRole.ADMIN` | `read-only` |
| `PATCH /care/appointments/:param/start` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN, UserRole.PATIENT; UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.ADMIN` | `read-only` |
| `PATCH /care/appointments/:param/complete` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.HOME_CARE` | `read-only` |
| `POST /care/appointments/:param/finish` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN; UserRole.DOCTOR, UserRole.HOME_CARE` | `read-only` |
| `GET /care/appointments/:param/summary` | `backend/src/modules/care/appointments.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.HOME_CARE` | `read-only` |
| `GET /care/specialties` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/insurance` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/degrees` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/doctors` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/doctors/:param` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/doctors/:param/slots` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/search` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/facilities` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/facilities/:param` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /care/specialties` | `backend/src/modules/care/care.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /provider/doctor-engine/synchronize-settings` | `backend/src/modules/care/doctor-integration.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/doctor-engine/finalize-encounter` | `backend/src/modules/care/doctor-integration.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/doctor-referrals/my-referrals/:param` | `backend/src/modules/care/doctor-referrals.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/doctor-referrals/issue-referrals-and-prescription` | `backend/src/modules/care/doctor-referrals.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /provider/doctor-referrals/diagnostic-callback/:param` | `backend/src/modules/care/doctor-referrals.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /community/posts` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /community/posts` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /community/posts/:param` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /community/posts/:param/comment` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /community/posts/:param/vote` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /community/posts/:param` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /community/admin/pending` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /community/admin/:param/moderate` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /community/live-sessions` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /community/live-sessions` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /community/live-sessions/:param/join` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /community/live-sessions/:param/status` | `backend/src/modules/community/community.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /config` | `backend/src/modules/config/config.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /calls/ice/config` | `backend/src/modules/coturn/coturn.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /calls/ice/credentials` | `backend/src/modules/coturn/coturn.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /custom-services` | `backend/src/modules/custom-services/custom-services.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /custom-services/mine` | `backend/src/modules/custom-services/custom-services.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /custom-services/:param` | `backend/src/modules/custom-services/custom-services.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /custom-services/admin/list` | `backend/src/modules/custom-services/custom-services.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /custom-services/admin/:param/status` | `backend/src/modules/custom-services/custom-services.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /drivers/online` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `POST /drivers/offline` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `GET /drivers/shift` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `POST /drivers/location` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `GET /drivers/:param/location` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `GET /drivers/orders/available` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `GET /drivers/orders/active` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `GET /drivers/orders/history` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `POST /drivers/orders/:param/accept` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `POST /drivers/orders/:param/pickup` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.DELIVERY` | `read-only` |
| `POST /drivers/orders/:param/deliver` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.DELIVERY; UserRole.ADMIN` | `read-only` |
| `GET /drivers/admin/online` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.DELIVERY; UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /drivers/available` | `backend/src/modules/drivers/drivers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /provider/ambulance/fleet` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/ambulance/fleet` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /provider/ambulance/fleet/:param` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /provider/ambulance/fleet/:param` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/ambulance/fleet` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `POST /provider/ambulance/fleet/:param/approve` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `POST /provider/ambulance/fleet/:param/reject` | `backend/src/modules/emergency/ambulance-fleet.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `POST /emergency/trigger` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /emergency/my/active` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /emergency/:param/cancel` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /emergency/driver/missions` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /emergency/:param/claim` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /emergency/tracking` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /emergency/:param/track` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /emergency/active` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /emergency/:param` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /emergency/:param/assign` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /emergency/:param/auto-dispatch` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /emergency/:param/resolve` | `backend/src/modules/emergency/emergency.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /export/patients` | `backend/src/modules/export/export.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /export/appointments` | `backend/src/modules/export/export.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /export/orders` | `backend/src/modules/export/export.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /export/transactions` | `backend/src/modules/export/export.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /export/audit-logs` | `backend/src/modules/export/export.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/create` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/my-group` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/invite` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/join` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/leave` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /family/member/:param/relation` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /family/members/:param/permissions` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /family/member/:param/permissions` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/member-records/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /family/members/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /family/remove-member/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/my-group/members` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/members` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/member-health/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/emergency-contacts` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/calendar/event` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/calendar` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /family/calendar/event/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /family/permissions/request` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /family/permissions/pending` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /family/permissions/respond/:param` | `backend/src/modules/family/family.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /feature-flags` | `backend/src/modules/feature-flags/feature-flags.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /feature-flags` | `backend/src/modules/feature-flags/feature-flags.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /feature-flags/:param` | `backend/src/modules/feature-flags/feature-flags.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /admin/health-dashboard` | `backend/src/modules/health/health-dashboard.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /health/vitals` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/vitals-log` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/vitals/chart` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/vitals/recent` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/vitals/latest` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/vitals/summary` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/score` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/vitals` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /health/vitals/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /health/vitals/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/wearables/link` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /health/wearables/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/reminders` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/reminders` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/reminders/:param/log` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/reminders/:param/refill` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/reminders/:param/refill/snooze` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/reminders/:param/refill/cancel` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /health/reminders/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /health/reminders/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/medications/:param/refill` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/sleep` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/sleep` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/reports` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/medications/reminders` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/prescriptions` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/emergency-contacts` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /health/emergency-contacts` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /health/emergency-contacts/:param` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/chronic-diseases` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/chronic-meds` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /health/trends` | `backend/src/modules/health/health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /home/offers` | `backend/src/modules/home/home.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /home/upcoming-appointment` | `backend/src/modules/home/home.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /home/search` | `backend/src/modules/home/home.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /home-care/tracking/verify-attendance/:param` | `backend/src/modules/home-care/controllers/home-care-tracking.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /home-care/tracking/submit-supplies-request` | `backend/src/modules/home-care/controllers/home-care-tracking.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/notes` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/notes/:param` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/catalog` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/admin/catalog` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /nursing/admin/catalog/:param` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /nursing/admin/catalog/:param` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/visits` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/visits/:param` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/visits/:param/tracking` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/respond` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/transit` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/arrive` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/start-care` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/no-show` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/emergency-abort` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nursing/visits/:param/complete` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/wallet` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/bookings/:param` | `backend/src/modules/home-care/home-care.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/branches` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/branches` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/departments` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/departments` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/staff` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/staff` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/doctors/onboard` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/appointments` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /hospital/appointments/:param/status` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/wallet` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/invitations` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/invitations` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /hospital/invitations/inbox` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /hospital/invitations/:param/respond` | `backend/src/modules/hospital/controllers/hospital.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /i18n` | `backend/src/modules/i18n/i18n.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /i18n/all` | `backend/src/modules/i18n/i18n.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /insurance/active` | `backend/src/modules/insurance/insurance.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /insurance/companies` | `backend/src/modules/insurance/insurance.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/queue` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/respond` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/collect-sample/:param` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/finalize-test/:param` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/catalog` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/catalog` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/wallet` | `backend/src/modules/labs/controllers/labs-engine.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /lab-results` | `backend/src/modules/labs/lab-results.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /lab-results/mine` | `backend/src/modules/labs/lab-results.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /lab-results/by-booking/:param` | `backend/src/modules/labs/lab-results.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /lab-results/:param` | `backend/src/modules/labs/lab-results.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/services` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/packages` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/categories` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/services/:param` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/mine` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/:param` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/cancel` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/bookings/:param/state` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/documents` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/bookings/:param/insurance` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/bookings/:param/items/:param/opt-in-cash` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/provider/inbox` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/assign-technician` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/upload-report` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/bookings/:param/reschedule` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/gps` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/bookings/:param/tracking` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/emergency` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/bookings/:param/reassign` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/admin/all` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/samples/register` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/samples/:param/stage` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/samples` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/admin/catalog` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /labs/admin/catalog/:param` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /labs/admin/catalog/:param` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /labs/admin/bookings/:param/force-state` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/packages/:param` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /labs/compatible-providers` | `backend/src/modules/labs/labs.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /legal/policy/:param/pdf` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /legal/archive/:param/pdf` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /legal/archive/:param/verify` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /admin/finance/commission-history` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /admin/audit-log` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `canonical` |
| `GET /provider/settlements` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /provider/settlements/excel` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/settlements/pdf` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /admin/providers/license-monitor/run` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /provider/insurance-matrix` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `PUT /provider/insurance-matrix` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /provider/sla` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /consents` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /consents/:param` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/legal/policy/:param/diff` | `backend/src/modules/legal/legal-enterprise.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /calls/provider/waiting-room` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/provider/ping-patient` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/provider/no-show` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/webhook` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/initiate` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/:param/join` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/:param/end` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/:param/reject` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /calls/:param/metrics` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /calls/history` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /calls/sessions/:param` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /calls/admin/rooms` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /calls/admin/analytics` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /calls/admin/rooms/:param/participants` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `POST /calls/admin/rooms/:param/mute/:param` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `POST /calls/admin/rooms/:param/remove/:param` | `backend/src/modules/livekit/livekit.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /loyalty/config` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/account` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/transactions` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/leaderboard` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/challenges` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /loyalty/challenges/:param/join` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/rewards` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /loyalty/rewards/:param/claim` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /loyalty/rewards/claimed` | `backend/src/modules/loyalty/loyalty.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /maternity/profile` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /maternity/content` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /maternity/profile` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /maternity/kicks` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /maternity/contractions` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /maternity/checkups/:param/toggle` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /maternity/infant-growth` | `backend/src/modules/maternity/maternity.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /media/upload` | `backend/src/modules/media/media.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /media/presigned` | `backend/src/modules/media/media.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /media/:param/url` | `backend/src/modules/media/media.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /media/*key` | `backend/src/modules/media/media.controller.ts` | `method` | `UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /medical-profile` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-profile/passport-token` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /medical-profile` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical-profile/chronic-diseases` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /medical-profile/chronic-diseases/:param` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical-profile/allergies` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /medical-profile/allergies/:param` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical-profile/surgeries` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /medical-profile/surgeries/:param` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical-profile/long-term-medications` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /medical-profile/long-term-medications/:param` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-profile/provider/:param` | `backend/src/modules/medical-profile/medical-profile.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-reports/timeline` | `backend/src/modules/medical-reports/medical-reports.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-reports/mine` | `backend/src/modules/medical-reports/medical-reports.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-reports/track/:param` | `backend/src/modules/medical-reports/medical-reports.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical-reports/:param` | `backend/src/modules/medical-reports/medical-reports.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical-reports` | `backend/src/modules/medical-reports/medical-reports.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | ` } from '../../common/permissions';

@Controller('medicines'` | `read-only` |
| `GET /medicines/autocomplete` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medicines/lookup-barcode` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/by-barcode/:param` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/categories` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/filters` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medicines/compare` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/hot` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/search/did-you-mean` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/search/trending` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/search/recent` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/hot/regenerate` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /medicines/:param/report-shortage` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/shortage-reports` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/shortage-reports/:param/approve` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/shortage-reports/:param/reject` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/catalog/:param/clear-shortage-badge` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/catalog/:param/availability` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/:param/suggest-image` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/image-suggestions` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/image-suggestions/:param/approve` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/image-suggestions/:param/reject` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/:param/suggest-change` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /medicines/suggest-new-item` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/change-requests` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/change-requests/:param/approve` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/change-requests/:param/reject` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_UPDATE, Permission.CATALOG_PRICE_WRITE; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `PATCH /medicines/admin/catalog/:param` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_UPDATE, Permission.CATALOG_PRICE_WRITE; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/catalog` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_UPDATE, Permission.CATALOG_PRICE_WRITE; Permission.CATALOG_READ; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/catalog` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_CREATE; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/catalog/:param/delete` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_CREATE; Permission.CATALOG_DELETE_RESTORE; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/catalog/:param/price-history` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_DELETE_RESTORE; Permission.CATALOG_READ; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/reports` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_READ; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/me/recently-viewed` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /medicines/:param` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/:param/details` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medicines/:param/alternatives` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medicines/manual-entry` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /medicines/admin/pending-review` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/catalog-legacy-disabled` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `DELETE /medicines/admin/catalog/:param/legacy-delete-disabled` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/:param/approve` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/:param/reject` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `PATCH /medicines/:param` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_IMPORT; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/import-json` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_IMPORT; Permission.CATALOG_IMPORT; UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /medicines/admin/import-csv` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `Permission.CATALOG_IMPORT; Permission.CATALOG_IMPORT; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /medicines/:param/:param.json` | `backend/src/modules/medicines/medicines.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /mental-health/mood` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/mood` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/mood/stats` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /mental-health/meditation` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/meditation` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/meditation/stats` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /mental-health/breathing` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/breathing` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/crisis-contacts` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /mental-health/crisis-contacts` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /mental-health/crisis-contacts/:param` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /mental-health/dashboard` | `backend/src/modules/mental-health/mental-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /notifications/:param/read` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/balance` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/credit` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/debit` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /referral/code` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /referral/claim` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /config/flags` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `PUT /admin/config/flags` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `GET /patients/timeline` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /patients/passport` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical/programs/enroll` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /medical/programs/active` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /medical/programs/complete-session` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/match/pharmacy` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/match/nurse` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/rankings` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /provider/fraud-alerts` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /nursing/attendance/verify` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nursing/visit/checklist` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/broadcast/respond` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/inventory/expiry` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/samples/barcode-verify` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /labs/results/verify` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/analytics/heatmaps` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `POST /admin/ads/bid` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `UserRole.ADMIN` | `canonical` |
| `POST /corporate/enroll` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /notifications` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /notifications/register-token` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /notifications/:param/read` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /notifications/read-all` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /notifications/admin/send` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /notifications/admin/schedule` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /notifications/admin/delivery-stats` | `backend/src/modules/notifications/notifications.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /nutrition/profile` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nutrition/profile` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nutrition/meals` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nutrition/meals` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nutrition/daily-summary` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nutrition/water` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nutrition/water` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /nutrition/exercise` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nutrition/exercise` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /nutrition/weekly-report` | `backend/src/modules/nutrition/nutrition.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/ops/overview` | `backend/src/modules/ops/ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/ops/requests` | `backend/src/modules/ops/ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/ops/traffic` | `backend/src/modules/ops/ops.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /orders/create` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PATIENT, UserRole.ADMIN` | `read-only` |
| `GET /orders/mine` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PATIENT, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/reorder` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /orders/:param/reorder-partial` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /orders/:param/cancel` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /orders/:param/approve-basket` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /orders/:param/reject-basket` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /orders/pharmacy/queue` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /orders/:param` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /orders/:param/report.pdf` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /orders/:param/tracking` | `backend/src/modules/orders/orders.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /orders/:param/items/:param/opt-in-cash` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.LAB, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.RADIOLOGY, UserRole.ADMIN` | `read-only` |
| `PATCH /orders/:param/insurance-approval` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.LAB, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.RADIOLOGY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/accept` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.LAB, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.RADIOLOGY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/reject` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/preparing` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/ready` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/partial` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN, UserRole.DELIVERY` | `read-only` |
| `POST /orders/:param/assign-delivery` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN, UserRole.DELIVERY; UserRole.DELIVERY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/delivery/update` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN, UserRole.DELIVERY; UserRole.DELIVERY, UserRole.ADMIN; UserRole.DELIVERY, UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/dispatch` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.DELIVERY, UserRole.ADMIN; UserRole.DELIVERY, UserRole.ADMIN; UserRole.DELIVERY, UserRole.ADMIN, UserRole.PHARMACY` | `read-only` |
| `POST /orders/:param/delivered` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.DELIVERY, UserRole.ADMIN; UserRole.DELIVERY, UserRole.ADMIN, UserRole.PHARMACY; UserRole.ADMIN` | `read-only` |
| `GET /orders` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.DELIVERY, UserRole.ADMIN, UserRole.PHARMACY; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /orders/admin/escalated` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /orders/:param/admin/transition` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/bids/place` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /orders/bids/:param/accept` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /orders/bids/request/:param` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /orders/bids/pharmacy/mine` | `backend/src/modules/orders/orders.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /payments/paymob/methods` | `backend/src/modules/payments/paymob.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /payments/paymob/initiate` | `backend/src/modules/payments/paymob.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /payments/paymob/verify` | `backend/src/modules/payments/paymob.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/payouts/request` | `backend/src/modules/payouts/provider-payouts.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/payouts/mine` | `backend/src/modules/payouts/provider-payouts.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/payouts/balance` | `backend/src/modules/payouts/provider-payouts.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /admin/procurement` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `'admin' as any` | `canonical` |
| `GET /admin/procurement/summary` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/procurement/:param/export` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/procurement/:param` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/procurement/:param/review` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /admin/procurement/:param/quotation` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `GET /admin/procurement/:param/quotation` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/procurement/:param/cancel` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `PATCH /admin/procurement/:param/complete` | `backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts` | `method` | `guard-only` | `canonical` |
| `POST /pharmacy/procurement/submit-request` | `backend/src/modules/pharmacy/controllers/procurement.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /pharmacy/procurement/my-requests` | `backend/src/modules/pharmacy/controllers/procurement.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.PHARMACY` | `read-only` |
| `POST /pharmacy/procurement/:param/feedback` | `backend/src/modules/pharmacy/controllers/procurement.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN; UserRole.PHARMACY` | `read-only` |
| `POST /pharmacy/procurement/analyze-file` | `backend/src/modules/pharmacy/controllers/procurement.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN` | `read-only` |
| `GET /patient/pharmacy/shortage-flags/lookup` | `backend/src/modules/pharmacy/patient-pharmacy.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/prescriptions/:param` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `UserRole.PHARMACY` | `read-only` |
| `POST /pharmacy/reports/eod` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/incoming` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/preparing` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/ready` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/completed` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/basket-review` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/awaiting-approval` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/refills` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/accept` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/reject` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/preparing` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/ready` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/partial` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/inventory` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/inventory/stock` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/inventory/add` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/orders/:param` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/items/:param/unavailable` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/items/:param/restore` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/items/:param/qty` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/items/:param/substitute` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/submit-basket` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/insurance` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/accept` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/submit-basket` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/insurance` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/orders/:param/dispatch` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /prescriptions/create` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR` | `read-only` |
| `POST /prescriptions/upload` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR; UserRole.DOCTOR` | `read-only` |
| `POST /prescriptions/manual-entry` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR; UserRole.DOCTOR, UserRole.ADMIN` | `read-only` |
| `POST /prescriptions/:param/send` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR; UserRole.DOCTOR, UserRole.ADMIN` | `read-only` |
| `POST /prescriptions/:param/transition` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `POST /prescriptions/:param/substitute` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /prescriptions/manual-review/queue` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.PHARMACY, UserRole.ADMIN` | `read-only` |
| `GET /prescriptions/active` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.DOCTOR` | `read-only` |
| `GET /prescriptions/mine` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.PHARMACY, UserRole.ADMIN; UserRole.DOCTOR` | `read-only` |
| `GET /prescriptions/doctor/mine` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR; UserRole.PHARMACY` | `read-only` |
| `GET /prescriptions/pharmacy/queue` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.DOCTOR; UserRole.PHARMACY` | `read-only` |
| `GET /prescriptions/:param` | `backend/src/modules/prescriptions/prescriptions.controller.ts` | `method` | `UserRole.PHARMACY` | `read-only` |
| `GET /provider/leave-requests` | `backend/src/modules/provider/leave-requests.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/leave-requests` | `backend/src/modules/provider/leave-requests.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/leave-requests/action` | `backend/src/modules/provider/leave-requests.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/promotions` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/features/promotions` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/referrals` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/features/referrals` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/features/crm/patients` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /provider/features/crm/patients/:param` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /provider/features/crm/patients/:param` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/home-care/bookings/:param/check-in` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/home-care/reports/:param/submit` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/radiology/bookings/:param/upload-report` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /provider/features/radiology/bookings/:param/publish-report` | `backend/src/modules/provider/simulated-features.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /providers/enterprise/provision-sub-provider` | `backend/src/modules/providers/controllers/hospital-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /providers/enterprise/branch-staff/:param/:param` | `backend/src/modules/providers/controllers/hospital-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /providers/enterprise/branch-financials/:param/:param` | `backend/src/modules/providers/controllers/hospital-enterprise.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /providers/apply` | `backend/src/modules/providers/providers.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /providers` | `backend/src/modules/providers/providers.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /providers/map` | `backend/src/modules/providers/providers.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /providers/:param` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE` | `read-only` |
| `GET /providers/me/profile` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE` | `read-only` |
| `POST /providers/admin/create` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /providers/admin/all` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /providers/admin/pending` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /providers/:param/approve` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /providers/:param/reject` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /providers/:param/suspend` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /providers/admin/seed-demo` | `backend/src/modules/providers/providers.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /radiology/provider/queue` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/provider/:param/respond` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/provider/allocate-machine/:param` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/provider/finalize-scan/:param` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/provider/wallet` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/provider/catalog` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/provider/catalog/:param` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/provider/inventory` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/provider/inventory` | `backend/src/modules/radiology/controllers/radiology-provider.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings` | `backend/src/modules/radiology/controllers/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/bookings/mine` | `backend/src/modules/radiology/controllers/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/bookings/:param` | `backend/src/modules/radiology/controllers/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/allocate-machine/:param` | `backend/src/modules/radiology/controllers/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/finalize-scan/:param` | `backend/src/modules/radiology/controllers/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/services` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/modalities` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/services/:param` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/bookings/mine` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/bookings/:param` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/cancel` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /radiology/bookings/:param/state` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/publish-report` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/reports/mine` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/documents` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /radiology/bookings/:param/insurance` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/provider/inbox` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/assign-technician` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/upload-report` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/checkin` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/start-scan` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/abort` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/submit-report-for-review` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/approve-report` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/insurance-approval` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /radiology/bookings/:param/reschedule` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/bookings/:param/tracking` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/catalog/delta-request` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/bookings/:param/confirm-preparation` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /radiology/admin/all` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /radiology/admin/catalog` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `PUT /radiology/admin/catalog/:param` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /radiology/admin/catalog/:param` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /radiology/admin/bookings/:param/force-state` | `backend/src/modules/radiology/radiology.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /referrals/my` | `backend/src/modules/referral/referral.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /referrals/apply` | `backend/src/modules/referral/referral.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /pharmacy/returns` | `backend/src/modules/returns/returns.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/returns` | `backend/src/modules/returns/returns.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/returns/provider/list` | `backend/src/modules/returns/returns.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/returns/eligibility/:param` | `backend/src/modules/returns/returns.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /pharmacy/returns/:param` | `backend/src/modules/returns/returns.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `POST /pharmacy/returns/:param/decide` | `backend/src/modules/returns/returns.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /seo/resolve/:param/:param` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/meta/:param/:param` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/build/:param/:param` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/sitemap.xml` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/llms.txt` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /seo/robots.txt` | `backend/src/modules/seo/seo.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /support/requests` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /support/tickets` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /support/requests/mine` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /support/requests/:param` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /support/requests/:param/reply` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /support/admin/requests` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `PATCH /support/admin/requests/:param` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /support/tickets` | `backend/src/modules/support/support.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /support/faqs` | `backend/src/modules/support/support.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /support/feedback` | `backend/src/modules/support/support.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /support/settings` | `backend/src/modules/support/support.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /support/settings` | `backend/src/modules/support/support.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /system-health/liveness` | `backend/src/modules/system-health/system-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /system-health/readiness` | `backend/src/modules/system-health/system-health.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /timeline` | `backend/src/modules/timeline/timeline.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /timeline/summary` | `backend/src/modules/timeline/timeline.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /tour/status` | `backend/src/modules/tour/tour.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /tour/complete` | `backend/src/modules/tour/tour.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /user/insurance` | `backend/src/modules/users/user.insurance.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/addresses` | `backend/src/modules/users/users.addresses.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /users/me/addresses` | `backend/src/modules/users/users.addresses.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me/addresses/:param` | `backend/src/modules/users/users.addresses.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /users/me/addresses/:param` | `backend/src/modules/users/users.addresses.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/display` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/health-id` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/profile` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me/profile` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/wishlist` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /users/me/wishlist/:param` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/notification-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me/notification-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/storage` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/privacy-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me/privacy-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/security-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `PATCH /users/me/security-settings` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /users/me/change-password` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /users/me/sessions` | `backend/src/modules/users/users.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /users/me/sessions/:param` | `backend/src/modules/users/users.controller.ts` | `method` | `UserRole.ADMIN` | `read-only` |
| `GET /users` | `backend/src/modules/users/users.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `POST /users/:param/toggle` | `backend/src/modules/users/users.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `DELETE /users/:param` | `backend/src/modules/users/users.controller.ts` | `method` | `UserRole.ADMIN; UserRole.ADMIN` | `read-only` |
| `GET /users/me/insurance` | `backend/src/modules/users/users.insurance.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /users/me/insurance` | `backend/src/modules/users/users.insurance.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/balance` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/transactions` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/spending-data` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/topup` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/topup/confirm` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/topup/:param` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/transfer` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `GET /wallet/cards` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /wallet/cards` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `DELETE /wallet/cards/:param` | `backend/src/modules/wallet/wallet.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /webhooks/moyasar` | `backend/src/modules/webhooks/webhooks.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /webhooks/paytabs` | `backend/src/modules/webhooks/webhooks.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /webhooks/sms` | `backend/src/modules/webhooks/webhooks.controller.ts` | `method` | `guard-only` | `read-only` |
| `POST /webhooks/livekit` | `backend/src/modules/webhooks/webhooks.controller.ts` | `method` | `guard-only` | `read-only` |

## BFF files

| BFF file | Upstream literals discovered | Verdict |
|---|---|---|
| `admin/src/pages/api/admin/[...path].ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/auth/login.ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/auth/logout.ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/auth/passkey-verify.ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/auth/public/[action].ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/auth/verify-2fa.ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/impersonation/revoke.ts` | `dynamic` | `canonical` |
| `admin/src/pages/api/admin/impersonation/start.ts` | `dynamic` | `canonical` |

## Final Unified Order authority notes

المسارات الإدارية canonical هي المسارات المسجلة تحت `admin` أو module controllers الموضحة في الجدول، وتُستدعى من المتصفح عبر same-origin `/api/admin/*` فقط. يقوم `admin/src/pages/api/admin/[...path].ts` بالتحويل الخادمي إلى backend ويمنع الوصول إلى backend URL من browser code. مسارات medicines الإدارية المعتمدة هي `GET/POST/PATCH /medicines/admin/catalog` وعقود `change-requests` و`price-history` و`shortage-reports`؛ أما `pending-review` و`/:id/approve` و`/:id/reject` و`PATCH /medicines/:id` القديمة فـ fail-closed عبر 410 مع رسالة العقد canonical، ولا تُعد عمليات نشطة.

عقد impersonation الوحيد الذي ينشئ جلسة هو `POST /admin/impersonation/start`، وعقد الإبطال هو `POST /admin/impersonation/:id/revoke`، مع `GET /admin/impersonation` لسجل الجلسات. الاستجابة العامة لا تحتوي raw token؛ طبقة BFF الداخلية فقط تستقبل token، تضعه في `admin_support_session` كـ HttpOnly/SameSite cookie بمدة 900 ثانية، وتعيد metadata. يتحقق `JwtAuthGuard` من `impersonation_sessions` وTTL وtarget وpolicy في كل طلب، ويرفض `x-impersonate-user-id` القديم.

تعكس سجلات الاختبار الحالية ذلك: `backend/test/a-enterprise.integration.e2e-spec.ts` يثبت metadata-only contract، وجميع اختبارات backend الكاملة تمر بعد تسجيل security provider في test graphs.
