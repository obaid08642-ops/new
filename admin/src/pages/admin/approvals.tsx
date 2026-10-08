import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-client';

/**
 * One list of everything that waits for an admin decision. There is no backend endpoint that returns "all pending
 * with counts" (see needs-review admin-mobile-essentials), so each row reads the same list endpoint its own page
 * uses and shows the count; a row that fails shows an error and a retry instead of a fake zero.
 */

type Count = number | null;
type Row = { key: string; label: string; hint: string; href: string; count: () => Promise<Count> };

const asList = (r: unknown): unknown[] => (Array.isArray(r) ? r : Array.isArray((r as { data?: unknown[] } | null)?.data) ? (r as { data: unknown[] }).data : []);
const pendingReview = (list: unknown[]) => list.filter((i) => ((i as { medical_review_status?: string }).medical_review_status || 'pending') === 'pending').length;

const ROWS: Row[] = [
  { key: 'providers', label: 'مزودون جدد', hint: 'اعتماد أو رفض أو طلب تعديل', href: '/admin/provider-moderation',
    count: async () => { const r = await adminFetch<{ items?: unknown[]; total?: number }>('/api/admin/admin/providers?status=pending&limit=100'); return r.total ?? (r.items || []).length; } },
  { key: 'deltas', label: 'تعديلات ملفات المزودين', hint: 'تعديلات بانتظار الاعتماد', href: '/admin/provider-moderation',
    count: async () => asList(await adminFetch('/api/admin/admin/providers/provider-deltas')).length },
  { key: 'withdrawals', label: 'طلبات سحب المزودين', hint: 'تنفيذ التحويل أو الرفض', href: '/admin/payouts',
    count: async () => asList(await adminFetch('/api/admin/admin/finance/withdrawals/pending')).length },
  { key: 'refunds', label: 'طلبات الاسترداد', hint: 'قرار الاسترداد', href: '/admin/insurance-queue',
    count: async () => asList(await adminFetch('/api/admin/admin/finance/refunds/queue')).length },
  { key: 'returns', label: 'طلبات الإرجاع', hint: 'قيد المراجعة', href: '/admin/returns',
    count: async () => asList(await adminFetch('/api/admin/admin/returns?status=processing')).length },
  { key: 'changes', label: 'اقتراحات تعديل الأدوية', hint: 'تعديل حقول أو صنف جديد أو صورة', href: '/admin/medicines-catalog',
    count: async () => (await adminFetch<{ total?: number }>('/medicines/admin/change-requests?status=pending&page=1&limit=1')).total ?? 0 },
  { key: 'shortage', label: 'بلاغات نقص الأدوية', hint: 'اعتماد شارة النقص', href: '/admin/shortage-reports',
    count: async () => (await adminFetch<{ total?: number }>('/medicines/admin/shortage-reports?status=pending&page=1&limit=1')).total ?? 0 },
  { key: 'images', label: 'اقتراحات صور الأدوية', hint: 'اعتماد أو رفض الصورة', href: '/admin/image-suggestions',
    count: async () => (await adminFetch<{ total?: number }>('/medicines/admin/image-suggestions?status=pending&page=1&limit=1')).total ?? 0 },
  { key: 'catalog', label: 'مراجعة طبية للكتالوج', hint: 'تحاليل وأشعة وتمريض', href: '/admin/catalog-manager',
    count: async () => {
      const lists = await Promise.all(['/labs/admin/catalog', '/radiology/admin/catalog', '/nursing/admin/catalog'].map((p) => adminFetch<unknown>(p)));
      return lists.reduce<number>((sum, l) => sum + pendingReview(asList(l)), 0);
    } },
];

export default function ApprovalsPage() {
  const [counts, setCounts] = useState<Record<string, Count | undefined>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const settle = useCallback((row: Row, value: Count | undefined) => {
    setCounts((prev) => ({ ...prev, [row.key]: value ?? null }));
    setFailed((prev) => ({ ...prev, [row.key]: value === undefined }));
  }, []);
  const loadRow = useCallback((row: Row) => row.count().then((v) => settle(row, v), () => settle(row, undefined)), [settle]);

  const loadAll = useCallback(() => {
    setLoading(true);
    return Promise.all(ROWS.map((row) => loadRow(row))).then(() => setLoading(false));
  }, [loadRow]);

  useEffect(() => {
    let live = true;
    Promise.all(ROWS.map((row) => loadRow(row))).then(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [loadRow]);

  const total = ROWS.reduce((sum, row) => sum + (counts[row.key] || 0), 0);
  const sorted = [...ROWS].sort((a, b) => (counts[b.key] || 0) - (counts[a.key] || 0));

  return (
    <>
      <Head><title>بانتظار موافقتي | نبض</title></Head>
      <section dir="rtl" className="space-y-5 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">بانتظار موافقتي</h1>
            <p className="mt-1 text-sm text-slate-500">{loading ? 'جارٍ العدّ…' : `${total.toLocaleString('ar-SA-u-ca-gregory')} عنصراً بانتظار قرار`}</p>
          </div>
          <button onClick={() => void loadAll()} disabled={loading} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">تحديث</button>
        </header>

        <ul className="space-y-3">
          {sorted.map((row) => {
            const value = counts[row.key];
            return (
              <li key={row.key}>
                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                  <Link href={row.href} className="min-w-0 flex-1">
                    <p className="font-bold">{row.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.hint}</p>
                  </Link>
                  {failed[row.key] ? (
                    <button onClick={() => void loadRow(row)} className="shrink-0 rounded border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700">تعذر التحميل — إعادة</button>
                  ) : (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${value ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                      {value === undefined ? '…' : (value ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
