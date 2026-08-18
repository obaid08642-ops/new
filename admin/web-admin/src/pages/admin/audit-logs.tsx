import { adminApiBase } from '@/utils/api';
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import EmptyIcon from '../../components/EmptyIcon';

interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  target: string;
  severity: 'info' | 'warning' | 'danger';
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const API_BASE = adminApiBase();
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/governance/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>سجل التدقيق والحوكمة | نبض</title>
      </Head>

      <div className="p-8 dir-rtl text-right">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">سجل عمليات الأمن والحوكمة (ABAC Audit Logs)</h1>
            <p className="text-slate-500 mt-1">تتبع غير قابل للتغيير لكافة العمليات السيادية والتعديلات الجارية على المنظومة</p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            تحديث السجل 
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">جاري تحميل سجل التدقيق...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <EmptyIcon name="shield" size={44} color="#0D9488" className="mb-3 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">لا توجد عمليات غير طبيعية مسجلة</h3>
            <p className="text-slate-500 text-sm mt-1">نظام الحوكمة والتحكم بالصلاحيات ABAC يراقب الاستدعاءات الأمنية على مدار الساعة.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
                  <th className="p-4">التاريخ والوقت</th>
                  <th className="p-4">المدير المسؤول</th>
                  <th className="p-4">الإجراء المنفذ</th>
                  <th className="p-4">الهدف / التغيير</th>
                  <th className="p-4">مستوى الأهمية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500">{new Date(log.createdAt || Date.now()).toLocaleString('ar-SA-u-ca-gregory')}</td>
                    <td className="p-4 font-medium text-slate-900">{log.adminId || 'Super Admin'}</td>
                    <td className="p-4 font-semibold text-slate-800">{log.action}</td>
                    <td className="p-4 text-slate-600">{log.target}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        log.severity === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' :
                        log.severity === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}>
                        {log.severity?.toUpperCase() || 'INFO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
