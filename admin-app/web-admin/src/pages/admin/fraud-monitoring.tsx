import React, { useEffect, useState } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

interface FraudAlert {
  id: string;
  entityId: string;
  entityName: string;
  type: 'doctor' | 'pharmacy';
  flagReason: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  endpoint: string;
  action: string;
  payloadHash: string;
  timestamp: string;
}

export default function FraudMonitoring() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGovernanceData = async () => {
      try {
        setIsLoading(true);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
        // Fetch Fraud Alerts
        const alertsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/fraud-alerts`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.data || []);
        }

        // Fetch ABAC Audit Logs
        const logsRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/audit-logs`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.data || []);
        }
      } catch (error) {
        console.error('Governance fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGovernanceData();
  }, []);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            الرقابة وتتبع الاحتيال (Fraud & ABAC Logs)
          </h1>
          <p className="text-gray-500 mt-1 font-medium">طبقة السجلات الثابتة (Strictly Immutable Data View Layer)</p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
          IMMUTABLE: No Write Routes
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Fraud Velocity Flag Indicators Panel */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-900 border-b border-slate-700 font-bold text-white flex justify-between items-center">
            <span>مؤشرات الاحتيال (Fraud Velocity Flags)</span>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{alerts.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-white border-l-4 border-l-red-500 border-y border-r border-gray-200 rounded p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900">{alert.entityName}</h3>
                  <span className={`text-xs px-2 py-1 rounded uppercase tracking-wider font-bold ${alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {alert.severity} Risk
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 mb-3">{new Date(alert.timestamp).toLocaleString('ar-SA')}</p>
                <div className="bg-red-50 p-2 rounded text-sm text-red-800 border border-red-100 font-medium">
                  {alert.flagReason}
                </div>
                <div className="mt-3 text-xs text-gray-400 font-mono">Entity ID: {alert.entityId} ({alert.type})</div>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-center text-gray-500 mt-10">لا توجد مؤشرات احتيال مرصودة</p>}
          </div>
        </div>

        {/* ABAC Audit Logs Viewer */}
        <div className="w-2/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-100 border-b border-gray-200 font-bold text-slate-800 flex justify-between items-center">
            <span>سجلات النظام غير القابلة للتعديل (ABAC Immutable Audit Logs Viewer)</span>
            <span className="text-xs text-slate-500 font-normal">Tracking Absolute Historical Mutations</span>
          </div>
          <div className="flex-1 overflow-auto bg-white p-0">
            <table className="w-full text-sm text-left whitespace-nowrap" dir="ltr">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Actor (Who)</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Action & Endpoint</th>
                  <th className="px-6 py-3 font-medium">Payload Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(log.timestamp).toLocaleString('en-US')}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{log.actorId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${log.actorRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{log.action}</div>
                      <div className="text-slate-400 text-xs font-mono mt-1">{log.endpoint}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 bg-slate-50 border-l border-slate-100">
                      {log.payloadHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-gray-500 mt-10">No logs found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
