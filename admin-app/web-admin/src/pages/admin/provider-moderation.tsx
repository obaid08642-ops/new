import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard, getAdminApiBase } from '@/utils/api';

interface Provider {
  id: string;
  name: string;
  type: 'doctor' | 'pharmacy' | 'home_care';
  nationalId: string;
  commercialCr: string;
  mohLicense: string;
  medicalLicense: string;
}

interface DeltaMutation {
  id: string; // The delta ID
  providerId: string;
  providerName: string;
  type: 'doctor' | 'pharmacy';
  oldData: { price: number; radius: number; [key: string]: any };
  newData: { price: number; radius: number; [key: string]: any };
}

export default function ProviderModeration() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'deltas'>('onboarding');
  const [pendingProviders, setPendingProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  const [pendingDeltas, setPendingDeltas] = useState<DeltaMutation[]>([]);
  const [selectedDelta, setSelectedDelta] = useState<DeltaMutation | null>(null);

  const [suspendReason, setSuspendReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModerationData = async () => {
      try {
        setIsLoading(true);
        const API_BASE = getAdminApiBase();
        // Fetch pending onboarding providers
        const providersRes = await fetchWithAdminGuard(`${API_BASE}/providers/pending`);
        if (providersRes.ok) {
          const providersData = await providersRes.json();
          setPendingProviders(providersData.data || []);
        }

        // Fetch pending delta mutations
        const deltasRes = await fetchWithAdminGuard(`${API_BASE}/admin/extended-operations/pending-deltas`);
        if (deltasRes.ok) {
          const deltasData = await deltasRes.json();
          setPendingDeltas(deltasData.data || []);
        }
      } catch (error) {
        console.error('Error fetching moderation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModerationData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const API_BASE = getAdminApiBase();
      const res = await fetchWithAdminGuard(`${API_BASE}/providers/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        alert('تم الاعتماد بنجاح. تمت إضافة الأوزان لمحرك البحث، إرسال إيميل الترحيب، وتسجيل الحدث.');
        setPendingProviders(prev => prev.filter(p => p.id !== id));
        setSelectedProvider(null);
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الاعتماد');
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason) return alert('يرجى إدخال سبب الإيقاف');
    try {
      const API_BASE = getAdminApiBase();
      const res = await fetchWithAdminGuard(`${API_BASE}/providers/${selectedProvider?.id}/suspend`, {
        method: 'POST', 
        body: JSON.stringify({ reason: suspendReason }) 
      });
      if (res.ok) {
        alert('تم الإيقاف بنجاح. تم قطع جلسات Socket النشطة، وإخفاء السجل من محرك البحث، وإرسال تنبيه عزل الحساب.');
        setPendingProviders(prev => prev.filter(p => p.id !== selectedProvider?.id));
        setSelectedProvider(null);
        setIsModalOpen(false);
        setSuspendReason('');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإيقاف');
    }
  };

  const handleCommitDelta = async (id: string) => {
    try {
      const API_BASE = getAdminApiBase();
      const res = await fetchWithAdminGuard(`${API_BASE}/admin/extended-operations/commit-delta/${id}`, { method: 'PATCH' });
      if (res.ok) {
        alert('تم ترحيل واعتماد التعديلات للنظام الحي بنجاح.');
        setPendingDeltas(prev => prev.filter(d => d.id !== id));
        setSelectedDelta(null);
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في ترحيل التعديلات');
    }
  };

  const handleRejectDelta = async (id: string) => {
    try {
      const API_BASE = getAdminApiBase();
      const res = await fetchWithAdminGuard(`${API_BASE}/admin/extended-operations/reject-delta/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('تم رفض التعديلات وحفظ القرار خادمياً.');
      setPendingDeltas(prev => prev.filter(d => d.id !== id));
      setSelectedDelta(null);
    } catch (e) {
      console.error(e);
      alert('تعذر حفظ رفض التعديلات.');
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

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* LEFT COLUMN: Data Grid List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-slate-700">
            {activeTab === 'onboarding' ? 'الحسابات المعلقة (verified: false)' : 'تعديلات بانتظار المراجعة (Pending Deltas)'}
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
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded mt-2 inline-block font-bold">طلب تعديل أسعار/نطاق</span>
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
              
              <div className="flex-1 p-8 grid grid-cols-2 gap-8 overflow-y-auto">
                {/* S3 Certs Previews */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">الهوية الوطنية (National ID)</label>
                  <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center font-mono text-sm text-gray-400">
                    {selectedProvider.nationalId}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">السجل التجاري (Commercial CR)</label>
                  <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center font-mono text-sm text-gray-400">
                    {selectedProvider.commercialCr}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">ترخيص وزارة الصحة (MOH License)</label>
                  <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center font-mono text-sm text-gray-400">
                    {selectedProvider.mohLicense}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">الترخيص الطبي (Medical License)</label>
                  <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center font-mono text-sm text-gray-400">
                    {selectedProvider.medicalLicense}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-slate-50 flex gap-4">
                <button onClick={() => handleApprove(selectedProvider.id)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow transition text-lg">
                  Approve Provider (اعتماد)
                </button>
                <button onClick={() => setIsModalOpen(true)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 rounded-lg shadow-sm border border-red-200 transition text-lg">
                  Suspend Provider (إيقاف)
                </button>
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

              <div className="flex-1 flex items-center justify-center p-8">
                {/* Split Comparison Grid View */}
                <div className="flex items-stretch w-full max-w-4xl shadow-xl rounded-xl overflow-hidden bg-white border border-gray-200">
                  
                  {/* Left Card: Old Profile */}
                  <div className="flex-1 p-6 bg-slate-50 border-l border-gray-200">
                    <h3 className="text-lg font-bold text-gray-500 mb-6 text-center border-b pb-2">البيانات الحالية (Old Profile)</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white rounded border border-gray-100">
                        <span className="text-gray-500">سعر الاستشارة (Price)</span>
                        <span className="font-bold text-slate-800">{selectedDelta.oldData.price} SAR</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border border-gray-100">
                        <span className="text-gray-500">النطاق الجغرافي (Radius)</span>
                        <span className="font-bold text-slate-800">{selectedDelta.oldData.radius} km</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Vector: Comparison Arrows */}
                  <div className="w-20 bg-slate-100 flex flex-col items-center justify-center gap-12 border-l border-r border-gray-200">
                    <div className="text-gray-400">──►</div>
                    <div className="text-gray-400">──►</div>
                  </div>

                  {/* Right Card: Proposed Profile */}
                  <div className="flex-1 p-6 bg-amber-50">
                    <h3 className="text-lg font-bold text-amber-800 mb-6 text-center border-b border-amber-200 pb-2">التعديلات المقترحة (Proposed)</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white rounded border border-amber-200">
                        <span className="text-gray-500">سعر الاستشارة (Price)</span>
                        <span className={`font-bold ${selectedDelta.newData.price !== selectedDelta.oldData.price ? 'bg-yellow-200 text-yellow-900 px-2 rounded' : 'text-slate-800'}`}>
                          {selectedDelta.newData.price} SAR
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border border-amber-200">
                        <span className="text-gray-500">النطاق الجغرافي (Radius)</span>
                        <span className={`font-bold ${selectedDelta.newData.radius !== selectedDelta.oldData.radius ? 'bg-yellow-200 text-yellow-900 px-2 rounded' : 'text-slate-800'}`}>
                          {selectedDelta.newData.radius} km
                        </span>
                      </div>
                    </div>
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

      {/* Suspend Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
            <h3 className="text-xl font-bold text-red-600 mb-4">تأكيد إيقاف المزود</h3>
            <p className="text-sm text-gray-600 mb-4">هذا الإجراء سيقوم بقطع جلسات الـ Socket وإخفاء المزود فوراً من البحث.</p>
            <textarea 
              className="w-full border border-gray-300 rounded p-3 mb-4 h-24"
              placeholder="الرجاء إدخال سبب الإيقاف أو أكواد الرفض (Reason Codes)..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleSuspend} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">تأكيد الإيقاف الحرج</button>
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
