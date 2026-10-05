import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

type Domain =
  | 'orders'
  | 'bookings'
  | 'providers'
  | 'patients'
  | 'transactions'
  | 'refunds'
  | 'payouts'
  | 'loyalty'
  | 'insurance'
  | 'disputes'
  | 'audit';

interface DrillDownData {
  entity: any;
  history: any[];
  payments?: any[];
  refunds?: any[];
  chatLinks?: any[];
  auditEntries?: any[];
  stateHistory?: any[];
}

export default function DrillDownPage() {
  const router = useRouter();
  const { domain, id } = router.query;

  const [data, setData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!domain || !id) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res: any = await adminFetch(`/api/admin/admin/reports/drilldown/${domain}/${id}`);
        setData(res);
      } catch (cause) {
        setError(apiErrorMessage(cause, 'تعذر تحميل التفاصيل.'));
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [domain, id]);

  if (router.isFallback || !domain || !id) {
    return <div className="p-6 text-center">جارٍ التحميل…</div>;
  }

  if (loading) {
    return <div className="p-6 text-center">جارٍ إنشاء التفاصيل…</div>;
  }

  if (error) {
    return <div className="p-6 rounded-lg bg-rose-50 text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-center">لا توجد بيانات.</div>;
  }

  const formatDate = (date: string | Date) => new Date(date).toLocaleString('ar-SA');
  const formatAmount = (amount: number) => amount.toLocaleString('ar-SA');

  const tabs = [
    { key: 'overview', label: 'نظرة عامة' },
    { key: 'stateHistory', label: 'سجل الحالات' },
    { key: 'payments', label: 'المدفوعات' },
    { key: 'refunds', label: 'الاستردادات' },
    { key: 'chat', label: 'الدعم/المحادثات' },
    { key: 'audit', label: 'سجل التدقيق' },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].key);

  const renderOverview = () => {
    const e = data?.entity;
    if (!e) return <p>لا توجد بيانات للكيان.</p>;
    return (
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">النوع</dt><dd className="font-bold">{domain}</dd></div>
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">المعرف</dt><dd className="font-bold font-mono">{id}</dd></div>
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">الحالة</dt><dd className="font-bold">{e.state || e.status || '—'}</dd></div>
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">تاريخ الإنشاء</dt><dd className="font-bold">{formatDate(e.createdAt || e.created_at)}</dd></div>
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">آخر تحديث</dt><dd className="font-bold">{formatDate(e.updatedAt || e.updated_at)}</dd></div>
        <div className="bg-slate-50 rounded-lg p-4"><dt className="text-slate-500">المبلغ</dt><dd className="font-bold">{e.amount ? formatAmount(e.amount) : '—'}</dd></div>
      </dl>
    );
  };

  const renderTable = (rows: any[], columns: { key: string; label: string; format?: (v: any) => string }[]) => {
    if (!rows.length) return <p className="text-slate-500 text-center py-8">لا توجد سجلات.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm">
          <thead><tr className="border-b text-slate-500">
            {columns.map((c) => <th key={c.key} className="p-2">{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className="p-2">{c.format ? c.format(r[c.key]) : r[c.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <Head><title>تفاصيل {domain} | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">تفاصيل السجل</h1>
            <p className="mt-1 text-sm text-slate-500">{domain} / {id}</p>
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === t.key ? 'bg-teal-700 text-white' : 'bg-white border'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'overview' && <article className="rounded-2xl border bg-white p-6 shadow-sm">{renderOverview()}</article>}

        {activeTab === 'stateHistory' && (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            {renderTable(data?.stateHistory || [], [
              { key: 'from', label: 'من', format: (v) => v || '—' },
              { key: 'to', label: 'إلى', format: (v) => v || '—' },
              { key: 'at', label: 'في', format: formatDate },
              { key: 'by', label: 'بواسطة' },
            ])}
          </article>
        )}

        {activeTab === 'payments' && (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            {renderTable(data?.payments || [], [
              { key: 'id', label: 'المعرف', format: (v) => v?.slice(0, 16) + '…' },
              { key: 'amount', label: 'المبلغ', format: formatAmount },
              { key: 'gateway', label: 'البوابة' },
              { key: 'status', label: 'الحالة' },
              { key: 'createdAt', label: 'التاريخ', format: formatDate },
            ])}
          </article>
        )}

        {activeTab === 'refunds' && (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            {renderTable(data?.refunds || [], [
              { key: 'id', label: 'المعرف', format: (v) => v?.slice(0, 16) + '…' },
              { key: 'amount', label: 'المبلغ', format: formatAmount },
              { key: 'method', label: 'الطريقة' },
              { key: 'reason', label: 'السبب' },
              { key: 'createdAt', label: 'التاريخ', format: formatDate },
            ])}
          </article>
        )}

        {activeTab === 'chat' && (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            {renderTable(data?.chatLinks || [], [
              { key: 'id', label: 'المعرف' },
              { key: 'type', label: 'النوع' },
              { key: 'url', label: 'الرابط', format: (v) => <a href={v} target="_blank" rel="noopener" className="text-teal-700 underline">{v}</a> },
              { key: 'createdAt', label: 'التاريخ', format: formatDate },
            ])}
          </article>
        )}

        {activeTab === 'audit' && (
          <article className="rounded-2xl border bg-white p-6 shadow-sm">
            {renderTable(data?.auditEntries || [], [
              { key: 'action', label: 'الإجراء' },
              { key: 'actor', label: 'الفاعل' },
              { key: 'detail', label: 'التفاصيل' },
              { key: 'createdAt', label: 'التاريخ', format: formatDate },
            ])}
          </article>
        )}
      </section>
    </>
  );
}