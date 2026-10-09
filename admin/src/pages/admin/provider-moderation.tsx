import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';
import ProviderFullDetail from '@/components/ProviderFullDetail';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GeoPicker } from "../../components/GeoPicker";


interface Provider {
  id: string;
  name: string;
  type: string;
  email?: string;
  status?: string;
  createdAt?: string;
  medicalLicense?: string;
}

interface DeltaMutation {
  id: string; // The delta ID
  providerId: string;
  providerName: string;
  type?: string;
  status?: string;
  createdAt?: string;
  oldData?: { [key: string]: any };
  newData: { [key: string]: any };
}

export default function ProviderModeration() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'deltas'>('onboarding');
  const [pendingProviders, setPendingProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [pendingDeltas, setPendingDeltas] = useState<DeltaMutation[]>([]);
  const [selectedDelta, setSelectedDelta] = useState<DeltaMutation | null>(null);
  const [providerDetail, setProviderDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load the REAL account detail (profile + KYC documents + bank + full
  // onboarding file) when a provider is selected.
  useEffect(() => {
    if (!selectedProvider) { setProviderDetail(null); return; }
    setDetailLoading(true);
    setProviderDetail(null);
    fetchWithAdminGuard(`/api/admin/admin/providers/${selectedProvider.id}`)
      .then(async (res) => { if (res.ok) setProviderDetail(await res.json()); })
      .catch(() => setProviderDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedProvider?.id]);

  // Approve form (replaces the three window.prompt dialogs): reason + commissions + summary + confirm.
  const [approveFor, setApproveFor] = useState<Provider | null>(null);
  const [approveReason, setApproveReason] = useState('');
  const [approveCash, setApproveCash] = useState('');
  const [approveIns, setApproveIns] = useState('');
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [bankBusy, setBankBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [geo, setGeo] = useState<{ region?: string; city?: string; district?: string }>({});

  useEffect(() => {
    const fetchModerationData = async () => {
      try {
        setIsLoading(true);
            // REAL pending provider accounts (provider_accounts, status=pending) with unified GeoPicker filter
        const geoParams = new URLSearchParams();
        if (geo.region) geoParams.set('region', geo.region);
        if (geo.city) geoParams.set('city', geo.city);
        if (geo.district) geoParams.set('district', geo.district);
        const geoQuery = geoParams.toString() ? `&${geoParams.toString()}` : '';
        const providersRes = await fetchWithAdminGuard(`/api/admin/admin/providers?status=pending&limit=100${geoQuery}`);
        if (providersRes.ok) {
          const providersData = await providersRes.json();
          const items = providersData.items || [];
          setPendingProviders(items.map((i: any) => ({
            id: i.id,
            name: i.display_name_ar || i.display_name_en || i.legal_name || i.email || '—',
            type: i.provider_type || i.role || '—',
            email: i.email,
            status: i.status,
            createdAt: i.createdAt,
          })));
        }

        // REAL pending delta mutations (provider_deltas collection — the same
        // pipeline the provider app submits to via POST /provider/settings/delta)
        const deltasRes = await fetchWithAdminGuard(`/api/admin/admin/providers/provider-deltas`, { method: 'GET' });
        if (deltasRes.ok) {
          const deltasData = await deltasRes.json();
          const rows = Array.isArray(deltasData) ? deltasData : (deltasData.data || []);
          setPendingDeltas(rows.map((d: any) => ({
            id: d.id,
            providerId: d.provider_id || d.account_id || '',
            providerName: d.provider_id || d.account_id || '—',
            status: d.status,
            createdAt: d.createdAt,
            newData: d.requested_changes || d.changes || {},
          })));
        }
      } catch (error) {
        console.error('Error fetching moderation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModerationData();
  }, [geo.region, geo.city, geo.district]);

  const openApprove = (provider: Provider) => {
    const defaults: Record<string, number> = { pharmacy: 5, lab: 8, radiology: 10, home_care: 15 };
    const def = defaults[provider.type] ?? 10;
    setApproveReason('');
    setApproveCash(String(def));
    setApproveIns(String(def));
    setApproveError('');
    setApproveFor(provider);
  };

  const submitApprove = async () => {
    if (!approveFor) return;
    const reason = approveReason.trim();
    if (reason.length < 5) { setApproveError('يرجى إدخال سبب اعتماد لا يقل عن 5 أحرف'); return; }
    const cash = Number(approveCash);
    const ins = Number(approveIns);
    if (!Number.isFinite(cash) || !Number.isFinite(ins) || cash < 0 || cash > 100 || ins < 0 || ins > 100) {
      setApproveError('نسبة العمولة يجب أن تكون بين 0 و100');
      return;
    }
    setApproveBusy(true);
    setApproveError('');
    try {
      const res = await fetchWithAdminGuard(`/api/admin/admin/providers/${approveFor.id}/approve`, { method: 'POST', body: JSON.stringify({ reason, commission_cash: cash, commission_insurance: ins }) });
      if (res.ok) {
        const approvedId = approveFor.id;
        setPendingProviders(prev => prev.filter(p => p.id !== approvedId));
        setSelectedProvider(null);
        setApproveFor(null);
      } else {
        const err = await res.json().catch(() => null);
        setApproveError('فشل الاعتماد: ' + (err?.message || res.status));
      }
    } catch (e) {
      console.error(e);
      setApproveError('خطأ في الاعتماد');
    } finally {
      setApproveBusy(false);
    }
  };

  // Payout bank account approval: POST /admin/providers/:id/approve-bank (404 no_pending_bank_account when nothing is pending).
  const handleApproveBank = async (id: string) => {
    setBankBusy(true);
    try {
      const res = await fetchWithAdminGuard(`/api/admin/admin/providers/${id}/approve-bank`, { method: 'POST' });
      if (res.ok) {
        setProviderDetail((prev: { bank?: Record<string, unknown> } | null) => (prev ? { ...prev, bank: { ...(prev.bank || {}), review_status: 'approved' } } : prev));
      } else {
        const err = await res.json().catch(() => null);
        alert('فشل اعتماد الحساب البنكي: ' + (err?.message || res.status));
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في اعتماد الحساب البنكي');
    } finally {
      setBankBusy(false);
    }
  };

  // P6.x-8: reactivate a suspended provider (reason audited server-side).
  const handleReactivate = async (id: string) => {
    const reason = window.prompt('سبب إعادة التفعيل (يُحفظ في سجل التدقيق — 5 أحرف على الأقل):', '');
    if (!reason || reason.trim().length < 5) return;
    try {
      const res = await fetchWithAdminGuard(`/api/admin/admin/providers/${id}/reactivate`, {
        method: 'POST', body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('تمت إعادة التفعيل — سيحتاج المزود لتسجيل الدخول من جديد.');
    } catch (err: any) {
      alert('فشل التفعيل: ' + (err?.message || 'خطأ'));
    }
  };

  // Reject (final: the provider's images are deleted server-side) and request-changes (the provider can fix and resubmit).
  // Both use the routes POST /admin/providers/:id/reject and :id/request-changes; the body field differs (reason / note).
  const handleDecision = async (id: string, kind: 'reject' | 'request-changes') => {
    const reject = kind === 'reject';
    const reason = window.prompt(
      reject
        ? 'سبب رفض المزود (نهائي — تُحذف صور الوثائق، ويُحفظ السبب في سجل التدقيق، 5 أحرف على الأقل):'
        : 'ما المطلوب تعديله؟ (يصل للمزود ويُحفظ في سجل التدقيق — 5 أحرف على الأقل):',
      '',
    );
    if (reason === null) return;
    if (reason.trim().length < 5) { alert('يرجى إدخال سبب لا يقل عن 5 أحرف'); return; }
    try {
      const res = await fetchWithAdminGuard(`/api/admin/admin/providers/${id}/${kind}`, {
        method: 'POST',
        body: JSON.stringify(reject ? { reason: reason.trim() } : { note: reason.trim() }),
      });
      if (res.ok) {
        alert(reject ? 'تم رفض المزود.' : 'تم إرجاع الطلب للمزود لإجراء التعديلات.');
        setPendingProviders(prev => prev.filter(p => p.id !== id));
        setSelectedProvider(null);
      } else {
        const err = await res.json().catch(() => null);
        alert((reject ? 'فشل الرفض: ' : 'فشل طلب التعديلات: ') + (err?.message || res.status));
      }
    } catch (e) {
      console.error(e);
      alert(reject ? 'خطأ في الرفض' : 'خطأ في طلب التعديلات');
    }
  };

  const handleCommitDelta = async (id: string) => {
    const reason = window.prompt('سبب اعتماد التعديلات (يُحفظ في سجل التدقيق — 5 أحرف على الأقل):', '');
    if (reason === null) return;
    if (reason.trim().length < 5) { alert('يرجى إدخال سبب لا يقل عن 5 أحرف'); return; }
    try {
        const res = await fetchWithAdminGuard(`/api/admin/admin/providers/provider-deltas/${id}/approve`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
      if (res.ok) {
        alert('تم اعتماد التعديلات وتطبيقها على ملف المزود — ستظهر الآن لتطبيق المرضى.');
        setPendingDeltas(prev => prev.filter(d => d.id !== id));
        setSelectedDelta(null);
      } else {
        const err = await res.json().catch(() => null);
        alert('فشل اعتماد التعديلات: ' + (err?.message || res.status));
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في ترحيل التعديلات');
    }
  };

  const handleRejectDelta = async (id: string) => {
    const reason = window.prompt('سبب رفض التعديلات (يُحفظ في سجل التدقيق — 5 أحرف على الأقل):', '');
    if (reason === null) return;
    if (reason.trim().length < 5) { alert('يرجى إدخال سبب رفض لا يقل عن 5 أحرف'); return; }
    try {
        const res = await fetchWithAdminGuard(`/api/admin/admin/providers/provider-deltas/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
      if (res.ok) {
        alert('تم رفض التعديلات — لن تُطبق على ملف المزود.');
        setPendingDeltas(prev => prev.filter(d => d.id !== id));
        setSelectedDelta(null);
      } else {
        const err = await res.json().catch(() => null);
        alert('فشل رفض التعديلات: ' + (err?.message || res.status));
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في رفض التعديلات');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة المزودين (Provider Moderation)</h1>
          <p className="text-gray-500 mt-1">مركز التحقق من الوثائق ومعاينة التعديلات الحيوية</p>
        </div>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button className={`px-6 py-2 font-bold ${activeTab === 'onboarding' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => { setActiveTab('onboarding'); setSelectedDelta(null); }}>
            توثيق التسجيل (Onboarding)
          </button>
          <button className={`px-6 py-2 font-bold ${activeTab === 'deltas' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => { setActiveTab('deltas'); setSelectedProvider(null); }}>
            تعديلات الحسابات (Delta Mutations)
          </button>
        </div>
      </div>

      <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-2">التصفية الجغرافية الموحدة</label>
        <GeoPicker value={geo} onChange={setGeo} />
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* LEFT COLUMN: Data Grid List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-slate-700">
            {activeTab === 'onboarding' ? 'الحسابات المعلقة (بانتظار الاعتماد)' : 'تعديلات بانتظار المراجعة (Pending Deltas)'}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'onboarding' && pendingProviders.map(p => (
              <div key={p.id} onClick={() => setSelectedProvider(p)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedProvider?.id === p.id ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-200 hover:border-teal-300'}`}>
                <h3 className="font-bold text-gray-800">{p.name}</h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded mt-2 inline-block uppercase tracking-wider">{p.type}</span>
              </div>
            ))}
            {activeTab === 'deltas' && pendingDeltas.map(d => (
              <div key={d.id} onClick={() => setSelectedDelta(d)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedDelta?.id === d.id ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-200 hover:border-amber-300'}`}>
                <h3 className="font-bold text-gray-800">{d.providerName}</h3>
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded mt-2 inline-block font-bold">طلب تعديل ملف المزود</span>
              </div>
            ))}
            {(activeTab === 'onboarding' && pendingProviders.length === 0) && <p className="text-center text-gray-500 mt-10">لا توجد حسابات معلقة</p>}
            {(activeTab === 'deltas' && pendingDeltas.length === 0) && <p className="text-center text-gray-500 mt-10">لا توجد تعديلات معلقة</p>}
          </div>
        </div>

        {/* RIGHT COLUMN: Inspector Panel */}
        <div className="w-2/3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
          {activeTab === 'onboarding' && selectedProvider ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-slate-900 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  Immutable Verification Inspector Panel
                </h2>
                <span className="bg-slate-700 px-3 py-1 rounded text-sm">{selectedProvider.name}</span>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                {detailLoading && <p className="text-center text-gray-400 mt-10">جاري تحميل ملف المزود…</p>}
                {!detailLoading && !providerDetail && (
                  <p className="text-center text-gray-500 mt-10">تعذر تحميل تفاصيل المزود — تحقق من الصلاحيات والاتصال.</p>
                )}
                {!detailLoading && providerDetail && (
                  <ProviderFullDetail detail={providerDetail} accountId={selectedProvider.id} />
                )}
              </div>

              <div className="p-6 border-t border-gray-200 bg-slate-50 flex flex-wrap gap-4">
                <button onClick={() => openApprove(selectedProvider)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow transition text-lg">
                  Approve Provider (اعتماد)
                </button>
                <button onClick={() => handleDecision(selectedProvider.id, 'request-changes')} className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-3 rounded-lg shadow-sm border border-amber-200 transition text-lg">
                  Request changes (طلب تعديلات)
                </button>
                <button onClick={() => handleDecision(selectedProvider.id, 'reject')} className="flex-1 bg-white hover:bg-red-50 text-red-700 font-bold py-3 rounded-lg shadow-sm border border-red-300 transition text-lg">
                  Reject (رفض)
                </button>
                <button onClick={() => handleReactivate(selectedProvider.id)} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-bold py-3 rounded-lg shadow-sm border border-green-200 transition text-lg">
                  Reactivate (إعادة تفعيل)
                </button>
                {['pending', 'under_review'].includes(String(providerDetail?.bank?.review_status)) && (
                  <button onClick={() => handleApproveBank(selectedProvider.id)} disabled={bankBusy} className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-lg shadow-sm border border-slate-300 transition text-lg disabled:opacity-50">
                    Approve bank account (اعتماد الحساب البنكي)
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'deltas' && selectedDelta ? (
            <div className="flex flex-col h-full bg-slate-50">
              <div className="p-6 border-b border-gray-200 bg-amber-100 text-amber-900">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  PENDING PROFILES MUTATIONS INSPECTOR
                </h2>
                <p className="text-sm mt-1 font-medium">{selectedDelta.providerName} - التعديلات لم تنشر بعد</p>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="w-full max-w-4xl mx-auto shadow-xl rounded-xl overflow-hidden bg-white border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-700 mb-2 text-center border-b pb-3">التعديلات المطلوبة (Requested Changes)</h3>
                    <p className="text-xs text-gray-400 text-center mb-4">عند الاعتماد تُطبق هذه القيم على ملف المزود مباشرة وتظهر لتطبيق المرضى</p>
                    {Object.keys(selectedDelta.newData || {}).length === 0 && (
                      <p className="text-center text-gray-400 py-6">لا توجد تفاصيل تغييرات مسجلة في هذا الطلب.</p>
                    )}
                    <div className="space-y-2">
                      {Object.entries(selectedDelta.newData || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start gap-4 p-3 bg-amber-50 rounded border border-amber-200">
                          <span className="text-gray-600 font-mono text-sm">{key}</span>
                          <span className="font-bold text-slate-800 text-sm text-left break-all" dir="ltr">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedDelta.createdAt && (
                      <p className="text-xs text-gray-400 mt-4 text-center">أُرسل بتاريخ: {String(selectedDelta.createdAt).slice(0, 19).replace('T', ' ')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-white flex gap-4">
                <button onClick={() => handleCommitDelta(selectedDelta.id)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg shadow transition text-lg">
                  تأكيد واعتماد التعديلات
                </button>
                <button onClick={() => handleRejectDelta(selectedDelta.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg shadow-sm border border-gray-300 transition text-lg">
                  رفض التعديلات
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg font-medium">
              يرجى اختيار عنصر من القائمة الجانبية للمعاينة
            </div>
          )}
        </div>
      </div>

      {/* Approve form */}
      <ConfirmDialog
        open={!!approveFor}
        title="اعتماد المزود"
        confirmLabel="تأكيد الاعتماد"
        busy={approveBusy}
        onConfirm={submitApprove}
        onCancel={() => setApproveFor(null)}
      >
        {approveFor && (
          <>
            <dl className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">المزود</dt><dd className="font-bold">{approveFor.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">النوع</dt><dd className="font-bold uppercase">{approveFor.type}</dd></div>
              {approveFor.email && <div className="flex justify-between gap-3"><dt className="text-slate-500">البريد</dt><dd className="font-bold" dir="ltr">{approveFor.email}</dd></div>}
            </dl>
            <p className="text-xs text-slate-500">عند الاعتماد يصبح الحساب فعالاً ويظهر في دليل المرضى، وتُعتمد الوثائق والحساب البنكي المعلّقة.</p>
            <label className="block text-sm font-bold">سبب الاعتماد (يُحفظ في سجل التدقيق — 5 أحرف على الأقل)
              <textarea value={approveReason} onChange={(e) => setApproveReason(e.target.value)} className="mt-1 w-full border border-gray-300 rounded p-2 h-20 font-normal" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold">عمولة الكاش %
                <input type="number" min="0" max="100" value={approveCash} onChange={(e) => setApproveCash(e.target.value)} className="mt-1 w-full border border-gray-300 rounded p-2 font-normal" />
              </label>
              <label className="block text-sm font-bold">عمولة التأمين %
                <input type="number" min="0" max="100" value={approveIns} onChange={(e) => setApproveIns(e.target.value)} className="mt-1 w-full border border-gray-300 rounded p-2 font-normal" />
              </label>
            </div>
            {approveError && <p role="alert" className="rounded bg-rose-50 p-2 text-sm text-rose-700">{approveError}</p>}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
