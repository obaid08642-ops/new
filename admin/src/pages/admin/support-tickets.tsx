import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import EmptyIcon from '../../components/EmptyIcon';

/**
 * M5: support tickets admin — list (GET /support/admin/requests),
 * reply in-thread (POST /support/requests/:id/reply),
 * status transitions (PATCH /support/admin/requests/:id).
 */
const STATUS_AR: Record<string, { ar: string; cls: string }> = {
  OPEN: { ar: 'مفتوحة', cls: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { ar: 'قيد المعالجة', cls: 'bg-amber-100 text-amber-700' },
  RESOLVED: { ar: 'محلولة', cls: 'bg-green-100 text-green-700' },
  CLOSED: { ar: 'مغلقة', cls: 'bg-slate-100 text-slate-600' },
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/support/admin/requests${filter ? `?status=${filter}` : ''}`);
      setTickets(Array.isArray(data) ? data : data?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل التذاكر');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/support/admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (e: any) { alert(e?.message || 'فشل تحديث الحالة'); }
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await apiFetch(`/support/requests/${id}/reply`, { method: 'POST', body: JSON.stringify({ message: replyText.trim() }) });
      setReplyText('');
      load();
    } catch (e: any) { alert(e?.message || 'فشل إرسال الرد'); }
  };

  return (
    <>
      <Head><title>تذاكر الدعم | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2">
            {(['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === s ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {s === '' ? 'الكل' : STATUS_AR[s].ar}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">تحديث </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <EmptyIcon name="chat" size={44} color="#0D9488" className="mb-3 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">لا توجد تذاكر</h3>
              <p className="text-slate-500 text-sm mt-1">تذاكر المرضى والمزودين ستظهر هنا.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => {
                const meta = STATUS_AR[t.status] || { ar: t.status, cls: 'bg-slate-100 text-slate-600' };
                const isOpen = openId === t.id;
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{t.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.cls}`}>{meta.ar}</span>
                          {t.priority === 'high' && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">أولوية عالية</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {t.user_name || t.user_phone || t.user_id} · {t.source_role === 'provider' ? 'مزود' : 'مريض'} · {t.category} · {new Date(t.createdAt).toLocaleString('ar-SA-u-ca-gregory')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {t.status !== 'IN_PROGRESS' && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                          <button onClick={() => setStatus(t.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">بدء المعالجة</button>
                        )}
                        {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                          <button onClick={() => setStatus(t.id, 'RESOLVED')} className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold">حلّها</button>
                        )}
                        <button onClick={() => setOpenId(isOpen ? null : t.id)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold">
                          {isOpen ? 'إخفاء' : 'المحادثة والرد'}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-100 pt-3 space-y-3">
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {(t.thread || []).map((m: any, i: number) => (
                            <div key={i} className={`rounded-xl p-3 text-sm max-w-[80%] ${m.role === 'admin' ? 'bg-teal-50 mr-auto' : 'bg-slate-100'}`}>
                              <div className="text-[10px] text-slate-400 mb-1">{m.role === 'admin' ? 'الدعم' : 'المستخدم'} · {new Date(m.at).toLocaleString('ar-SA-u-ca-gregory')}</div>
                              {m.message}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب رد الدعم…"
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && sendReply(t.id)}
                          />
                          <button onClick={() => sendReply(t.id)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">إرسال</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );
}
