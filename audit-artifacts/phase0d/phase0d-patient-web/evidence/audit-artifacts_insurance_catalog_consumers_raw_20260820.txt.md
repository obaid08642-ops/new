# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/insurance_catalog_consumers_raw_20260820.txt`
- **Member SHA-256:** `cb6563523ed26bdf062dfd7c5ee7afe53a70c1af990098ad9bb33c194df78b40`
- **Line count:** 2614
- **Read range:** `1-2614`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `2: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `3: admin/src/pages/admin/insurance-queue.tsx:7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `4: admin/src/pages/admin/insurance-queue.tsx:8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `5: admin/src/pages/admin/insurance-queue.tsx:19:export default function InsuranceQueuePage() {`
- `6: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `8: admin/src/pages/admin/insurance-queue.tsx:155:                        <div className="text-sm text-slate-600">{f.policy_note_ar}</div>`
- `9: admin/src/pages/admin/insurance-queue.tsx:183:      {/* Insurance request detail drawer */}`
- `10: admin/src/pages/admin/insurance-companies.tsx:6: * Insurance companies directory management:`
- `11: admin/src/pages/admin/insurance-companies.tsx:7: * - list ALL companies (active + disabled) with their tier networks`
- `12: admin/src/pages/admin/insurance-companies.tsx:10: * - add / remove tiers (networks) per company`
### backend_consumers_or_contracts
- `1: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `2: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `3: admin/src/pages/admin/insurance-queue.tsx:7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `4: admin/src/pages/admin/insurance-queue.tsx:8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `5: admin/src/pages/admin/insurance-queue.tsx:19:export default function InsuranceQueuePage() {`
- `6: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `8: admin/src/pages/admin/insurance-queue.tsx:155:                        <div className="text-sm text-slate-600">{f.policy_note_ar}</div>`
- `9: admin/src/pages/admin/insurance-queue.tsx:183:      {/* Insurance request detail drawer */}`
- `10: admin/src/pages/admin/insurance-companies.tsx:6: * Insurance companies directory management:`
- `11: admin/src/pages/admin/insurance-companies.tsx:7: * - list ALL companies (active + disabled) with their tier networks`
- `12: admin/src/pages/admin/insurance-companies.tsx:10: * - add / remove tiers (networks) per company`
### auth_ownership
- `1: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `2: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `3: admin/src/pages/admin/insurance-queue.tsx:7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `4: admin/src/pages/admin/insurance-queue.tsx:8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `5: admin/src/pages/admin/insurance-queue.tsx:19:export default function InsuranceQueuePage() {`
- `6: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `8: admin/src/pages/admin/insurance-queue.tsx:155:                        <div className="text-sm text-slate-600">{f.policy_note_ar}</div>`
- `9: admin/src/pages/admin/insurance-queue.tsx:183:      {/* Insurance request detail drawer */}`
- `10: admin/src/pages/admin/insurance-companies.tsx:6: * Insurance companies directory management:`
- `11: admin/src/pages/admin/insurance-companies.tsx:7: * - list ALL companies (active + disabled) with their tier networks`
- `12: admin/src/pages/admin/insurance-companies.tsx:10: * - add / remove tiers (networks) per company`
### state_transitions
- `3: admin/src/pages/admin/insurance-queue.tsx:7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `4: admin/src/pages/admin/insurance-queue.tsx:8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `46: admin/.next/server/chunks/ssr/_1rp5hzv._.js:1:module.exports=[18100,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(19059),j=a.i(81323),k=a.i(26519);let l={PENDING_PROVIDE`
- `47: admin/.next/server/chunks/ssr/[root-of-the-server]__0oc9pg3._.js:1:module.exports=[22734,(a,b,c)=>{b.exports=a.x("fs",()=>require("fs"))},88947,(a,b,c)=>{b.exports=a.x("stream",()=>require("stream"))},6461,(a,b,c)=>{b.exports=a.x("zlib",()=`
- `48: admin/.next/server/chunks/ssr/node_modules_next_0nfo6du._.js:1:module.exports=[10384,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(19059),j=a.i(81323);a.s(["default",0,f`
- `49: admin/.next/server/chunks/ssr/src_components_ProviderFullDetail_tsx_1vc7krn._.js:1:module.exports=[32702,a=>{"use strict";var b=a.i(8171),c=a.i(27669),d=a.i(81323);let e=(0,d.adminApiBase)(),f={SUN:"الأحد",MON:"الاثنين",TUE:"الثلاثاء",WED:"`
- `50: admin/.next/server/chunks/ssr/_1s81eh0._.js:1:module.exports=[50852,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!`
- `51: admin/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_pages_0kmfny1.js:1:module.exports=[84833,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(81323);a.`
- `58: admin/.next/static/chunks/turbopack-1uak7c8oyil-x.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/03r-zk65ifc81.js","static/chunks/2_bmp7e4sso`
- `59: admin/.next/static/chunks/turbopack-3icxhted8vht9.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/1gs3jg09hcmj4.js","static/chunks/2_bmp7e4sso`
- `60: admin/.next/static/chunks/turbopack-0ce2yw_1pejf5.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/3_bh7fdfw6riw.js","static/chunks/2_bmp7e4sso`
### payment_insurance_relevance
- `3: admin/src/pages/admin/insurance-queue.tsx:7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `4: admin/src/pages/admin/insurance-queue.tsx:8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `5: admin/src/pages/admin/insurance-queue.tsx:19:export default function InsuranceQueuePage() {`
- `6: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `8: admin/src/pages/admin/insurance-queue.tsx:155:                        <div className="text-sm text-slate-600">{f.policy_note_ar}</div>`
- `9: admin/src/pages/admin/insurance-queue.tsx:183:      {/* Insurance request detail drawer */}`
- `10: admin/src/pages/admin/insurance-companies.tsx:6: * Insurance companies directory management:`
- `11: admin/src/pages/admin/insurance-companies.tsx:7: * - list ALL companies (active + disabled) with their tier networks`
- `12: admin/src/pages/admin/insurance-companies.tsx:10: * - add / remove tiers (networks) per company`
- `13: admin/src/pages/admin/insurance-companies.tsx:12: * Backend: GET /insurance/companies/all · POST /insurance/companies`
- `14: admin/src/pages/admin/insurance-companies.tsx:13: *          PATCH /insurance/companies/:id`
### error_empty_loading_retry_cancel
- `1: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `6: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `7: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `46: admin/.next/server/chunks/ssr/_1rp5hzv._.js:1:module.exports=[18100,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(19059),j=a.i(81323),k=a.i(26519);let l={PENDING_PROVIDE`
- `47: admin/.next/server/chunks/ssr/[root-of-the-server]__0oc9pg3._.js:1:module.exports=[22734,(a,b,c)=>{b.exports=a.x("fs",()=>require("fs"))},88947,(a,b,c)=>{b.exports=a.x("stream",()=>require("stream"))},6461,(a,b,c)=>{b.exports=a.x("zlib",()=`
- `48: admin/.next/server/chunks/ssr/node_modules_next_0nfo6du._.js:1:module.exports=[10384,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(19059),j=a.i(81323);a.s(["default",0,f`
- `49: admin/.next/server/chunks/ssr/src_components_ProviderFullDetail_tsx_1vc7krn._.js:1:module.exports=[32702,a=>{"use strict";var b=a.i(8171),c=a.i(27669),d=a.i(81323);let e=(0,d.adminApiBase)(),f={SUN:"الأحد",MON:"الاثنين",TUE:"الثلاثاء",WED:"`
- `50: admin/.next/server/chunks/ssr/_1s81eh0._.js:1:module.exports=[50852,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!`
- `51: admin/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_pages_0kmfny1.js:1:module.exports=[84833,a=>{"use strict";var b=a.i(79168),c=a.i(27068),d=a.i(32759),e=a.i(39141),f=a.i(68695),g=a.i(8171),h=a.i(27669),i=a.i(81323);a.`
- `58: admin/.next/static/chunks/turbopack-1uak7c8oyil-x.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/03r-zk65ifc81.js","static/chunks/2_bmp7e4sso`
- `59: admin/.next/static/chunks/turbopack-3icxhted8vht9.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/1gs3jg09hcmj4.js","static/chunks/2_bmp7e4sso`
- `60: admin/.next/static/chunks/turbopack-0ce2yw_1pejf5.js:1:(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,{otherChunks:["static/chunks/3_bh7fdfw6riw.js","static/chunks/2_bmp7e4sso`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
