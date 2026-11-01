import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';
import { DataTable } from '@/components/DataTable';
import Link from 'next/link';
import { useCan } from '@/components/AdminGuard';

// A row of the commission ledger as the server stores it (admin/web-core/schemas/commission-ledger.schema.ts): the amounts are
// computed and stored by the server, this page only shows them.
interface CommissionRow {
  _id?: string;
  providerName?: string;
  providerType?: string;
  baseBill?: number;
  systemCommission?: number;
  vatOnCommission?: number;
  providerEarning?: number;
}


// A procurement request as the server returns it (a raw document: `_id`, `pharmacy_id`, items with `raw_name_string` and `requested_quantity`).
interface WarehouseOrder {
  _id: string;
  pharmacy_id?: string;
  items: { raw_name_string?: string; requested_quantity: number; unitPrice: number }[];
  status: string;
}

interface FinanceSummary {
  gross_revenue: number;
  provider_pending_escrow: number;
  commission: number;
  vat_on_commission: number;
  net_revenue?: number;
}

export default function FinancialLedger() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'warehouse'>('ledger');

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [warehouseOrders, setWarehouseOrders] = useState<WarehouseOrder[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payoutQueueTotal, setPayoutQueueTotal] = useState<number | null>(null); // the open payout requests (the one payouts queue)
  const [financeUnavailable, setFinanceUnavailable] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const canQuote = useCan('pharmacy.inventory.edit');   // issue-quote needs PHARMACY_INVENTORY_EDIT

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setIsLoading(true);
        setFinanceUnavailable(false);

        // Live finance summary — never render placeholder KPIs in production.
        const summaryRes = await fetchWithAdminGuard(`/api/admin/admin/finance-engine/reports/summary?period=monthly`);
        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        } else {
          setFinanceUnavailable(true);
        }

        // Fetch Commissions
        const commRes = await fetchWithAdminGuard(`/api/admin/admin/finance/commissions/records`);
        if (commRes.ok) {
          const data = await commRes.json();
          setCommissions(data.data || []);
        } else {
          setFinanceUnavailable(true);
        }

        // Open payout requests, from the one payouts queue (the page /admin/payouts handles them)
        const withRes = await fetchWithAdminGuard(`/api/admin/admin/finance/payouts?page=1&limit=1`);
        if (withRes.ok) {
          const data = await withRes.json();
          const open = (data.by_state || []).filter((x: { state: string }) => ['PENDING_ADMIN_APPROVAL', 'AWAITING_SECOND_APPROVAL', 'APPROVED_FOR_PAYOUT'].includes(x.state));
          setPayoutQueueTotal(open.reduce((sum: number, x: { amount?: number }) => sum + (Number(x.amount) || 0), 0));
        } else {
          setFinanceUnavailable(true);
        }

        // Fetch Warehouse Orders
        const whRes = await fetchWithAdminGuard(`/api/admin/admin/extended-operations/procurement/pending`);
        if (whRes.ok) {
          const data = await whRes.json();
          setWarehouseOrders((data.data || []).map((o: WarehouseOrder) => ({ ...o, items: (o.items || []).map((i) => ({ ...i, unitPrice: Number(i.unitPrice) || 0 })) })));
        } else {
          setFinanceUnavailable(true);
        }
      } catch (error) {
        console.error('Finance fetch error:', error);
        setFinanceUnavailable(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  const handleUpdateWarehousePrice = (orderId: string, itemIndex: number, price: number) => {
    setWarehouseOrders(prev => prev.map(order => {
      if (order._id !== orderId) return order;
      const newItems = [...order.items];
      newItems[itemIndex].unitPrice = price;
      return { ...order, items: newItems };
    }));
  };

  const handleIssueQuotation = async (order: WarehouseOrder) => {
    const total_warehouse_quotation_price = order.items.reduce((sum, item) => sum + (item.requested_quantity * item.unitPrice), 0);
    if (total_warehouse_quotation_price <= 0 || order.items.some((item) => !(item.unitPrice > 0))) return alert('يجب تسعير كل العناصر أولاً');

    try {
      const res = await fetchWithAdminGuard(`/api/admin/admin/extended-operations/issue-quote/${encodeURIComponent(order._id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ pricingItems: order.items, totalPrice: total_warehouse_quotation_price })
      });
      // fetchWithAdminGuard does not throw on a 4xx/5xx: the server's refusal is shown, and nothing is marked as sent
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(String(Array.isArray(body?.message) ? body.message[0] : body?.message ?? res.status));
      }
      alert(`تم إرسال تسعيرة المشتريات بقيمة ${total_warehouse_quotation_price} SAR للصيدلية وتغيير الحالة إلى QUOTATION_ISSUED`);
      setWarehouseOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'QUOTATION_ISSUED' } : o));
    } catch (e) {
      console.error(e);
      alert(`خطأ في إرسال التسعيرة: ${e instanceof Error ? e.message : ''}`);
    }
  };

  const money = (value: number | null | undefined) => {
    if (typeof value === 'number') {
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} SAR`;
    }
    return isLoading ? '…' : 'غير متاح';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">السجل المالي (Financial Ledger)</h1>
          <p className="text-gray-500 mt-1">حسابات النظام، مدفوعات العمولات، وتسعير مستودعات الـ B2B</p>
        </div>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button className={`px-6 py-2 font-bold ${activeTab === 'ledger' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setActiveTab('ledger')}>
            السجل المالي والمدفوعات
          </button>
          <button className={`px-6 py-2 font-bold ${activeTab === 'warehouse' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setActiveTab('warehouse')}>
            تسعير المستودعات (B2B Warehouse)
          </button>
        </div>
      </div>

      {activeTab === 'ledger' && (
        <div className="space-y-8">
          {/* Quad financial widget cards — live Finance Engine summary (no placeholders). */}
          {financeUnavailable && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-bold">
              تعذر تحميل بعض المؤشرات المالية الحية — القيم المعروضة أدناه من الطلبات التي نجحت فقط.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-e-4 border-e-blue-500">
              <p className="text-sm text-gray-500 font-bold mb-1">إجمالي مدفوعات البوابة (شهري)</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary?.gross_revenue)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-e-4 border-e-amber-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Escrow Cash Holding Pool</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary?.provider_pending_escrow)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-e-4 border-e-teal-500">
              <p className="text-sm text-gray-500 font-bold mb-1">صافي إيراد المنصة (عمولة + VAT)</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary ? (summary.net_revenue ?? summary.commission + summary.vat_on_commission) : null)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-e-4 border-e-purple-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Payout Request Queue</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(payoutQueueTotal)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Core Commission Auditing Engine */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white font-bold">محرك مراجعة العمولات الأساسي (Core Commission Auditing)</div>
              <div className="p-4 overflow-x-auto">
                <DataTable
                  bare
                  dir="ltr"
                  rows={commissions}
                  getRowKey={(c) => String(c._id ?? c.providerName)}
                  columns={[
                    { key: 'provider', header: 'Provider', className: 'font-medium text-gray-900', render: (c) => c.providerName || '—' },
                    { key: 'type', header: 'Type', render: (c) => (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{c.providerType || '—'}</span>
                    ) },
                    { key: 'base', header: 'Base Bill', render: (c) => `${c.baseBill ?? '—'} SAR` },
                    { key: 'comm', header: 'Sys Comm', className: 'text-red-600', render: (c) => `-${c.systemCommission ?? '—'} SAR` },
                    { key: 'vat', header: 'VAT (on Comm)', className: 'text-amber-600', render: (c) => `+${c.vatOnCommission ?? '—'} SAR` },
                    { key: 'earn', header: 'Provider Earning', headerClassName: 'bg-green-50 text-green-700', className: 'font-bold text-green-600 bg-green-50', render: (c) => `${c.providerEarning ?? '—'} SAR` },
                  ]}
                />
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-mono">
                القيم محسوبة ومحفوظة من الخادم لكل عملية؛ لا تُحسب في هذه الصفحة.
              </div>
            </div>

            {/* Payout requests: one queue, one page */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-purple-900 text-white font-bold">طابور دفع المستحقات (Payout Requests)</div>
              <div className="p-4 space-y-3">
                <p className="text-lg font-bold text-purple-700">{money(payoutQueueTotal)}</p>
                <p className="text-sm text-gray-600">الاعتماد والتحويل والرفض في صفحة واحدة لكل دفعة.</p>
                <Link href="/admin/payouts" className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition">فتح دفعات المزودين</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'warehouse' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-teal-900 text-white">
            <h2 className="text-xl font-bold">B2B Warehouse Order Sheet & Quotation Panel</h2>
            <p className="text-teal-200 mt-1">طلبات نواقص الصيدليات القادمة عبر AI Voice / OCR</p>
          </div>

          <div className="p-6">
            {warehouseOrders.map(order => {
              const totalQuotation = order.items.reduce((sum, item) => sum + (item.requested_quantity * item.unitPrice), 0);

              return (
                <div key={order._id} className="border border-gray-300 rounded-xl overflow-hidden mb-8">
                  <div className="bg-gray-100 p-4 border-b border-gray-300 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{order.pharmacy_id || '—'}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${order.status === 'PENDING_ADMIN_REVIEW' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                        {order.status}
                      </span>
                    </div>
                    {order.status === 'PENDING_ADMIN_REVIEW' && canQuote && (
                      <button onClick={() => handleIssueQuotation(order)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded shadow transition">
                        إرسال تسعيرة المشتريات للصيدلية
                      </button>
                    )}
                  </div>

                  <div className="p-0">
                    <DataTable
                      bare
                      dir="ltr"
                      rows={order.items.map((item, idx) => ({ item, idx }))}
                      getRowKey={({ idx }) => String(idx)}
                      columns={[
                        { key: 'name', header: 'Item Name', className: 'font-medium text-gray-800', render: ({ item }) => item.raw_name_string || '—' },
                        { key: 'qty', header: 'Quantity', render: ({ item }) => item.requested_quantity },
                        { key: 'price', header: 'Warehouse Cost Unit Price (SAR)', headerClassName: 'bg-amber-50 text-amber-800', className: 'bg-amber-50', render: ({ item, idx }) => (
                          <input
                            type="number"
                            min={0}
                            disabled={order.status !== 'PENDING_ADMIN_REVIEW'}
                            value={item.unitPrice || ''}
                            onChange={(e) => handleUpdateWarehousePrice(order._id, idx, Number(e.target.value))}
                            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
                            placeholder="0.00"
                          />
                        ) },
                        { key: 'total', header: 'Total', headerClassName: 'bg-slate-50', className: 'font-bold text-slate-800 bg-slate-50', render: ({ item }) => (item.requested_quantity * item.unitPrice).toFixed(2) },
                      ]}
                      footerRow={(
                        <div className="flex items-center justify-between gap-4 bg-slate-900 p-4 text-lg font-bold text-white">
                          <span>total_warehouse_quotation_price:</span>
                          <span className="text-teal-400">{totalQuotation.toFixed(2)} SAR</span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
