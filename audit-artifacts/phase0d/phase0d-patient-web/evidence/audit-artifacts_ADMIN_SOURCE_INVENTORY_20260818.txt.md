# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/ADMIN_SOURCE_INVENTORY_20260818.txt`
- **Member SHA-256:** `7ff8b14eebdbd8c4b2015a8fece3c289ae7e82696e407a4d5e8357c172af6659`
- **Line count:** 177
- **Read range:** `1-177`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: src/pages/_app.tsx`
- `28: src/pages/_document.tsx`
- `29: src/pages/admin/ai-control.tsx`
- `30: src/pages/admin/ambulance-fleet.tsx`
- `31: src/pages/admin/analytics.tsx`
- `32: src/pages/admin/audit-logs.tsx`
- `33: src/pages/admin/catalog-manager.tsx`
- `34: src/pages/admin/commissions.tsx`
- `35: src/pages/admin/config-portal.tsx`
- `36: src/pages/admin/dashboard.tsx`
- `37: src/pages/admin/disputes.tsx`
- `38: src/pages/admin/financial-ledger.tsx`
### backend_consumers_or_contracts
- `42: src/pages/admin/insurance-companies.tsx`
- `43: src/pages/admin/insurance-queue.tsx`
- `47: src/pages/admin/nursing-portal.tsx`
- `50: src/pages/admin/pharmacy-procurement.tsx`
- `59: src/pages/api/hello.ts`
- `63: src/pages/home-care-services/index.tsx`
- `89: /home/ubuntu/admin-build-work/web-admin/src/pages/admin/pharmacy-procurement.tsx:116:                      <a href={r.uploaded_file_url} target="_blank" rel="noreferrer" className="text-teal-700 text-sm font-bold underline">الملف المرفق</a>`
- `106: "/pharmacy/cart"`
- `124: '/admin/insurance-companies'`
- `125: '/admin/insurance-queue'`
- `126: '/admin/insurance/stats'`
- `133: '/admin/nursing-portal'`
### auth_ownership
- `1: # admin source inventory`
- `2: root=/home/ubuntu/admin-build-work/web-admin`
- `23: src/components/AdminGuard.tsx`
- `29: src/pages/admin/ai-control.tsx`
- `30: src/pages/admin/ambulance-fleet.tsx`
- `31: src/pages/admin/analytics.tsx`
- `32: src/pages/admin/audit-logs.tsx`
- `33: src/pages/admin/catalog-manager.tsx`
- `34: src/pages/admin/commissions.tsx`
- `35: src/pages/admin/config-portal.tsx`
- `36: src/pages/admin/dashboard.tsx`
- `37: src/pages/admin/disputes.tsx`
### state_transitions
- `24: src/components/EmptyIcon.tsx`
- `116: '/admin/extended-operations/procurement/pending'`
- `119: '/admin/finance/refunds/queue'`
- `120: '/admin/finance/withdrawals/pending'`
### payment_insurance_relevance
- `42: src/pages/admin/insurance-companies.tsx`
- `43: src/pages/admin/insurance-queue.tsx`
- `49: src/pages/admin/payouts.tsx`
- `119: '/admin/finance/refunds/queue'`
- `124: '/admin/insurance-companies'`
- `125: '/admin/insurance-queue'`
- `126: '/admin/insurance/stats'`
- `135: '/admin/payouts'`
- `159: '/insurance/companies'`
- `160: '/insurance/companies/all'`
### error_empty_loading_retry_cancel
- `24: src/components/EmptyIcon.tsx`
- `116: '/admin/extended-operations/procurement/pending'`
- `120: '/admin/finance/withdrawals/pending'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
