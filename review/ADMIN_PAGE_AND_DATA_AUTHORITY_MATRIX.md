# ADMIN_PAGE_AND_DATA_AUTHORITY_MATRIX

**Generated from source:** every page under `admin/src/pages/admin/`. Manual review must add permission, source-of-truth, audit, state, and test evidence.

| Page | API/BFF calls | Local/direct indicators | Mutation count heuristic | Verdict |
|---|---|---|---|---|
| `admin/src/pages/admin/ai-control.tsx` | `/ai/admin/gateway, /ai/admin/gateway/mode, /ai/admin/gateway/provider/${key}, /ai/admin/usage?days=${days}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/ambulance-fleet.tsx` | `/api/admin/ambulance/fleet/${v.id}/approve, /api/admin/ambulance/fleet/${v.id}/reject, /api/admin/ambulance/fleet?status=${tab}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/analytics-suite.tsx` | `/analytics-suite/anomalies?days=45, /analytics-suite/cohorts${suffix}, /analytics-suite/funnels${suffix}, /analytics-suite/nps${suffix}, /analytics-suite/provider-league${toQuery({ from, to, domain })}, /analytics-suite/search${suffix}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/analytics.tsx` | `/admin/analytics/${section}?limit=15, /admin/analytics/overview` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/audit-logs.tsx` | `/audit${toQuery({ page, limit: 25, action })}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/catalog-governance.tsx` | `/medicines/admin/catalog/${encodeURIComponent(item.id)}/price-history?page=1&limit=50, /medicines/admin/catalog/${encodeURIComponent(selected.id)}, /medicines/admin/catalog?page=1&limit=50&q=${encodeURIComponent(search)}, /medicines/admin/import-csv, /medicines/admin/shortage-reports/${encodeURIComponent(row.id)}/${action}, /medicines/admin/shortage-reports?status=pending&page=1&limit=50` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/catalog-manager.tsx` | `${tabCfg.adminBase}/${editing.id}, ${tabCfg.adminBase}/${item.id}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/command-center.tsx` | `/command-center-v2` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/commissions.tsx` | `/admin/finance/commissions, /admin/finance/ledger/summary` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/config-portal.tsx` | `/api/admin/config/sla, /api/admin/governance/trigger-emergency-maintenance` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/content-growth.tsx` | `/cms/articles, /cms/articles/${encodeURIComponent(saved.id)}/publish, /cms/articles/${encodeURIComponent(saved.id)}/schedule, /cms/articles?status=&page=1&limit=100, /coupons, /coupons/${encodeURIComponent(item.id)}, /notification-center/campaigns, /notification-center/campaigns/${encodeURIComponent(item.id)}/send, /notification-center/campaigns?page=1&limit=100, /notification-center/segments` | `none` | `7` | `canonical` |
| `admin/src/pages/admin/crm.tsx` | `/crm/patients${toQuery({ q, page, limit: 25 })}, /crm/patients/${encodeURIComponent(id)}/360, /impersonation/start` | `none` | `1` | `canonical` |
| `admin/src/pages/admin/dashboard.tsx` | `/api/admin/command-center, /api/admin/nabd-extensions/admin/analytics/heatmaps, /api/admin/system-health/liveness, /api/admin/system-health/readiness` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/disputes.tsx` | `/disputes${toQuery({ status: , /disputes/${active.id}/resolve` | `none` | `1` | `canonical` |
| `admin/src/pages/admin/finance-suite.tsx` | `/finance/commissions${toQuery({ from, to })}, /finance/commissions/config, /finance/payouts/${encodeURIComponent(item.id)}/${decision}, /finance/payouts?status=PENDING_ADMIN_APPROVAL&page=1&limit=25, /finance/providers/${encodeURIComponent(providerId.trim())}/statement${toQuery({ from, to })}, /finance/reconciliation${toQuery({ date: to })}, /finance/revenue${toQuery({ from, to, granularity })}` | `none` | `2` | `canonical` |
| `admin/src/pages/admin/financial-ledger.tsx` | `/api/admin/extended-operations/issue-quote/${order.id}, /api/admin/extended-operations/procurement/pending, /api/admin/finance-engine/reports/summary?period=monthly, /api/admin/finance/commissions, /api/admin/finance/withdrawals/${id}/execute, /api/admin/finance/withdrawals/pending` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/fraud-monitoring.tsx` | `/api/admin/governance/audit-logs, /api/admin/governance/fraud-alerts` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/gdpr.tsx` | `/gdpr/${encodeURIComponent(row.id)}/${action}, /gdpr/requests, /gdpr/requests${toQuery({ status, page, limit: 25 })}` | `none` | `2` | `canonical` |
| `admin/src/pages/admin/health-dashboard.tsx` | `/admin/health-dashboard` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/home-curation.tsx` | `/governance-controls/home-curation` | `none` | `1` | `canonical` |
| `admin/src/pages/admin/image-suggestions.tsx` | `/medicines/admin/image-suggestions/${id}/${action}, /medicines/admin/image-suggestions?status=${tab}&page=${page}&limit=20` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/impersonation.tsx` | `/impersonation, /impersonation/revoke, /impersonation/start, /users?q=${encodeURIComponent(query.trim())}&limit=25` | `none` | `2` | `canonical` |
| `admin/src/pages/admin/insurance-companies.tsx` | `/insurance/companies, /insurance/companies/${companyId}/networks/${tier.id || tier._id}, /insurance/companies/${editId}, /insurance/companies/${id}, /insurance/companies/${tierCompany}/networks, /insurance/companies/all` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/insurance-queue.tsx` | `/admin/finance/refunds/${id}/decide, /admin/finance/refunds/queue, /admin/insurance/requests${stateFilter ? , /admin/insurance/stats` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/legal-policies.tsx` | `/admin/finance/commissions, /admin/legal/policy/${editing}, /legal/policies, /legal/policy/${key}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/medicines-catalog.tsx` | `/medicines/admin/catalog, /medicines/admin/catalog/${editId}, /medicines/admin/catalog/${m.id}/availability, /medicines/admin/catalog/${m.id}/delete, /medicines/admin/catalog?${params.toString()}, /medicines/admin/change-requests/${id}/${action}, /medicines/admin/change-requests?status=${reqStatus}&page=1&limit=50, /medicines/admin/reports, /storage/${up.id}/signed-url, /storage/upload` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/notification-center.tsx` | `/admin/notification-center/broadcasts, /admin/notification-center/campaigns, /admin/notification-center/campaigns/${id}, /admin/notification-center/campaigns/${id}/send, /admin/notification-center/campaigns?page=${page}&limit=15, /admin/notification-center/retarget/run, /admin/notification-center/segments, /admin/notification-center/stats/overview` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/nursing-portal.tsx` | `/admin/nursing/requests, /admin/nursing/requests/${requestId}/assign` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/order-detail.tsx` | `/admin/command-center/order/${encodeURIComponent(kind)}/${encodeURIComponent(id)}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/orders/[kind]/[id].tsx` | `/orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}, /orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/${action}` | `none` | `1` | `canonical` |
| `admin/src/pages/admin/orders/index.tsx` | `/orders${toQuery({ ...filters, page, limit: 25 })}` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/payouts.tsx` | `/admin/finance/withdrawals/${id}/execute, /admin/finance/withdrawals/${id}/reject, /admin/finance/withdrawals/pending` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/pharmacy-procurement.tsx` | `/admin/extended-operations/issue-quote/${selected._id || selected.id}, /admin/extended-operations/procurement/pending` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/provider-audits.tsx` | `/admin/provider-deltas, /admin/provider-deltas/${id}/approve, /admin/provider-deltas/${id}/reject` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/provider-moderation.tsx` | `/api/admin/providers/${id}/approve, /api/admin/providers/${selectedProvider.id}, /api/admin/providers/${selectedProvider?.id}/suspend, /api/admin/providers/provider-deltas, /api/admin/providers/provider-deltas/${id}/approve, /api/admin/providers/provider-deltas/${id}/reject, /api/admin/providers?status=pending&limit=100` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/rbac.tsx` | `/rbac/catalog, /rbac/roles` | `none` | `1` | `canonical` |
| `admin/src/pages/admin/scheduled-reports.tsx` | `/scheduled-reports, /scheduled-reports/${encodeURIComponent(report.id)}, /scheduled-reports/${encodeURIComponent(report.id)}/run, /scheduled-reports/${encodeURIComponent(report.id)}/runs` | `none` | `4` | `canonical` |
| `admin/src/pages/admin/security.tsx` | `/auth/passkey/devices, /auth/passkey/devices/${encodeURIComponent(credentialId)}, /auth/passkey/enroll/options, /auth/passkey/enroll/verify` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/segments.tsx` | `/segments, /segments/${encodeURIComponent(segment.id)}, /segments/fields, /segments/preview` | `none` | `3` | `canonical` |
| `admin/src/pages/admin/shortage-reports.tsx` | `/medicines/admin/catalog/${medicineId}/clear-shortage-badge, /medicines/admin/shortage-reports/${reportId}/${action}, /medicines/admin/shortage-reports?status=${tab}&page=${page}&limit=20` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/sos-monitor.tsx` | `/emergency/${id}/assign, /emergency/${id}/resolve, /emergency/active` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/support-tickets.tsx` | `/support/admin/requests${filter ? , /support/admin/requests/${id}, /support/requests/${id}/reply` | `none` | `0` | `canonical` |
| `admin/src/pages/admin/system-ops.tsx` | `/governance-controls/feature-flags, /ops/queues, /ops/queues/${encodeURIComponent(q.queues[0].name)}/jobs?state=failed&start=0&end=49, /ops/queues/${encodeURIComponent(queue.name)}/jobs/${encodeURIComponent(job.id)}/retry, /ops/queues/${encodeURIComponent(queue.name)}/retry-failed, /ops/seo/controls, /ops/translations, /ops/translations?lang=${lang}` | `none` | `5` | `canonical` |
| `admin/src/pages/admin/users-management.tsx` | `/admin/providers/${accountId}/${action}, /admin/providers/by-user/${id}, /admin/users/${id}, /admin/users/${id}/ban, /admin/users/${id}/overview?days=${days}, /admin/users/${id}/unban, /admin/users/${viewUser.id || viewUser._id}/overview?days=${days}, /admin/users?${params.toString()}` | `none` | `0` | `canonical` |

## Final transport and authority evidence

كل نداء ظاهر في هذا الجدول صادر عن helper موحد (`adminFetch` أو `adminMutation` أو `apiFetch` أو `fetchWithAdminGuard`) ويصل إلى same-origin `/api/admin/*`. لا يحتوي source صفحات الإدارة على `NEXT_PUBLIC_API_URL` أو bearer token أو `localStorage` أو `sessionStorage`. أما استدعاءات public catalog في surfaces العامة خارج `pages/admin` فهي منفصلة ولا تمنح صلاحيات إدارة.

`impersonation.tsx` و`crm.tsx` يستخدمان `POST /api/admin/impersonation/start`؛ شاشة السجل تستخدم `GET /api/admin/impersonation`، والإبطال يستخدم `POST /api/admin/impersonation/revoke`. لا يوجد token في React state أو DOM، ويُدار credential الجلسة بواسطة HttpOnly cookie في BFF. `medicines-catalog.tsx` و`catalog-governance.tsx` يستخدمان عقود medicines canonical عبر mapping BFF، بينما أُغلقت contracts legacy في backend بـ 410.

تستند مؤشرات KPI والبيانات المعروضة إلى responses backend حقيقية أو حالات unavailable صريحة؛ لا يوجد fallback رقمي مصطنع في الأسطح Enterprise.
