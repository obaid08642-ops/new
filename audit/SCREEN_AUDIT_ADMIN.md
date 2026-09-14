# Admin Dashboard — Page Audit Report
**Total Pages:** ~50  
**Framework:** Next.js (Pages Router)  
**Audit Date:** 2026-09-14  
**Branch:** nabdah-plus/full-completion

---

## Page Inventory by Category

### Core Admin (7)
| Page | Route | Purpose |
|------|-------|---------|
| Login | `/admin/login.tsx` | Admin authentication |
| Index | `/admin/index.tsx` | Landing/redirect |
| Dashboard | `/admin/admin/dashboard.tsx` | Main dashboard |
| App | `/admin/pages/_app.tsx` | Next.js app wrapper |
| Document | `/admin/pages/_document.tsx` | Next.js document |

### Provider Management (8)
| Page | Route | Purpose |
|------|-------|---------|
| Provider Moderation | `/admin/admin/provider-moderation.tsx` | Approve/reject providers |
| Provider Audits | `/admin/admin/provider-audits.tsx` | Audit provider compliance |
| Doctors Index | `/admin/pages/doctors/index.tsx` | Doctor directory |
| Facilities Index | `/admin/pages/facilities/index.tsx` | Facility directory |
| Home Care Services | `/admin/pages/home-care-services/index.tsx` | Home care providers |
| Lab Services | `/admin/pages/lab-services/index.tsx` | Lab directory |
| Medicines | `/admin/pages/medicines/index.tsx` | Medicine catalog admin |
| Articles | `/admin/pages/articles/index.tsx` | Article management |

### Insurance (4)
| Page | Route | Purpose |
|------|-------|---------|
| Insurance Companies | `/admin/admin/insurance-companies.tsx` | Company/network mgmt |
| Insurance Queue | `/admin/admin/insurance-queue.tsx` | Manual approval queue |
| CRM | `/admin/admin/crm.tsx` | Customer relationships |
| Legal Policies | `/admin/admin/legal-policies.tsx` | Terms/privacy |

### Orders & Finance (7)
| Page | Route | Purpose |
|------|-------|---------|
| Orders Index | `/admin/admin/orders/index.tsx` | All orders |
| Order Detail | `/admin/admin/order-detail.tsx` | Single order |
| Order Kind/ID | `/admin/admin/orders/[kind]/[id].tsx` | Dynamic order types |
| Commissions | `/admin/admin/commissions.tsx` | Provider commissions |
| Payouts | `/admin/admin/payouts.tsx` | Provider payouts |
| Financial Ledger | `/admin/admin/financial-ledger.tsx` | Accounting |
| Finance Suite | `/admin/admin/finance-suite.tsx` | Financial tools |

### Content & Catalog (6)
| Page | Route | Purpose |
|------|-------|---------|
| Catalog Manager | `/admin/admin/catalog-manager.tsx` | Entity catalog |
| Catalog Governance | `/admin/admin/catalog-governance.tsx` | Governance rules |
| Content Growth | `/admin/admin/content-growth.tsx` | SEO/content metrics |
| Home Curation | `/admin/admin/home-curation.tsx` | Homepage curation |
| Image Suggestions | `/admin/admin/image-suggestions.tsx` | AI image review |
| Pharmacy Procurement | `/admin/admin/pharmacy-procurement.tsx` | Pharmacy orders |

### Analytics & Monitoring (10)
| Page | Route | Purpose |
|------|-------|---------|
| Analytics | `/admin/admin/analytics.tsx` | Basic analytics |
| Analytics Suite | `/admin/admin/analytics-suite.tsx` | Advanced analytics |
| Search Intelligence | `/admin/admin/search-intelligence.tsx` | Search analytics |
| Broadcast Monitor | `/admin/admin/broadcast-monitor.tsx` | Pharmacy broadcasts |
| Fraud Monitoring | `/admin/admin/fraud-monitoring.tsx` | Fraud detection |
| Shortage Reports | `/admin/admin/shortage-reports.tsx` | Drug shortages |
| SOS Monitor | `/admin/admin/sos-monitor.tsx` | Emergency alerts |
| Health Dashboard | `/admin/admin/health-dashboard.tsx` | Population health |
| Command Center | `/admin/admin/command-center.tsx` | Operations center |
| System Ops | `/admin/admin/system-ops.tsx` | System management |

