# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/ADMIN_QA_ROUTE_BUTTON_INVENTORY_20260818.txt`
- **Member SHA-256:** `c1de3cbf858101b65ce89032020a428fccd24bc1e94f8fe3ba5dc3dc0f0d1899`
- **Line count:** 305
- **Read range:** `1-305`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: ## route files`
- `5: src/pages/_app.tsx`
- `6: src/pages/_document.tsx`
- `7: src/pages/admin/ai-control.tsx`
- `8: src/pages/admin/ambulance-fleet.tsx`
- `9: src/pages/admin/analytics.tsx`
- `10: src/pages/admin/audit-logs.tsx`
- `11: src/pages/admin/catalog-manager.tsx`
- `12: src/pages/admin/commissions.tsx`
- `13: src/pages/admin/config-portal.tsx`
- `14: src/pages/admin/dashboard.tsx`
- `15: src/pages/admin/disputes.tsx`
### backend_consumers_or_contracts
- `20: src/pages/admin/insurance-companies.tsx`
- `21: src/pages/admin/insurance-queue.tsx`
- `25: src/pages/admin/nursing-portal.tsx`
- `28: src/pages/admin/pharmacy-procurement.tsx`
- `37: src/pages/api/hello.ts`
- `41: src/pages/home-care-services/index.tsx`
- `48: fetch(`
- `49: fetch(...`
- `50: fetch(\n    url: string,\n    asPath: string = url,\n    options: PrefetchOptions = {}\n`
- `51: fetch(\n  router: NextRouter,\n  href: string,\n  as: string,\n  options: PrefetchOptions\n`
- `52: fetch(`${API_BASE}/api/v1${endpoint}`, { headers: { Accept: 'application/json' } }`
- `53: fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
### auth_ownership
- `1: # admin QA inventory`
- `2: root=/home/ubuntu/nabdah-live-extracted/admin-app/web-admin`
- `7: src/pages/admin/ai-control.tsx`
- `8: src/pages/admin/ambulance-fleet.tsx`
- `9: src/pages/admin/analytics.tsx`
- `10: src/pages/admin/audit-logs.tsx`
- `11: src/pages/admin/catalog-manager.tsx`
- `12: src/pages/admin/commissions.tsx`
- `13: src/pages/admin/config-portal.tsx`
- `14: src/pages/admin/dashboard.tsx`
- `15: src/pages/admin/disputes.tsx`
- `16: src/pages/admin/financial-ledger.tsx`
### state_transitions
- `53: fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `54: fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          Authorization: `Bearer ${token}`\n        },\n`
- `73: fetch(`${c}/api/v1/admin/authority/orders/${a}/force-cancel`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({reason:`Admin dispute resolution: ${b}`}`
- `82: fetch(`${n}/api/v1/admin/authority/orders/${e}/force-cancel`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({reason:`Admin dispute resolution: ${t}`}`
- `163: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/tsconfig.tsbuildinfo:1:{"fileNames":["./node_modules/typescript/lib/lib.es5.d.ts","./node_modules/typescript/lib/lib.es2015.d.ts","./node_modules/typescript/lib/lib.es2016.d.ts","./node`
- `164: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/cache/.tsbuildinfo:1:{"fileNames":["../../node_modules/typescript/lib/lib.es5.d.ts","../../node_modules/typescript/lib/lib.es2015.d.ts","../../node_modules/typescript/lib/lib.es20`
- `165: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_1sjnec-._.js:1:module.exports=[81323,a=>{"use strict";let b=async(a,b={})=>{let c={"Content-Type":"application/json",...b.headers},d=await fetch(a,{...b,headers`
- `166: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_10mutv_._.js.map:1:{"version":3,"sources":["../../../../src/utils/api.ts","../../../../node_modules/next/src/shared/lib/side-effect.tsx","../../../../node_modul`
- `167: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/[root-of-the-server]__1a4_cys._.js:5:${a.stack}`:a+"")}})})});let p=l;function q(){let a=g.default.useContext(i.RouterContext);if(!a)throw Object.defineProperty(`
- `170: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/[turbopack]_runtime.js:759:            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io`
- `172: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_0v9reyg._.js.map:1:{"version":3,"sources":["../../../../src/utils/api.ts","../../../../node_modules/next/src/shared/lib/side-effect.tsx","../../../../node_modul`
- `173: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_0v9reyg._.js:1:module.exports=[81323,a=>{"use strict";let b=async(a,b={})=>{let c={"Content-Type":"application/json",...b.headers},d=await fetch(a,{...b,headers`
### payment_insurance_relevance
- `20: src/pages/admin/insurance-companies.tsx`
- `21: src/pages/admin/insurance-queue.tsx`
- `27: src/pages/admin/payouts.tsx`
- `138: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/payouts.tsx:146:                                placeholder="سبب الرفض (يظهر للمزود)"`
- `140: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-queue.tsx:166:                        <input value={decideNote} onChange={(e) => setDecideNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-ful`
- `147: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:173:              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="مثال: cigna" className="border rounded px-3 py-2`
- `148: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:177:              <input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} placeholder="سيجنا" className="border rounded px-3 py-2 w`
- `149: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:181:              <input value={newNameEn} onChange={e => setNewNameEn(e.target.value)} placeholder="Cigna" className="border rounded px-3 py-2 w`
- `150: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:247:                          <input value={tierCode} onChange={e => setTierCode(e.target.value)} placeholder="الكود: vip" className="border roun`
- `151: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:248:                          <input value={tierNameAr} onChange={e => setTierNameAr(e.target.value)} placeholder="الاسم: VIP" className="border `
- `152: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:249:                          <input value={tierNameEn} onChange={e => setTierNameEn(e.target.value)} placeholder="Name: VIP" className="border r`
- `153: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/src/pages/admin/insurance-companies.tsx:250:                          <input value={tierLevel} onChange={e => setTierLevel(e.target.value.replace(/\D/g, ''))} placeholder="المستوى" clas`
### error_empty_loading_retry_cancel
- `53: fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `54: fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          Authorization: `Bearer ${token}`\n        },\n`
- `73: fetch(`${c}/api/v1/admin/authority/orders/${a}/force-cancel`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({reason:`Admin dispute resolution: ${b}`}`
- `82: fetch(`${n}/api/v1/admin/authority/orders/${e}/force-cancel`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({reason:`Admin dispute resolution: ${t}`}`
- `163: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/tsconfig.tsbuildinfo:1:{"fileNames":["./node_modules/typescript/lib/lib.es5.d.ts","./node_modules/typescript/lib/lib.es2015.d.ts","./node_modules/typescript/lib/lib.es2016.d.ts","./node`
- `164: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/cache/.tsbuildinfo:1:{"fileNames":["../../node_modules/typescript/lib/lib.es5.d.ts","../../node_modules/typescript/lib/lib.es2015.d.ts","../../node_modules/typescript/lib/lib.es20`
- `165: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_1sjnec-._.js:1:module.exports=[81323,a=>{"use strict";let b=async(a,b={})=>{let c={"Content-Type":"application/json",...b.headers},d=await fetch(a,{...b,headers`
- `166: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_10mutv_._.js.map:1:{"version":3,"sources":["../../../../src/utils/api.ts","../../../../node_modules/next/src/shared/lib/side-effect.tsx","../../../../node_modul`
- `167: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/[root-of-the-server]__1a4_cys._.js:5:${a.stack}`:a+"")}})})});let p=l;function q(){let a=g.default.useContext(i.RouterContext);if(!a)throw Object.defineProperty(`
- `170: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/[turbopack]_runtime.js:759:            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io`
- `172: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_0v9reyg._.js.map:1:{"version":3,"sources":["../../../../src/utils/api.ts","../../../../node_modules/next/src/shared/lib/side-effect.tsx","../../../../node_modul`
- `173: /home/ubuntu/nabdah-live-extracted/admin-app/web-admin/.next/server/chunks/ssr/_0v9reyg._.js:1:module.exports=[81323,a=>{"use strict";let b=async(a,b={})=>{let c={"Content-Type":"application/json",...b.headers},d=await fetch(a,{...b,headers`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
