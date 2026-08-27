import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

interface CommissionRow {
  id: string;
  providerName: string;
  type: 'doctor' | 'home_care' | 'pharmacy';
  baseBill: number;
}

interface WithdrawalRow {
  id: string;
  providerName: string;
  amount: number;
  bankName: string;
  iban: string;
  status: 'pending' | 'completed';
}

interface WarehouseOrder {
  id: string;
  pharmacyName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  status: 'PENDING_ADMIN_REVIEW' | 'QUOTATION_ISSUED';
}

interface FinanceSummary {
  gross_revenue: number;
  provider_pending_escrow: number;
  commission: number;
  vat_on_commission: number;
}

export default function FinancialLedger() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'warehouse'>('ledger');

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [warehouseOrders, setWarehouseOrders] = useState<WarehouseOrder[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [payoutQueueTotal, setPayoutQueueTotal] = useState<number | null>(null);
  const [financeUnavailable, setFinanceUnavailable] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setIsLoading(true);
        setFinanceUnavailable(false);

        // Live finance summary — never render placeholder KPIs in production.
        const summaryRes = await fetchWithAdminGuard(`/api/admin/finance-engine/reports/summary?period=monthly`);
        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        } else {
          setFinanceUnavailable(true);
        }

        // Fetch Commissions
        const commRes = await fetchWithAdminGuard(`/api/admin/finance/commissions`);
        if (commRes.ok) {
          const data = await commRes.json();
          setCommissions(data.data || []);
        }

        // Fetch Withdrawals
        const withRes = await fetchWithAdminGuard(`/api/admin/finance/withdrawals/pending`);
        if (withRes.ok) {
          const data = await withRes.json();
          const rows = data.data || [];
          setWithdrawals(rows);
          setPayoutQueueTotal(rows.reduce((sum: number, w: WithdrawalRow) => sum + (Number(w.amount) || 0), 0));
        } else {
          setFinanceUnavailable(true);
        }

        // Fetch Warehouse Orders
        const whRes = await fetchWithAdminGuard(`/api/admin/extended-operations/procurement/pending`);
        if (whRes.ok) {
          const data = await whRes.json();
          setWarehouseOrders(data.data || []);
        }
      } catch (error) {
        console.error('Finance fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  const getCommissionRate = (type: string) => {
    if (type === 'doctor') return 0.15;
    if (type === 'home_care') return 0.10;
    if (type === 'pharmacy') return 0.05;
    return 0;
  };

  const calculateNet = (base: number, type: string) => {
    const rate = getCommissionRate(type);
    const systemCommission = base * rate;
    const vatOnCommission = systemCommission * 0.15; // VAT 15% applied strictly to Platform Commission
    const providerEarning = (base - systemCommission) + vatOnCommission;
    return { systemCommission, vatOnCommission, providerEarning };
  };

  const handleExecutePayout = async (id: string) => {
    try {
            await fetchWithAdminGuard(`/api/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });
      alert('تم إرسال أمر الدفع إلى شبكة Moyasar وتحويل الحالة إلى completed وإرسال الإشعار.');
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'completed' } : w));
    } catch (e) {
      alert('خطأ في التنفيذ');
    }
  };

  const handleUpdateWarehousePrice = (orderId: string, itemIndex: number, price: number) => {
    setWarehouseOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const newItems = [...order.items];
      newItems[itemIndex].unitPrice = price;
      return { ...order, items: newItems };
    }));
  };

  const handleIssueQuotation = async (order: WarehouseOrder) => {
    const total_warehouse_quotation_price = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    if (total_warehouse_quotation_price <= 0) return alert('يجب تسعير العناصر أولاً');

    try {
            const res = await fetchWithAdminGuard(`/api/admin/extended-operations/issue-quote/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pricingItems: order.items, totalPrice: total_warehouse_quotation_price })
      });
      // Success state update
      alert(`تم إرسال تسعيرة المشتريات بقيمة ${total_warehouse_quotation_price} SAR للصيدلية وتغيير الحالة إلى QUOTATION_ISSUED`);
      setWarehouseOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'QUOTATION_ISSUED' } : o));
    } catch (e) {
      console.error(e);
      alert('خطأ في إرسال التسعيرة');
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
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Total Out-of-Pocket Balance</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary?.gross_revenue)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-amber-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Escrow Cash Holding Pool</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary?.provider_pending_escrow)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-teal-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Commission Wallet Revenue Ledger</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(summary ? summary.commission + summary.vat_on_commission : null)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
              <p className="text-sm text-gray-500 font-bold mb-1">Payout Request Queue</p>
              <h3 className="text-2xl font-bold text-gray-900">{money(payoutQueueTotal)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Core Commission Auditing Engine */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white font-bold">محرك مراجعة العمولات الأساسي (Core Commission Auditing)</div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm text-left" dir="ltr">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Base Bill</th>
                      <th className="px-4 py-3">Sys Comm</th>
                      <th className="px-4 py-3">VAT (on Comm)</th>
                      <th className="px-4 py-3 bg-green-50 text-green-700">Provider Earning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map(c => {
                      const net = calculateNet(c.baseBill, c.type);
                      return (
                        <tr key={c.id} className="border-b">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.providerName}</td>
                          <td className="px-4 py-3">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{c.type} ({(getCommissionRate(c.type) * 100)}%)</span>
                          </td>
                          <td className="px-4 py-3">{c.baseBill} SAR</td>
                          <td className="px-4 py-3 text-red-600">-{net.systemCommission} SAR</td>
                          <td className="px-4 py-3 text-amber-600">+{net.vatOnCommission.toFixed(2)} SAR</td>
                          <td className="px-4 py-3 font-bold text-green-600 bg-green-50">{net.providerEarning.toFixed(2)} SAR</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-mono">
                Provider Earning = (Base Bill - System Commission) + VAT 15% applied strictly to Platform Commission
              </div>
            </div>

            {/* Withdrawal Approval Queue Workflow */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-purple-900 text-white font-bold">طابور دفع المستحقات (Withdrawal Approval Queue)</div>
              <div className="p-4 space-y-4">
                {withdrawals.map(w => (
                  <div key={w.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                    <div>
                      <h4 className="font-bold text-gray-900">{w.providerName}</h4>
                      <p className="text-sm text-gray-600 font-mono mt-1">{w.bankName} - {w.iban}</p>
                      <p className="text-lg font-bold text-purple-700 mt-2">{w.amount} SAR</p>
                    </div>
                    <div>
                      {w.status === 'pending' ? (
                        <button onClick={() => handleExecutePayout(w.id)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition">
                          Execute Payout
                        </button>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded font-bold">Completed (Moyasar API)</span>
                      )}
                    </div>
                  </div>
                ))}
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
              const totalQuotation = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

              return (
                <div key={order.id} className="border border-gray-300 rounded-xl overflow-hidden mb-8">
                  <div className="bg-gray-100 p-4 border-b border-gray-300 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{order.pharmacyName}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${order.status === 'PENDING_ADMIN_REVIEW' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                        {order.status}
                      </span>
                    </div>
                    {order.status === 'PENDING_ADMIN_REVIEW' && (
                      <button onClick={() => handleIssueQuotation(order)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded shadow transition">
                        إرسال تسعيرة المشتريات للصيدلية
                      </button>
                    )}
                  </div>

                  <div className="p-0">
                    <table className="w-full text-left" dir="ltr">
                      <thead className="bg-gray-50 border-b text-sm text-gray-500 uppercase">
                        <tr>
                          <th className="p-4">Item Name</th>
                          <th className="p-4 w-32">Quantity</th>
                          <th className="p-4 w-64 bg-amber-50 text-amber-800">Warehouse Cost Unit Price (SAR)</th>
                          <th className="p-4 w-32 bg-slate-50">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-4 font-medium text-gray-800">{item.name}</td>
                            <td className="p-4">{item.quantity}</td>
                            <td className="p-4 bg-amber-50">
                              <input
                                type="number"
                                min={0}
                                disabled={order.status !== 'PENDING_ADMIN_REVIEW'}
                                value={item.unitPrice || ''}
                                onChange={(e) => handleUpdateWarehousePrice(order.id, idx, Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-4 font-bold text-slate-800 bg-slate-50">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold text-lg">
                          <td colSpan={3} className="p-4 text-right border-r border-slate-700">total_warehouse_quotation_price:</td>
                          <td className="p-4 text-teal-400">{totalQuotation.toFixed(2)} SAR</td>
                        </tr>
                      </tfoot>
                    </table>
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
