# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/dashboard.tsx`
- **Member SHA-256:** `882f77e5d0531618ca69493d9055292b4614b448f436160831a518e8df4500cd`
- **Line count:** 251
- **Read range:** `1-251`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `90: setLiveOrders(Array.isArray(cc?.live_bookings) ? cc.live_bookings : []);`
- `180: <tr key={`${o.kind}-${o.id || i}`} className="hover:bg-teal-50 cursor-pointer" onClick={() => { if (o.kind && o.id) window.location.href = `/admin/order-detail?kind=${encodeURIComponent(o.kind)}&id=${encodeURIComponent(o.id)}`; }}>`
- `216: <button key={index} onClick={() => setSelectedCluster(cluster)} className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" style={{ left: `${cluster.coordinates?.[0] ?? 50}%`, t`
- `233: <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedCluster(null)}>`
- `234: <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>`
- `237: <button onClick={() => setSelectedCluster(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>`
- `245: <button onClick={() => setSelectedCluster(null)} className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">إغلاق</button>`
### backend_consumers_or_contracts
- `34: fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/liveness`),`
- `35: fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/readiness`)`
- `59: const heatRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/nabd-extensions/admin/analytics/heatmaps`);`
- `87: const ccRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/command-center`);`
- `211: <div className="text-slate-400">لا توجد بيانات حرارية حالياً (انتظار اتصال Socket)</div>`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `34: fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/liveness`),`
- `35: fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/readiness`)`
- `59: const heatRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/nabd-extensions/admin/analytics/heatmaps`);`
- `87: const ccRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/command-center`);`
- `180: <tr key={`${o.kind}-${o.id || i}`} className="hover:bg-teal-50 cursor-pointer" onClick={() => { if (o.kind && o.id) window.location.href = `/admin/order-detail?kind=${encodeURIComponent(o.kind)}&id=${encodeURIComponent(o.id)}`; }}>`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `5: status: 'ok' | 'error' | 'maintenance';`
- `7: database: { status: 'up' | 'down' };`
- `8: redis: { status: 'up' | 'down', memoryUsage: string };`
- `9: containers: { status: 'up' | 'down', uptime: string };`
- `22: const [healthData, setHealthData] = useState<HealthData | null>(null);`
- `23: const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);`
- `24: const [liveOrders, setLiveOrders] = useState<any[]>([]);`
- `25: const [isLoading, setIsLoading] = useState(true);`
- `26: const [selectedCluster, setSelectedCluster] = useState<HeatmapData | null>(null);`
- `41: const liveStatus = String(livenessJson.status || '').toLowerCase();`
- `42: const readyStatus = String(readinessJson.status || '').toLowerCase();`
### payment_insurance_relevance
- `188: <td className="p-3 font-bold">{Math.round(Number(o.total) || 0)} ر.س</td>`
### error_empty_loading_retry_cancel
- `5: status: 'ok' | 'error' | 'maintenance';`
- `25: const [isLoading, setIsLoading] = useState(true);`
- `46: status: liveStatus === 'ok' && readyStatus === 'ok' ? 'ok' : 'error',`
- `92: } catch (error) {`
- `93: console.error('Telemetry fetch error:', error);`
- `95: setIsLoading(false);`
- `208: {isLoading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
