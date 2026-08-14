# نبض بلس — Admin Dashboard (Nabd Admin)

## Original Problem Statement
المستخدم رفع 3 ملفات JSX (Part1 + Part2 + Part3 = 4,819 سطر) تحتوي على تصميم كامل لـ Admin Dashboard لمنصة صحية سعودية اسمها "نبض بلس". المشروع يدير مزودي الخدمة الصحية (مستشفيات، صيدليات، أطباء، مختبرات، تمريض)، المرضى، الطلبات، البرودكاست الجغرافي، الطوارئ، الأدوية، التأمين، والمحتوى. المطلوب: بناء المشروع كـ React.js web app بدون أي تغيير في design / features / icons / screens، وأن يكون جاهز لتركيب ~100 API لاحقاً.

## Architecture
- **Frontend**: React 18 + Create React App + Craco (CRA + path aliasing `@/`)
- **Styling**: Inline styles + Cairo font (Google Fonts) + Glassmorphism + RTL Arabic + Dark theme
- **State**: Local React state (`useState`) — no global store needed at this stage
- **HTTP**: axios (skeleton only — APIs to be wired later by user)
- **Single-file approach**: All 61 screens + 30 UI primitives + MOCK data merged into `/app/frontend/src/App.js` (4,801 lines) — per user's strict instruction to preserve original code verbatim.

## Folder Structure
```
/app/frontend/
├── public/
│   └── index.html         # RTL, Cairo preload, title 'نبض بلس - Admin'
├── src/
│   ├── index.js           # Entry point
│   ├── index.css          # Reset + Cairo + dark scrollbar
│   ├── App.js             # 4,801 lines — entire dashboard
│   └── api/
│       ├── client.js      # axios + interceptors (Bearer token)
│       └── endpoints.js   # ~100 API placeholders organized by groups
```

