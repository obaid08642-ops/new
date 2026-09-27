import { useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';

type Results = {
  q: string;
  users: Array<{ id: string; full_name?: string; name?: string; phone?: string; email?: string; role?: string }>;
  providers: Array<{ id: string; user_id?: string; name_ar?: string; name_en?: string; phone?: string; provider_type?: string; verification_status?: string }>;
  orders: Array<{ id: string; state?: string; total_price?: number; createdAt?: string }>;
  bookings: Array<{ id: string; status?: string; doctor_id?: string; slot_start?: string }>;
};

/** P6.x-11: global admin search (users, providers, orders, bookings). */
export default function SearchPage() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (q.trim().length < 2) { setError('أدخل حرفين على الأقل.'); return; }
    setLoading(true); setError('');
    try {
      setData(await adminFetch<Results>(`/search?q=${encodeURIComponent(q.trim())}`));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر البحث.'));
    } finally {
      setLoading(false);
    }
  };

  const groups: Array<{ key: keyof Omit<Results, 'q'>; label: string }> = [
    { key: 'users', label: 'المستخدمون' },
    { key: 'providers', label: 'المزودون' },
    { key: 'orders', label: 'الطلبات' },
    { key: 'bookings', label: 'الحجوزات' },
  ];

  return (
    <>
      <Head><title>البحث الشامل | نبض</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header><h1 className="text-3xl font-bold">البحث الشامل</h1>
          <p className="mt-1 text-sm text-slate-500">بحث برقم الهوية أو الجوال أو الاسم عبر المستخدمين والمزودين والطلبات والحجوزات.</p>
        </header>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
            placeholder="id / جوال / اسم…" className="w-full rounded-lg border p-2 text-sm" />
          <button onClick={() => void run()} disabled={loading} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">بحث</button>
        </div>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
        {loading ? <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ البحث…</p> : null}
        {data && (
          <div className="grid gap-6 lg:grid-cols-2">
            {groups.map((g) => (
              <article key={g.key} className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">{g.label} ({data[g.key].length})</h2>
                <ul className="mt-3 divide-y text-sm">
                  {data[g.key].map((r: any, i: number) => (
                    <li key={r.id || i} className="py-2" dir="ltr" style={{ textAlign: 'right' }}>
                      <strong>{r.id}</strong>
                      <span className="text-slate-500"> · {[r.full_name || r.name || r.name_ar || r.name_en, r.phone, r.email, r.role || r.provider_type || r.verification_status, r.state || r.status, r.slot_start || r.createdAt].filter(Boolean).join(' · ')}</span>
                    </li>
                  ))}
                  {data[g.key].length === 0 && <li className="py-2 text-slate-400">لا نتائج</li>}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
