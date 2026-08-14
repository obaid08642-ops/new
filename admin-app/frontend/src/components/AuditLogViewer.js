import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Card, T } from '../App'; // Using App's theme variables

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLoading(true);
    client.get('/security/audit/admin', { params: { search, limit: 50 } })
      .then(res => setLogs(res.data.logs || []))
      .catch(err => console.error("Failed to load audit logs", err))
      .finally(() => setLoading(false));
  };

  const severityColor = (sev) => {
    switch(sev) {
      case 'critical': return T.red;
      case 'warn': return '#F59E0B';
      default: return T.primary;
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>سجل التدقيق الشامل (Global Audit Logs)</h2>
        <div>
          <input 
            type="text" 
            placeholder="بحث في السجلات..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, marginLeft: 10 }}
          />
          <button 
            onClick={loadLogs}
            style={{ background: T.primary, color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 8, cursor: 'pointer' }}
          >
            تحديث
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>جاري تحميل السجلات...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: 12, textAlign: 'right' }}>الوقت</th>
                <th style={{ padding: 12, textAlign: 'right' }}>العملية (Action)</th>
                <th style={{ padding: 12, textAlign: 'right' }}>المستخدم (User)</th>
                <th style={{ padding: 12, textAlign: 'right' }}>IP Address</th>
                <th style={{ padding: 12, textAlign: 'right' }}>التفاصيل (Diff/Data)</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center' }}>لا توجد سجلات مطابقة</td></tr>
              ) : logs.map(log => (
                <tr key={log._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: 12 }}>{new Date(log.createdAt).toLocaleString('ar-SA')}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      background: `${severityColor(log.severity)}22`, 
                      color: severityColor(log.severity),
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {log.user_id ? `${log.role} (${log.user_id.slice(-6)})` : 'System / Guest'}
                  </td>
                  <td style={{ padding: 12, fontFamily: 'monospace' }}>{log.ip || 'N/A'}</td>
                  <td style={{ padding: 12 }}>
                    {log.details ? (
                      <pre style={{ margin: 0, fontSize: 11, background: '#f8f9fa', padding: 8, borderRadius: 4, maxWidth: 300, overflowX: 'auto' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
