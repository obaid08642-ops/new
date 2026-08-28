import React, { useEffect, useState } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

interface HealthData {
  status: 'ok' | 'error' | 'maintenance';
  info: {
    database: { status: 'up' | 'down' };
    redis: { status: 'up' | 'down', memoryUsage: string };
    containers: { status: 'up' | 'down', uptime: string };
  };
}

interface HeatmapData {
  region: string;
  demandType: string;
  count?: number;
  density: number; // 0 to 100
  coordinates: [number, number];
}

export default function MasterDashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<HeatmapData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
                // Fetch System Health (Liveness/Readiness)
        const [livenessRes, readinessRes] = await Promise.all([
          fetchWithAdminGuard(`/api/admin/system-health/liveness`),
          fetchWithAdminGuard(`/api/admin/system-health/readiness`)
        ]);

        if (livenessRes.ok && readinessRes.ok) {
          const livenessJson = await livenessRes.json();
          const readinessJson = await readinessRes.json();
          const liveStatus = String(livenessJson.status || '').toLowerCase();
          const readyStatus = String(readinessJson.status || '').toLowerCase();
          const dbStatus = livenessJson.services?.database || livenessJson.info?.mongodb?.status || livenessJson.details?.mongodb?.status;
          const redisStatus = livenessJson.services?.redis || livenessJson.info?.redis?.status || livenessJson.details?.redis?.status;
          setHealthData({
            status: liveStatus === 'ok' && readyStatus === 'ok' ? 'ok' : 'error',
            info: {
              database: { status: dbStatus === 'connected' || dbStatus === 'up' ? 'up' : 'down' },
              redis: {
                status: redisStatus === 'connected' || redisStatus === 'up' ? 'up' : 'down',
                memoryUsage: livenessJson.info?.redis?.memoryUsage || livenessJson.details?.redis?.memoryUsage || '—',
              },
              containers: { status: readyStatus === 'ok' ? 'up' : 'down', uptime: readinessJson.uptime ? `${readinessJson.uptime}s` : '—' }
            }
          });
        }

        // Fetch Heatmap Telemetry
        const heatRes = await fetchWithAdminGuard(`/api/admin/nabd-extensions/admin/analytics/heatmaps`);
        if (heatRes.ok) {
          const heatJson = await heatRes.json();
          // Backend shape: [{ city, category, count, coordinates:[lng,lat] }] (raw array).
          // Map defensively to the UI model — never trust optional fields.
          const raw: any[] = Array.isArray(heatJson) ? heatJson : (heatJson?.data || []);
          const maxCount = Math.max(1, ...raw.map((r: any) => Number(r?.count) || 0));
          // Saudi Arabia bounding box → project real [lng,lat] onto the panel (5%..95%)
          const LNG_MIN = 34.5, LNG_MAX = 55.7, LAT_MIN = 16.3, LAT_MAX = 32.2;
          const mapped: HeatmapData[] = raw.slice(0, 40).map((r: any, i: number) => {
            const coords = Array.isArray(r?.coordinates) && r.coordinates.length >= 2 ? r.coordinates : null;
            const lng = coords ? Number(coords[0]) : null;
            const lat = coords ? Number(coords[1]) : null;
            const valid = lng !== null && lat !== null && isFinite(lng) && isFinite(lat) && lng >= LNG_MIN && lng <= LNG_MAX && lat >= LAT_MIN && lat <= LAT_MAX;
            return {
              region: String(r?.city || r?.region || 'غير محدد'),
              demandType: String(r?.category || r?.demandType || 'general') as any,
              count: Number(r?.count) || 0,
              density: Math.min(100, Math.max(10, Math.round(((Number(r?.count) || 0) / maxCount) * 100))) as any,
              coordinates: valid
                ? [5 + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 90, 95 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 90]
                : [10 + ((i * 23) % 80), 15 + ((i * 37) % 70)],
            };
          });
          setHeatmapData(mapped);
        }

        // Live orders feed + global summary (command-center snapshot)
        const ccRes = await fetchWithAdminGuard(`/api/admin/command-center`);
        if (ccRes.ok) {
          const cc = await ccRes.json();
          setLiveOrders(Array.isArray(cc?.live_bookings) ? cc.live_bookings : []);
        }
      } catch (error) {
        console.error('Telemetry fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Simulate polling every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مركز القيادة (Master Command Center)</h1>
          <p className="text-slate-500 mt-1">المقاييس الطبية ومراقبة النظام الحيّة (Live Telemetry KPIs)</p>
        </div>
        {healthData && (
          <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${healthData.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className={`w-3 h-3 rounded-full ${healthData.status === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
            حالة المنظومة: {healthData.status === 'ok' ? 'مستقرة' : 'حرج'}
          </div>
        )}
      </div>

      {/* System Health Monitor Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">قاعدة البيانات (Core DB Pool)</h3>
            <span className={`w-3 h-3 rounded-full ${healthData?.info?.database.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info?.database.status === 'up' ? 'متصل' : 'قيد الانتظار'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">ذاكرة Redis المؤقتة</h3>
            <span className={`w-3 h-3 rounded-full ${healthData?.info?.redis.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info?.redis.memoryUsage || '---'}</p>
            <p className="text-sm text-slate-500 mt-1">معدل الاستهلاك</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">الخوادم (Microservices Uptime)</h3>
            <span className={`w-3 h-3 rounded-full ${healthData?.info?.containers.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info?.containers.uptime || '---'}</p>
            <p className="text-sm text-slate-500 mt-1">مدة التشغيل</p>
          </div>
        </div>
      </div>

      {/* Live incoming orders feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">الطلبات الحية الواردة الآن (Live Orders)</h2>
          <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">{liveOrders.length} طلب نشط</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {liveOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد طلبات نشطة حالياً — تُحدَّث هذه القائمة كل 30 ثانية.</div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                <tr>
                  <th className="p-3">رقم التتبع</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveOrders.slice(0, 50).map((o: any, i: number) => {
                  const KIND_AR: Record<string, string> = { pharmacy: 'صيدلية', lab: 'تحاليل', radiology: 'أشعة', nursing: 'تمريض', consultation: 'استشارة' };
                  const STATE_AR: Record<string, string> = { REQUESTED: 'مطلوب', MATCHING: 'جاري المطابقة', ASSIGNED: 'تم الإسناد', CONFIRMED: 'مؤكد', IN_PROGRESS: 'قيد التنفيذ' };
                  return (
                    <tr key={`${o.kind}-${o.id || i}`} className="hover:bg-teal-50 cursor-pointer" onClick={() => { if (o.kind && o.id) window.location.href = `/admin/order-detail?kind=${encodeURIComponent(o.kind)}&id=${encodeURIComponent(o.id)}`; }}>
                      <td className="p-3 font-mono text-teal-700">{o.tracking_id || o.id}</td>
                      <td className="p-3 font-bold">{KIND_AR[o.kind] || o.kind}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                          {STATE_AR[o.universal_state] || o.universal_state || o.domain_state}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{Math.round(Number(o.total) || 0)} ر.س</td>
                      <td className="p-3 text-slate-500" dir="ltr">{o.createdAt ? new Date(o.createdAt).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { hour12: false }) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* The Live Analytics Heatmap Grid Component */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            الخريطة الحرارية المباشرة (Live Demand Clusters)
          </h2>
        </div>
        <div className="p-6 min-h-[400px] relative bg-slate-900 flex items-center justify-center">
          {isLoading ? (
            <div className="text-white">جاري تحميل بيانات التكتلات...</div>
          ) : heatmapData.length === 0 ? (
            <div className="text-slate-400">لا توجد بيانات حرارية حالياً (انتظار اتصال Socket)</div>
          ) : (
            <div className="relative w-full h-full min-h-[400px]">
              {/* Interactive heat density visualization */}
              {heatmapData.map((cluster, index) => (
                <button key={index} onClick={() => setSelectedCluster(cluster)} className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" style={{ left: `${cluster.coordinates?.[0] ?? 50}%`, top: `${cluster.coordinates?.[1] ?? 50}%` }}>
                  <div className={`rounded-full animate-ping opacity-75 absolute ${cluster.demandType === 'home_nursing' || cluster.demandType === 'nursing' ? 'bg-indigo-400' : cluster.demandType === 'pharmacy' || cluster.demandType === 'pharmacy_broadcasts' ? 'bg-amber-400' : 'bg-teal-400'}`} style={{ width: `${cluster.density}px`, height: `${cluster.density}px` }}></div>
                  <div className={`rounded-full relative z-10 flex items-center justify-center text-xs font-bold text-white ${cluster.demandType === 'home_nursing' || cluster.demandType === 'nursing' ? 'bg-indigo-600' : cluster.demandType === 'pharmacy' || cluster.demandType === 'pharmacy_broadcasts' ? 'bg-amber-600' : 'bg-teal-600'}`} style={{ width: `${Math.max(28, cluster.density / 2)}px`, height: `${Math.max(28, cluster.density / 2)}px` }}>
                    {cluster.count ?? cluster.density}
                  </div>
                  <span className="text-white text-xs mt-2 bg-black bg-opacity-50 px-2 py-1 rounded whitespace-nowrap">
                    {cluster.region} - {String(cluster.demandType || '').replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cluster drill-down modal */}
      {selectedCluster && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedCluster(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">تفاصيل بؤرة الطلب</h3>
              <button onClick={() => setSelectedCluster(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">المنطقة:</span><span className="font-bold">{selectedCluster.region}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">نوع الطلب:</span><span className="font-bold">{String(selectedCluster.demandType).replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">عدد الطلبات:</span><span className="font-bold text-teal-700">{selectedCluster.count ?? selectedCluster.density}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">كثافة الطلب النسبية:</span><span className="font-bold">{selectedCluster.density}%</span></div>
            </div>
            <button onClick={() => setSelectedCluster(null)} className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
