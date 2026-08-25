# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/s/[type]/[slug].tsx`
- **Member SHA-256:** `3fedad17614dff0007a5d63f21dcd29332e84c4b8d090f9f31e5a30a0772c698`
- **Line count:** 256
- **Read range:** `1-256`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: * M6-SEO1 / ER-2+ER-3: public entity page — /s/:type/:slug`
- `10: * entity added to the database automatically gets an indexable page with`
- `43: export default function EntityPage({ meta, type }: Props) {`
- `48: <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">`
- `51: <Link href="/" className="text-teal-700 font-bold">العودة للرئيسية</Link>`
- `66: <link rel="canonical" href={`${SITE}/s/${type}/${meta.slug}`} />`
- `83: <div dir="rtl" className="min-h-screen bg-slate-50">`
- `87: <Link href="/" className="text-xl font-black text-teal-700">نبض</Link>`
- `88: <a href={`nabdplus://s/${type}/${meta.slug}`} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">`
- `93: <Link href="/" className="hover:text-teal-700">الرئيسية</Link>`
- `95: <Link href={t.dir} className="hover:text-teal-700">{t.label}</Link>`
- `233: <a href={`nabdplus://s/${type}/${meta.slug}`} className="inline-block mt-4 bg-white text-teal-700 font-bold px-6 py-2.5 rounded-lg">فتح في تطبيق نبض</a>`
### backend_consumers_or_contracts
- `22: 'home-care-service': { dir: '/home-care-services', label: 'الرعاية المنزلية' },`
- `246: const r = await fetch(`${API_BASE}/api/v1/seo/meta/${type}/${encodeURIComponent(slug)}`, {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: import EmptyIcon from '../../../components/EmptyIcon';`
- `49: <EmptyIcon name="search" size={44} color="#94A3B8" />`
- `163: <img key={i} src={src} alt={`${name} ${i + 1}`} className="w-40 h-40 rounded-xl object-cover border border-slate-100" loading="lazy" />`
- `249: if (!r.ok) throw new Error(`HTTP ${r.status}`);`
### payment_insurance_relevance
- `11: * metadata, JSON-LD, OG/Twitter cards, canonical URL, and an app deep link.`
- `74: <meta name="twitter:card" content={meta.twitter?.card || 'summary'} />`
- `102: {/* Hero card */}`
- `112: {typeof e.price === 'number' && e.price > 0 && (`
- `113: <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">{e.price} ر.س</span>`
### error_empty_loading_retry_cancel
- `5: import EmptyIcon from '../../../components/EmptyIcon';`
- `49: <EmptyIcon name="search" size={44} color="#94A3B8" />`
- `163: <img key={i} src={src} alt={`${name} ${i + 1}`} className="w-40 h-40 rounded-xl object-cover border border-slate-100" loading="lazy" />`
- `249: if (!r.ok) throw new Error(`HTTP ${r.status}`);`
- `253: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
