import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  gemini: { label: 'Google Gemini', color: '#4285F4' },
  groq: { label: 'Groq', color: '#F55036' },
  openai: { label: 'OpenAI (ChatGPT)', color: '#10A37F' },
  deepseek: { label: 'DeepSeek', color: '#6D5DF6' },
  openrouter: { label: 'OpenRouter', color: '#B84FC7' },
  cerebras: { label: 'Cerebras', color: '#F5A623' },
  qwen: { label: 'Qwen (Alibaba)', color: '#FF6A00' },
  replicate: { label: 'Replicate (صور)', color: '#19C3D6' },
};

export default function AiControlPage() {
  const [data, setData] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [g, u] = await Promise.all([
      apiFetch('/ai/admin/gateway').catch(() => null),
      apiFetch(`/ai/admin/usage?days=${days}`).catch(() => []),
    ]);
    if (g) setData(g);
    setUsage(Array.isArray(u) ? u : []);
  };
  useEffect(() => { load(); }, [days]);

  const toggle = async (key: string, enabled: boolean) => {
    setBusy(key);
    await apiFetch(`/ai/admin/gateway/provider/${key}`, { method: 'POST', body: JSON.stringify({ enabled: !enabled }) }).catch(() => null);
    await load();
    setBusy(null);
  };

  const setMode = async (mode: 'auto' | 'manual', pinned?: string) => {
    await apiFetch('/ai/admin/gateway/mode', { method: 'POST', body: JSON.stringify({ mode, pinned }) }).catch(() => null);
    await load();
  };

  if (!data) return <div className="p-8 text-center text-gray-500" dir="rtl">جاري التحميل...</div>;

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">بوابة الذكاء الاصطناعي (Multi-Provider Gateway)</h1>
      <p className="text-sm text-gray-500 mb-6">توجيه تلقائي بالأولوية + fallback عند الحد/الفشل — تحكم كامل بدون نشر.</p>

      <div className="bg-white p-4 rounded-lg shadow border mb-6 flex items-center gap-4 flex-wrap">
        <span className="font-bold">وضع التشغيل:</span>
        <button
          onClick={() => setMode('auto')}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${data.mode === 'auto' ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}
        >
          تلقائي (Fallback + Round Robin)
        </button>
        <select
          value={data.mode === 'manual' ? (data.pinned_provider || '') : ''}
          onChange={e => e.target.value && setMode('manual', e.target.value)}
          className={`px-4 py-2 rounded-lg font-bold text-sm border ${data.mode === 'manual' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white'}`}
        >
          <option value="">يدوي — تثبيت مزود...</option>
          {data.providers.filter((p: any) => p.has_key).map((p: any) => (
            <option key={p.key} value={p.key}>تثبيت: {PROVIDER_META[p.key]?.label || p.key}</option>
          ))}
        </select>
        {data.mode === 'manual' && <span className="text-purple-600 text-sm font-bold">مثبت على: {data.pinned_provider}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {data.providers.map((p: any) => {
          const meta = PROVIDER_META[p.key] || { label: p.key, color: '#666' };
          const quotaPct = p.daily_quota > 0 ? Math.min(100, Math.round((p.used_today / p.daily_quota) * 100)) : 0;
          return (
            <div key={p.key} className={`p-4 rounded-xl border-2 ${p.enabled ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white opacity-70'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.enabled ? 'مفعّل' : 'معطّل'}
                </span>
              </div>
              <div className="font-bold">{meta.label}</div>
              <div className="text-xs text-gray-500 mt-1" dir="ltr">{p.model}</div>
              <div className="text-xs mt-2">
                الاستهلاك اليومي: <b>{p.used_today}</b> / {p.daily_quota || '∞'}
              </div>
              {p.daily_quota > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className={`h-1.5 rounded-full ${quotaPct > 85 ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${quotaPct}%` }} />
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">أولوية {p.priority} · مفتاح {p.has_key ? '✓' : '✗'}</div>
              <button
                onClick={() => toggle(p.key, p.enabled)}
                disabled={busy === p.key}
                className={`mt-3 w-full py-2 rounded-lg text-sm font-bold ${p.enabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
              >
                {busy === p.key ? '...' : p.enabled ? 'تعطيل' : 'تفعيل'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">سجل الطلبات والاستهلاك</h2>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="border rounded p-2 text-sm">
            <option value={1}>24 ساعة</option>
            <option value={7}>7 أيام</option>
            <option value={30}>30 يوم</option>
          </select>
        </div>
        {usage.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا استخدام بعد في هذه الفترة</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">المزود</th>
                <th className="p-3 text-right">النموذج</th>
                <th className="p-3 text-right">الميزة</th>
                <th className="p-3 text-right">النداءات</th>
                <th className="p-3 text-right">الفشل</th>
                <th className="p-3 text-right">Fallbacks</th>
                <th className="p-3 text-right">الزمن</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u: any, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-bold">{u._id.provider}</td>
                  <td className="p-3 text-xs" dir="ltr">{u._id.model}</td>
                  <td className="p-3">{u._id.feature}</td>
                  <td className="p-3">{u.calls}</td>
                  <td className={`p-3 ${u.failures > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{u.failures}</td>
                  <td className="p-3 text-purple-600 font-bold">{u.fallbacks || 0}</td>
                  <td className="p-3">{Math.round(u.avg_ms)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
