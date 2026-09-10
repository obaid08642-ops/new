import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

/**
 * Community moderation — posts & comments pending_review / removed
 * Backend: GET /community/posts?status=pending_review
 *          PUT /community/admin/:id/moderate {decision: published|removed}
 */
interface Post { id: string; title?: string; body?: string; author_id?: string; status?: string; createdAt?: string; reason?: string; }

export default function CommunityModerationPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiFetch('/community/posts?status=pending_review&page=1&limit=50');
      setPosts(Array.isArray(res) ? res : res?.posts || res?.data || []);
      setError('');
    } catch (e: any) { setError(e?.message || 'تعذر تحميل المنشورات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderate = async (id: string, decision: 'published' | 'removed') => {
    if (!confirm(decision === 'published' ? 'نشر المنشور؟' : 'حذف المنشور؟')) return;
    setBusy(id);
    try {
      await apiFetch(`/community/admin/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ decision }) });
      await load();
    } catch (e: any) { alert(e?.message || 'فشل الإجراء'); }
    finally { setBusy(null); }
  };

  return (
    <>
      <Head><title>إشراف المجتمع | نبض</title></Head>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800">إشراف المجتمع — منشورات مبلغ عنها</h1>
          <button onClick={() => load()} className="text-sm text-teal-700 font-bold">تحديث</button>
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
        {loading ? <div className="p-8 text-center text-slate-500">جاري التحميل...</div> : posts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد منشورات بانتظار المراجعة</div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-slate-800">{p.title || 'بدون عنوان'}</div>
                <div className="text-sm text-slate-600 mt-1 line-clamp-3">{p.body || ''}</div>
                <div className="text-xs text-slate-400 mt-2">{p.author_id || ''} · {p.createdAt?.slice(0,10) || ''} · {p.status}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => moderate(p.id, 'published')} disabled={busy===p.id} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">نشر</button>
                  <button onClick={() => moderate(p.id, 'removed')} disabled={busy===p.id} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