### Users & Security (5)
| Page | Route | Purpose |
|------|-------|---------|
| Users Management | `/admin/admin/users-management.tsx` | Admin/users |
| RBAC | `/admin/admin/rbac.tsx` | Role-based access |
| Security | `/admin/admin/security.tsx` | Security settings |
| Audit Logs | `/admin/admin/audit-logs.tsx` | Audit trail |
| Impersonation | `/admin/admin/impersonation.tsx` | User impersonation |

### Support & Communication (4)
| Page | Route | Purpose |
|------|-------|---------|
| Support Tickets | `/admin/admin/support-tickets.tsx` | Ticket management |
| Live Chat Console | `/admin/admin/live-chat-console.tsx` | Real-time chat |
| Notification Center | `/admin/admin/notification-center.tsx` | Notifications |
| Community Moderation | `/admin/admin/community-moderation.tsx` | Content moderation |

### Reports & Scheduling (2)
| Page | Route | Purpose |
|------|-------|---------|
| Scheduled Reports | `/admin/admin/scheduled-reports.tsx` | Automated reports |
| Price Override Audit | `/admin/admin/price-override-audit.tsx` | Price changes |

### Specialized (3)
| Page | Route | Purpose |
|------|-------|---------|
| AI Control | `/admin/admin/ai-control.tsx` | AI feature flags |
| Ambulance Fleet | `/admin/admin/ambulance-fleet.tsx` | Fleet tracking |
| Nursing Portal | `/admin/admin/nursing-portal.tsx` | Nursing oversight |
| Disputes | `/admin/admin/disputes.tsx` | Dispute resolution |
| Loyalty Config | `/admin/admin/loyalty-config.tsx` | Loyalty program |
| Segments | `/admin/admin/segments.tsx` | User segments |
| GDPR | `/admin/admin/gdpr.tsx` | Data privacy |

### Public/SEO (1)
| Page | Route | Purpose |
|------|-------|---------|
| S Redirect | `/admin/pages/s/[type]/[slug].tsx` | SEO redirects |

---

## Issues Found

### 🟡 MISSING ADMIN PAGES
| Feature | Needed Page | Priority |
|---------|-------------|----------|
| Video Call Monitoring | `/admin/admin/video-calls.tsx` | High |
| LiveKit Session Viewer | `/admin/admin/livekit-sessions.tsx` | High |
| Payment Reconciliation | `/admin/admin/payment-reconciliation.tsx` | High |
| Webhook Monitor | `/admin/admin/webhooks.tsx` | Medium |
| Rate Limit Dashboard | `/admin/admin/rate-limits.tsx` | Medium |
| API Usage Analytics | `/admin/admin/api-usage.tsx` | Medium |
| MCP Server Admin | `/admin/admin/mcp-server.tsx` | Low |

### 🟡 DUPLICATE/UNCLEAR
| Pages | Issue |
|-------|-------|
| `analytics.tsx` + `analytics-suite.tsx` | Merge or clarify scope |
| `dashboard.tsx` + `command-center.tsx` | Overlap |
| `orders/index.tsx` + `orders/[kind]/[id].tsx` + `order-detail.tsx` | Consolidate routing |

### 🟢 WELL IMPLEMENTED
- Comprehensive provider moderation
- Full insurance management (companies, networks, queue)
- Financial suite with ledger, commissions, payouts
- Security: RBAC, audit logs, impersonation
- Fraud monitoring, SOS monitor
- Content growth, catalog governance
- Scheduled reports

---

## Recommendations

1. **Add missing monitoring pages** (video calls, LiveKit, webhooks, payments)
2. **Consolidate analytics/dashboard pages**
3. **Add API usage & rate limit monitoring**
4. **Add MCP server administration page**
5. **Verify all pages have proper RBAC guards**
