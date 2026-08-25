# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/financial-ledger.tsx`
- **Member SHA-256:** `df6e0383dfccdac183f155e196d5c53b32dcf733c4fc114067451c5db1f170d6`
- **Line count:** 341
- **Read range:** `1-341`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `164: <button className={`px-6 py-2 font-bold ${activeTab === 'ledger' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setActiveTab('ledger')}>`
- `167: <button className={`px-6 py-2 font-bold ${activeTab === 'warehouse' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setActiveTab('warehouse')}>`
- `253: <button onClick={() => handleExecutePayout(w.id)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition">`
- `289: <button onClick={() => handleIssueQuotation(order)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded shadow transition">`
### backend_consumers_or_contracts
- `54: const summaryRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance-engine/reports/summary?period=monthly`);`
- `62: const commRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/commissions`);`
- `69: const withRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/withdrawals/pending`);`
- `80: const whRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/extended-operations/procurement/pending`);`
- `113: await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });`
- `136: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/extended-operations/issue-quote/${order.id}`, {`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `24: status: 'PENDING_ADMIN_REVIEW' | 'QUOTATION_ISSUED';`
- `54: const summaryRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance-engine/reports/summary?period=monthly`);`
- `62: const commRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/commissions`);`
- `69: const withRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/withdrawals/pending`);`
- `80: const whRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/extended-operations/procurement/pending`);`
- `113: await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });`
- `136: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/extended-operations/issue-quote/${order.id}`, {`
- `284: <span className={`text-xs font-bold px-2 py-1 rounded mt-2 inline-block ${order.status === 'PENDING_ADMIN_REVIEW' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>`
- `288: {order.status === 'PENDING_ADMIN_REVIEW' && (`
- `314: disabled={order.status !== 'PENDING_ADMIN_REVIEW'}`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `17: status: 'pending' | 'completed';`
- `24: status: 'PENDING_ADMIN_REVIEW' | 'QUOTATION_ISSUED';`
- `29: provider_pending_escrow: number;`
- `35: const [activeTab, setActiveTab] = useState<'ledger' | 'warehouse'>('ledger');`
- `37: const [commissions, setCommissions] = useState<CommissionRow[]>([]);`
- `38: const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);`
- `39: const [warehouseOrders, setWarehouseOrders] = useState<WarehouseOrder[]>([]);`
- `40: const [summary, setSummary] = useState<FinanceSummary | null>(null);`
- `41: const [payoutQueueTotal, setPayoutQueueTotal] = useState<number | null>(null);`
- `42: const [financeUnavailable, setFinanceUnavailable] = useState(false);`
- `44: const [isLoading, setIsLoading] = useState(true);`
### payment_insurance_relevance
- `23: items: { name: string; quantity: number; unitPrice: number }[];`
- `41: const [payoutQueueTotal, setPayoutQueueTotal] = useState<number | null>(null);`
- `74: setPayoutQueueTotal(rows.reduce((sum: number, w: WithdrawalRow) => sum + (Number(w.amount) || 0), 0));`
- `110: const handleExecutePayout = async (id: string) => {`
- `114: alert('تم إرسال أمر الدفع إلى شبكة Moyasar وتحويل الحالة إلى completed وإرسال الإشعار.');`
- `121: const handleUpdateWarehousePrice = (orderId: string, itemIndex: number, price: number) => {`
- `125: newItems[itemIndex].unitPrice = price;`
- `131: const total_warehouse_quotation_price = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);`
- `132: if (total_warehouse_quotation_price <= 0) return alert('يجب تسعير العناصر أولاً');`
- `138: body: JSON.stringify({ pricingItems: order.items, totalPrice: total_warehouse_quotation_price })`
- `141: alert(`تم إرسال تسعيرة المشتريات بقيمة ${total_warehouse_quotation_price} SAR للصيدلية وتغيير الحالة إلى QUOTATION_ISSUED`);`
- `175: {/* Quad financial widget cards — live Finance Engine summary (no placeholders). */}`
### error_empty_loading_retry_cancel
- `17: status: 'pending' | 'completed';`
- `24: status: 'PENDING_ADMIN_REVIEW' | 'QUOTATION_ISSUED';`
- `29: provider_pending_escrow: number;`
- `44: const [isLoading, setIsLoading] = useState(true);`
- `49: setIsLoading(true);`
- `69: const withRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/finance/withdrawals/pending`);`
- `80: const whRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/extended-operations/procurement/pending`);`
- `85: } catch (error) {`
- `86: console.error('Finance fetch error:', error);`
- `88: setIsLoading(false);`
- `116: } catch (e) {`
- `143: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
