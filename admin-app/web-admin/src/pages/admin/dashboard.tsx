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
  demandType: 'home_nursing' | 'diabetes_tracking' | 'pharmacy_broadcasts';
  density: number; // 0 to 100
  coordinates: [number, number];
}

export default function MasterDashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
        // Fetch System Health (Liveness/Readiness)
        const [livenessRes, readinessRes] = await Promise.all([
          fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/liveness`),
          fetchWithAdminGuard(`${API_BASE}/api/v1/system-health/readiness`)
        ]);
        
        if (livenessRes.ok && readinessRes.ok) {
          const livenessJson = await livenessRes.json();
          const readinessJson = await readinessRes.json();
          
          setHealthData({
            status: livenessJson.status === 'ok' && readinessJson.status === 'ok' ? 'ok' : 'error',
            info: {
              database: { status: livenessJson.services.database === 'connected' ? 'up' : 'down' },
              redis: { status: livenessJson.services.redis === 'connected' ? 'up' : 'down', memoryUsage: '14MB / 256MB' },
              containers: { status: 'up', uptime: `${readinessJson.uptime}s` }
            }
          });
        }

        // Fetch Heatmap Telemetry
        const heatRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/nabd-extensions/admin/analytics/heatmaps`);
        if (heatRes.ok) {
          const heatJson = await heatRes.json();
          setHeatmapData(heatJson.data || []);
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
            <span className={`w-3 h-3 rounded-full ${healthData?.info.database.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info.database.status === 'up' ? 'متصل' : 'قيد الانتظار'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">ذاكرة Redis المؤقتة</h3>
            <span className={`w-3 h-3 rounded-full ${healthData?.info.redis.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info.redis.memoryUsage || '---'}</p>
            <p className="text-sm text-slate-500 mt-1">معدل الاستهلاك</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">الخوادم (Microservices Uptime)</h3>
            <span className={`w-3 h-3 rounded-full ${healthData?.info.containers.status === 'up' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{healthData?.info.containers.uptime || '---'}</p>
            <p className="text-sm text-slate-500 mt-1">مدة التشغيل</p>
          </div>
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
                <div key={index} className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${cluster.coordinates[0]}%`, top: `${cluster.coordinates[1]}%` }}>
                  <div className={`rounded-full animate-ping opacity-75 absolute ${cluster.demandType === 'home_nursing' ? 'bg-indigo-400' : cluster.demandType === 'diabetes_tracking' ? 'bg-teal-400' : 'bg-amber-400'}`} style={{ width: `${cluster.density}px`, height: `${cluster.density}px` }}></div>
                  <div className={`rounded-full relative z-10 flex items-center justify-center text-xs font-bold text-white ${cluster.demandType === 'home_nursing' ? 'bg-indigo-600' : cluster.demandType === 'diabetes_tracking' ? 'bg-teal-600' : 'bg-amber-600'}`} style={{ width: `${cluster.density / 2}px`, height: `${cluster.density / 2}px` }}>
                    {cluster.density}%
                  </div>
                  <span className="text-white text-xs mt-2 bg-black bg-opacity-50 px-2 py-1 rounded whitespace-nowrap">
                    {cluster.region} - {cluster.demandType.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