## Core Requirements (Static)
- 61 screens covering: Dashboard, Live Operations, Broadcast Monitor, Emergency Control, Kill Switches, Providers Management (Hospital/Doctor/Pharmacy/Lab/Nursing/Imaging), Patients, Family Cards, Wallet, Orders, Appointments, Chat, Pharmacy Orders, Lab Results, Complaints, Specialties, Medicines DB, Market Shortage, Lab Tests DB, Nursing Services, B2B Supply, Bulk Upload, Insurance & Claims, Financial Control, Commissions, Refunds, Coupons, Notifications, CMS, Banners, Reviews, Theme Builder, System Config, Permissions, Audit Logs, Workflow, AI Config, Alert Rules, Map Heatmap, Broadcast Config, Doctors, Sub-Accounts, Contracts, Provider Docs, SLA Monitor, Shifts, Scorecard, Compliance, Transport, Blacklist, Fraud Detection, Waitlist, Referrals, Task Manager, Services Catalog.
- Design tokens: Cyber Blue #00b8e6, Green #00e676, Red #ff1744, Orange #ff6d00, Purple #7c4dff, Gold #ffd600, Pink #f50057, Teal #00bfa5
- RTL Arabic + Cairo font + Dark mode (#07080d background)
- Sidebar with 8 groups (MAIN, PROVIDERS, USERS, OPERATIONS, MASTER DATA, FINANCIAL, CONTENT, SYSTEM)
- TopBar with Emergency button (blink animation), Kill Switches, Notifications bell, Sidebar collapse
- Ctrl+K Global Search across MOCK data
- 5 Admin Roles: SUPER_ADMIN, OPERATIONS, FINANCE, SUPPORT, CONTENT

## User Personas
- **Super Admin (أحمد الحربي)**: Full access — sees all screens, controls Kill Switches
- **Operations Manager**: Live ops, dispatching, complaints
- **Finance Officer**: Wallet, refunds, commissions, insurance claims
- **Support Agent**: Chat control, complaints, tickets
- **Content Manager**: CMS, banners, notifications

## What's Been Implemented (Jan 2026)
- ✅ **Phase 1 (env)**: RTL, Cairo, axios client skeleton, ~100 endpoint placeholders in `src/api/endpoints.js`
- ✅ **Phase 2 (Part1)**: 1,960 lines — Design tokens, ROLES, NAV (58), MOCK data, 16 UI primitives, 18 fully-functional screens (Dashboard, BroadcastMonitor, EmergencyLive, KillSwitches, ProviderApproval, SubAccounts, AutoNotifications, NotificationsManager, MarketShortage, B2BSupply, InsuranceClaims, Compliance, Transport, NursingServices, Specialties, LabTests, Medicines, AuditLogs), Main App + Sidebar + TopBar + Ctrl+K Search
- ✅ **Phase 3 (Part2)**: +1,089 lines — 12 screens (LiveOperations, ProvidersPage, PatientsPage, FinancialControl, AnalyticsPage, ThemeBuilder, CMSPage, SystemConfig, PermissionsPage, CustomReports, WorkflowPage, AIConfig)
- ✅ **Phase 4 (Part3)**: +1,752 lines — 31 screens (DoctorsPage, FamilyCards, WalletTx, BlacklistPage, FraudDetection, OrdersPage, AppointmentsPage, WaitlistPage, ReferralsPage, ChatControl, PharmacyOrders, LabResultsMonitor, ComplaintsPage, TaskManager, ServicesCatalog, ImagingServices, BulkUpload, InsuranceCompanies, CommissionsPage, RefundsPage, CouponsPage, ContractsPage, ProviderDocs, SLAMonitor, ShiftsSchedules, ProviderScorecard, BannersAds, ReviewsRatings, AlertRulesEngine, MapHeatmap, BroadcastConfig) + 14 local helpers (C, Bd, Tog, Btn3, Inp, Sel3, Card3, SH, Divider3, FR, Drawer3, Modal3, Tbl, StatCard3)
- ✅ **Phase 5 (verify)**: ESLint clean, Webpack compiles, **64/64 routes render with 0 console errors** (testing agent v3, iteration_1)

## Test Results (iteration_1)
- 100% routes pass smoke test
- RTL + Cairo + dark theme verified
- TopBar, Sidebar collapse, Ctrl+K search all functional
- Ctrl+K search filters MOCK providers/patients correctly (tried 'مستشفى' and 'أحمد')
- No console errors, no page errors

## Prioritized Backlog

### P0 — Awaiting User Input
- **Real API Integration**: User will deliver ~100 API endpoints. Wiring plan:
  1. Replace MOCK reads with `useEffect` calls to `endpoints.js` functions
  2. Add loading states + error toasts to each screen
  3. Wire write actions (approve/reject/suspend/refund/etc.) to POST/PUT endpoints
  4. Add JWT login screen once `/api/auth/login` is ready

### P1 — Quality of Life (Optional)
- Split `App.js` into `/src/pages/*.jsx` for maintainability (~30 small files)
- Add `data-testid` to every nav item, KPI card, and topbar button for robust testing
- Remove duplicate `<link>` Cairo Google Fonts inside JSX body (already preloaded in `index.html`)
- Add full role-based access control (`role` is hardcoded `"SUPER_ADMIN"` right now)
- Persist `collapsed` sidebar state to `localStorage`

### P2 — Future Enhancements
- Mobile-friendly version (Capacitor wrap → Android/iOS native apps)
- Real-time updates via WebSocket for live broadcast/emergency feeds
- PDF export from CustomReports and AuditLogs
- Multi-language toggle (Arabic ⇄ English)
- Dark/Light theme switcher (ThemeBuilder already supports 5 themes)

## Next Tasks
- ⏳ **Awaiting user to send the actual ~100 API endpoints** so we can swap MOCK with real data per-screen
- Optional: implement Capacitor mobile wrap once admin is feature-locked
