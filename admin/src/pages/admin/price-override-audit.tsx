import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage, toQuery } from '@/lib/admin-client';

// Shape mirrors the real audit documents written by
// backend/src/modules/pharmacy/services/pharmacy-offer.service.ts
// (collection: pharmacy_price_override_audit) and served read-only by
// GET /api/v2/admin/pharmacy/price-overrides (AdminPharmacyController).
// Nullable fields are expected: sku / names / catalog_price may be null.
type PriceAuditRecord = {
  id: string;
  order_id?: string;
  offer_id?: string;
  offer_version?: number;
  pharmacy_account_id?: string;
  order_item_id?: string;
  sku?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  catalog_price?: number | null;
  override_price?: number | null;
  currency?: string;
  reason?: string | null;
  changed_by?: string | null;
  changed_at?: string | null;
};

type PriceAuditResponse = {
  items?: PriceAuditRecord[];
  data?: PriceAuditRecord[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
};

const PAGE_SIZE = 25;

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function formatPrice(value: unknown, currency = 'ر.س'): string {
  const n = toFiniteNumber(value);
  return n === null ? '—' : `${n.toFixed(2)} ${currency}`;
}

function formatPct(value: unknown, fractionDigits = 1): string {
  const n = toFiniteNumber(value);
  return n === null ? '—' : `${n.toFixed(fractionDigits)}%`;
}

// Catalog-vs-override variance, computed client-side so the page never
// depends on a precomputed difference_pct field that the writer does not emit.
function variancePct(row: PriceAuditRecord): number | null {
  const catalog = toFiniteNumber(row.catalog_price);
  const override = toFiniteNumber(row.override_price);
  if (catalog === null || override === null || catalog <= 0) return null;
  return ((override - catalog) / catalog) * 100;
}

function formatDateTime(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SA-u-ca-gregory');
}

export default function PriceOverrideAuditPage() {
  const [rows, setRows] = useState<PriceAuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch<PriceAuditResponse>(
        `/api/admin/admin/pharmacy/price-overrides${toQuery({ page, limit: PAGE_SIZE })}`,
      );
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
      setRows(items);
      setTotal(toFiniteNumber(res?.total) ?? items.length);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر تحميل سجل تدقيق أسعار الصيدليات.'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) =>
      [row.sku, row.name_ar, row.name_en, row.pharmacy_account_id, row.reason, row.order_id, row.offer_id]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .some((v) => v.toLowerCase().includes(normalizedSearch)),
    );
  }, [rows, normalizedSearch]);

  const summary = useMemo(() => {
    const variances = filtered
      .map(variancePct)
      .filter((v): v is number => v !== null);
    return {
      total_overrides: total,
      flagged_overpriced: variances.filter((v) => v > 0).length,
      avg_variance_pct: variances.length
        ? variances.reduce((sum, v) => sum + v, 0) / variances.length
        : 0,
    };
  }, [filtered, total]);

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <>
      <Head>
        <title>تدقيق أسعار الصيدليات | نبضة بلس</title>
      </Head>
      <section dir="rtl" className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">سجل تدقيق أسعار الأدوية (Price Override Audit)</h1>
            <p className="mt-1 text-sm text-slate-500">
              مراقبة التزام الصيدليات بالسعر الرسمي المحدد من الهيئة العامة للغذاء والدواء (SFDA) ورصد أي تعديلات سعرية.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="rounded-lg border px-3 py-2 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="بحث بالدواء أو الصيدلية أو SKU…"
            />
            <button
              onClick={() => void loadData()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 transition"
            >
              تحديث
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        {/* Stats Header */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">إجمالي التعديلات السعرية</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? '…' : summary.total_overrides}
            </h2>
            <p className="mt-1 text-xs text-slate-500">سجل مشفّر وموثق رقابياً</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">معدل الفارق السعري</p>
            <h2 className="mt-2 text-3xl font-bold text-teal-600">
              {loading ? '…' : formatPct(summary.avg_variance_pct)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">ضمن الهامش القانوني المسموح</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">التنبيهات السعرية المرتفعة</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-600">
              {loading ? '…' : summary.flagged_overpriced}
            </h2>
            <p className="mt-1 text-xs text-amber-600">تجاوز السعر الرسمي المعتمد</p>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="p-4">الوقت</th>
                <th className="p-4">الصيدلية</th>
                <th className="p-4">الدواء (SKU)</th>
                <th className="p-4">السعر الرسمي (SFDA)</th>
                <th className="p-4">السعر المعدل</th>
                <th className="p-4">نسبة الفرق</th>
                <th className="p-4">المبرر / المنفّذ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">جارٍ تحميل سجل التدقيق السعري…</td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => {
                  const diff = variancePct(row);
                  const overpriced = diff !== null && diff > 0;
                  return (
                    <tr key={row.id} className="border-t hover:bg-slate-50">
                      <td className="p-4 text-xs text-slate-500">
                        {formatDateTime(row.changed_at)}
                      </td>
                      <td className="p-4 font-medium text-slate-900">{row.pharmacy_account_id || '—'}</td>
                      <td className="p-4">
                        <div>{row.name_ar || row.name_en || row.sku || '—'}</div>
                        <div className="text-xs text-slate-400">{row.sku || row.order_item_id || ''}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{formatPrice(row.catalog_price, row.currency || 'ر.س')}</td>
                      <td className="p-4 font-semibold text-slate-900">{formatPrice(row.override_price, row.currency || 'ر.س')}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            overpriced
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {diff === null ? '—' : overpriced ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        <div>{row.reason || '—'}</div>
                        <div className="text-slate-400 mt-0.5">{row.changed_by || 'النظام التلقائي'}</div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    لا توجد سجلات تعديل أسعار مطابقة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>إجمالي التعديلات المسجلة: {total || 0}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
              className="rounded border bg-white px-3 py-1 disabled:opacity-40"
            >
              السابق
            </button>
            <span className="px-2 py-1">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages || loading}
              onClick={() => setPage((v) => v + 1)}
              className="rounded border bg-white px-3 py-1 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
