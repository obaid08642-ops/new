# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/components/AdminGuard.tsx`
- **Member SHA-256:** `e850a746b172dbeabafa7192999ada76c431b0774afeab3b6f2a61d0bd40f694`
- **Line count:** 129
- **Read range:** `1-129`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { useRouter } from 'next/router';`
- `6: * Central admin shell (wraps every /admin/* route via _app.tsx).`
- `7: * M5: sidebar now covers ALL operational pages — previously only 7 links`
- `8: * existed and several pages self-wrapped causing double sidebars.`
- `58: const router = useRouter();`
- `66: router.push('/login');`
- `70: }, [router]);`
- `72: if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">جاري التحقق من الصلاحيات المركزية...</div>;`
- `75: <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans" dir="rtl">`
- `88: const active = router.pathname === item.href;`
- `92: href={item.href}`
- `111: onClick={() => {`
### backend_consumers_or_contracts
- `24: { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
- `25: { href: '/admin/insurance-companies', label: 'شركات التأمين', icon: '' },`
- `38: { href: '/admin/nursing-portal', label: 'بوابة التمريض', icon: '' },`
- `41: { href: '/admin/pharmacy-procurement', label: 'طلبات توريد الصيدليات', icon: '' },`
### auth_ownership
- `6: * Central admin shell (wraps every /admin/* route via _app.tsx).`
- `15: { href: '/admin/dashboard', label: 'مركز القيادة', icon: '' },`
- `16: { href: '/admin/sos-monitor', label: 'مراقبة الطوارئ SOS', icon: '' },`
- `17: { href:'/admin/fraud-monitoring', label:'مراقبة الاحتيال', icon:'' },`
- `23: { href: '/admin/payouts', label: 'اعتمادات السحب', icon: '' },`
- `24: { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
- `25: { href: '/admin/insurance-companies', label: 'شركات التأمين', icon: '' },`
- `26: { href: '/admin/commissions', label: 'العمولات والأستاذ', icon: '' },`
- `27: { href: '/admin/financial-ledger', label: 'دفتر الأستاذ المالي', icon: '' },`
- `28: { href:'/admin/disputes', label:'النزاعات المالية', icon:'' },`
- `34: { href: '/admin/users-management', label: 'إدارة المستخدمين', icon: '' },`
- `35: { href: '/admin/provider-moderation', label: 'اعتماد المزودين', icon: '' },`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `57: const [isAuthenticated, setIsAuthenticated] = useState(false);`
### payment_insurance_relevance
- `23: { href: '/admin/payouts', label: 'اعتمادات السحب', icon: '' },`
- `24: { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
- `25: { href: '/admin/insurance-companies', label: 'شركات التأمين', icon: '' },`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
