# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/index.tsx`
- **Member SHA-256:** `a24fce8b0c6c18e0d972543471c831370ed44dfa9423b0ec92855b66644a06c5`
- **Line count:** 93
- **Read range:** `1-93`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * M6-SEO1 / ER-2: public landing page — was an admin-only redirect (M0).`
- `38: <link rel="canonical" href={SITE} />`
- `48: <div dir="rtl" className="min-h-screen bg-gradient-to-b from-teal-50 to-white">`
- `52: <Link href="/login" className="text-sm text-slate-500 hover:text-teal-700">دخول المزودين والإدارة</Link>`
- `53: <a href="#download" className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">حمّل التطبيق</a>`
- `70: <Link key={s.href} href={s.href} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-teal-400 hover:shadow-md transition-all group">`
- `76: <div id="download" className="bg-teal-700 rounded-2xl p-6 text-white flex flex-col justify-between">`
### backend_consumers_or_contracts
- `19: { href: '/home-care-services', icon: '', title: 'الرعاية المنزلية', desc: 'تمريض وعلاج طبيعي ورعاية منزلية حتى باب منزلك' },`
### auth_ownership
- `7: * M6-SEO1 / ER-2: public landing page — was an admin-only redirect (M0).`
- `52: <Link href="/login" className="text-sm text-slate-500 hover:text-teal-700">دخول المزودين والإدارة</Link>`
### state_transitions
- `4: import EmptyIcon from '../components/EmptyIcon';`
- `78: <EmptyIcon name="phone" size={36} color="#FFFFFF" className="mb-3" />`
### payment_insurance_relevance
- `44: <meta name="twitter:card" content="summary_large_image" />`
### error_empty_loading_retry_cancel
- `4: import EmptyIcon from '../components/EmptyIcon';`
- `78: <EmptyIcon name="phone" size={36} color="#FFFFFF" className="mb-3" />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
