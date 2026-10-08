import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

export default function ConfigPortal() {
  const [activeTab, setActiveTab] = useState<'sla' | 'maintenance' | 'pricing' | 'apps' | 'rxconsult'>('sla');

  // SLA State
  const [consultationDuration, setConsultationDuration] = useState(15);
  const [callRingingDuration, setCallRingingDuration] = useState(45);
  const [jwtExpiry, setJwtExpiry] = useState(24);

  // P6.x-13: per-app force-update versions + maintenance flags.
  const APPS = ['patient', 'provider', 'driver', 'pharmacy', 'web'];
  const [appVersions, setAppVersions] = useState<Record<string, { min_version?: string; latest_version?: string; maintenance?: boolean; message_ar?: string; message_en?: string }>>({});
  const [appsMsg, setAppsMsg] = useState('');

  const loadAppVersions = async () => {
    try {
      const res = await fetchWithAdminGuard('/api/admin/admin/config/app-versions');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.apps && typeof data.apps === 'object') setAppVersions(data.apps);
    } catch { /* optional */ }
  };

  const setApp = (app: string, patch: Record<string, unknown>) => {
    setAppVersions((p) => ({ ...p, [app]: { ...(p[app] || {}), ...patch } }));
  };

  // D-10 (owner decision 10): which specialty "استشر طبيب" opens for a prescription-only item, per category.
  type RxConsult = { map: Record<string, string>; default: string | null; categories: { key: string; count: number }[]; specialties: { slug: string; name_ar: string }[] };
  const [rxConsult, setRxConsult] = useState<RxConsult | null>(null);
  const [rxConsultMsg, setRxConsultMsg] = useState('');
  const loadRxConsult = async () => {
    try {
      const res = await fetchWithAdminGuard('/api/admin/admin/pharmacy/rx-consult-specialties');
      if (res.ok) setRxConsult(await res.json());
    } catch { /* optional */ }
  };
  const saveRxConsult = async () => {
    if (!rxConsult) return;
    setRxConsultMsg('');
    try {
      const res = await fetchWithAdminGuard('/api/admin/admin/pharmacy/rx-consult-specialties', { method: 'PUT', body: JSON.stringify({ map: rxConsult.map, default: rxConsult.default }) });
      setRxConsultMsg(res.ok ? 'تم حفظ ربط التخصصات' : 'فشل الحفظ');
    } catch { setRxConsultMsg('فشل الحفظ'); }
  };

  const saveAppVersions = async () => {
    setAppsMsg('');
    try {
      const res = await fetchWithAdminGuard('/api/admin/admin/config/app-versions', { method: 'PUT', body: JSON.stringify({ apps: appVersions }) });
      setAppsMsg(res.ok ? 'تم حفظ إصدارات التطبيقات' : 'فشل الحفظ');
    } catch { setAppsMsg('فشل الحفظ'); }
  };
  // P6.x-14: platform pricing (surge + fee defaults, persisted server-side).
  const [surgeStart, setSurgeStart] = useState(18);
  const [surgeEnd, setSurgeEnd] = useState(22);
  const [surgeMult, setSurgeMult] = useState(1.1);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [pricingMsg, setPricingMsg] = useState('');

  const loadPricing = async () => {
    try {
      const res = await fetchWithAdminGuard('/api/admin/business-rules/config/pricing');
      if (!res.ok) return;
      const p = await res.json();
      if (p?.surge) {
        if (Number.isFinite(p.surge.startHour)) setSurgeStart(p.surge.startHour);
        if (Number.isFinite(p.surge.endHour)) setSurgeEnd(p.surge.endHour);
        if (Number.isFinite(p.surge.multiplier)) setSurgeMult(p.surge.multiplier);
      }
      if (p?.fees) {
        if (Number.isFinite(p.fees.delivery_fee)) setDeliveryFee(p.fees.delivery_fee);
        if (Number.isFinite(p.fees.service_fee)) setServiceFee(p.fees.service_fee);
      }
    } catch { /* pricing optional */ }
  };

  const savePricing = async () => {
    setPricingMsg('');
    try {
      const s = await fetchWithAdminGuard('/api/admin/business-rules/config/surge', {
        method: 'POST', body: JSON.stringify({ startHour: surgeStart, endHour: surgeEnd, multiplier: surgeMult }),
      });
      const f = await fetchWithAdminGuard('/api/admin/business-rules/config/fees', {
        method: 'POST', body: JSON.stringify({ delivery_fee: deliveryFee, service_fee: serviceFee }),
      });
      setPricingMsg(s.ok && f.ok ? 'تم حفظ التسعير' : 'فشل الحفظ — تحقق من القيم');
    } catch { setPricingMsg('فشل الحفظ'); }
  };
  const [killSwitchChecked1, setKillSwitchChecked1] = useState(false);
  const [killSwitchChecked2, setKillSwitchChecked2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'online' | 'maintenance'>('online');
  // Platform cash-on-delivery policy: pharmacies may prepare COD orders only while it is active.
  const [codActive, setCodActive] = useState<boolean | null>(null);
  const [codSaving, setCodSaving] = useState(false);
  useEffect(() => {
    fetchWithAdminGuard(`/api/admin/admin/pharmacy/fulfillment-policies`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setCodActive(Boolean((rows || []).find((p: any) => p.id === 'platform-cod')?.active)))
      .catch(() => setCodActive(null));
  }, []);
  const toggleCod = async () => {
    if (codActive === null) return;
    setCodSaving(true);
    try {
      const r = await fetchWithAdminGuard(`/api/admin/admin/pharmacy/fulfillment-policies/cod`, { method: 'PUT', body: JSON.stringify({ active: !codActive }) });
      if (r.ok) setCodActive(!codActive); else alert('تعذر حفظ سياسة الدفع عند الاستلام');
    } finally { setCodSaving(false); }
  };

  useEffect(() => {
    const fetchSLA = async () => {
      try {
                const res = await fetchWithAdminGuard(`/api/admin/admin/config/sla`);
        if (res.ok) {
          const data = await res.json();
          if (data.consultationDuration) setConsultationDuration(data.consultationDuration);
          if (data.callRingingDuration) setCallRingingDuration(data.callRingingDuration);
          if (data.jwtExpiry) setJwtExpiry(data.jwtExpiry);
          if (data.systemStatus) setSystemStatus(data.systemStatus);
        }
      } catch (error) {
        console.error('Failed to fetch initial SLA config', error);
      }
    };
    fetchSLA();
  }, []);

  const handleUpdateSLA = async () => {
    setIsSubmitting(true);
    try {
      // Validations based on directive limits
      if (consultationDuration < 5 || consultationDuration > 120) {
        alert('Consultation duration must be between 5m and 120m');
        setIsSubmitting(false);
        return;
      }
      if (callRingingDuration < 15 || callRingingDuration > 120) {
        alert('Call ringing duration must be between 15s and 120s');
        setIsSubmitting(false);
        return;
      }

            const slaReason = window.prompt('سبب تعديل SLA (يُحفظ في سجل التدقيق — 5 أحرف على الأقل):', '');
            if (slaReason === null) { setIsSubmitting(false); return; }
            if (slaReason.trim().length < 5) { alert('يرجى إدخال سبب لا يقل عن 5 أحرف'); setIsSubmitting(false); return; }
            await fetchWithAdminGuard(`/api/admin/admin/config/sla`, {
        method: 'PUT',
        body: JSON.stringify({ consultationDuration, callRingingDuration, jwtExpiry, reason: slaReason.trim() })
      });
      alert('SLA variables globally overridden successfully.');
    } catch (error) {
      console.error(error);
      alert('Error updating SLA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerEmergencyKillSwitch = async (forceMaintenanceState: boolean) => {
    if (forceMaintenanceState && (!killSwitchChecked1 || !killSwitchChecked2)) {
      alert('Must acknowledge both locks before triggering maintenance.');
      return;
    }

    setIsSubmitting(true);
    try {
            const res = await fetchWithAdminGuard(`/api/admin/admin/governance/trigger-emergency-maintenance`, {
        method: 'PUT',
        body: JSON.stringify({
          forceMaintenanceState,
          reason: forceMaintenanceState ? 'emergency-maintenance-enabled-by-admin' : 'emergency-maintenance-disabled-by-admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setSystemStatus(forceMaintenanceState ? 'maintenance' : 'online');
        if (!forceMaintenanceState) {
          setKillSwitchChecked1(false);
          setKillSwitchChecked2(false);
        }
      } else {
        alert('Failed to execute command.');
      }
    } catch (error) {
      console.error(error);
      alert('Emergency Maintenance Trigger Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">بوابة الإعدادات والنظام المركزية</h1>
        <div className={`px-4 py-2 rounded-full font-bold ${systemStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          حالة النظام: {systemStatus === 'online' ? 'متصل (Online)' : 'صيانة طارئة (Maintenance)'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'sla' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('sla')}
        >
          تعديلات الـ SLA
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg flex items-center gap-2 ${activeTab === 'maintenance' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          مفتاح الإيقاف الطارئ
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'pricing' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
          onClick={() => { setActiveTab('pricing'); void loadPricing(); }}
        >
          التسعير والذروة
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'apps' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
          onClick={() => { setActiveTab('apps'); void loadAppVersions(); }}
        >
          إصدارات التطبيقات
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'rxconsult' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
          onClick={() => { setActiveTab('rxconsult'); void loadRxConsult(); }}
        >
          استشر طبيب (أدوية الوصفة)
        </button>
      </div>

      {/* Content */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
        {activeTab === 'sla' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">تعديلات الـ SLA المباشرة (Global System Variables)</h2>
            <p className="text-gray-500 text-sm">التعديلات هنا تطبق فورياً على جميع الأطراف دون الحاجة لإعادة رفع التطبيقات.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">مدة الاستشارة الطبية (دقائق)</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input type="number" min={5} max={120} value={consultationDuration} onChange={(e) => setConsultationDuration(Number(e.target.value))} className="border rounded px-4 py-2 w-full text-left" dir="ltr" />
                  <span className="text-gray-500 w-32">min: 5, max: 120</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-gray-700">مدة رنين الاتصال (ثواني)</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input type="number" min={15} max={120} value={callRingingDuration} onChange={(e) => setCallRingingDuration(Number(e.target.value))} className="border rounded px-4 py-2 w-full text-left" dir="ltr" />
                  <span className="text-gray-500 w-32">min: 15, max: 120</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-gray-700">نطاق صلاحية جلسات المستخدمين JWT (ساعات)</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input type="number" min={1} max={72} value={jwtExpiry} onChange={(e) => setJwtExpiry(Number(e.target.value))} className="border rounded px-4 py-2 w-full text-left" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">الدفع عند الاستلام لطلبات الصيدليات</div>
                <div className="text-gray-500 text-sm">عند الإيقاف لا تستطيع الصيدليات تجهيز الطلبات النقدية حتى يُعاد التفعيل.</div>
              </div>
              <button disabled={codActive === null || codSaving} onClick={toggleCod}
                className={`px-5 py-2 rounded-lg font-bold text-white disabled:opacity-50 ${codActive ? 'bg-teal-600' : 'bg-gray-400'}`}>
                {codActive === null ? '…' : codActive ? 'مُفعّل' : 'موقوف'}
              </button>
            </div>

            <div className="pt-6">
              <button disabled={isSubmitting} onClick={handleUpdateSLA} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-8 rounded-lg shadow disabled:opacity-50 transition">
                حفظ التعديلات (Override Globally)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-red-700 mb-2 flex items-center gap-2">
                 THE HIGH-PRIORITY SYSTEM MAINTENANCE KILL-SWITCH
              </h2>
              <p className="text-red-600 font-medium mb-4">
                تفعيل هذا المفتاح سيضخ `FORCE_SYSTEM_MAINTENANCE: true` في الـ Redis Core Cache Cluster فوراً.
                سيقوم باعتراض الـ API Gateway ويفصل جميع المستخدمين (503 Service Unavailable) ويعرض شاشة التحديث الجذري الطارئ.
              </p>

              {systemStatus === 'online' ? (
                <div className="space-y-4 bg-white p-6 rounded border border-red-100">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="lock1" checked={killSwitchChecked1} onChange={(e) => setKillSwitchChecked1(e.target.checked)} className="mt-1 w-5 h-5 text-red-600 rounded" />
                    <label htmlFor="lock1" className="text-gray-800 font-medium cursor-pointer">
                      أقر بأنني على علم تام بأن هذا الإجراء سيوقف كافة العمليات الطبية والتجارية الحية.
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="lock2" checked={killSwitchChecked2} onChange={(e) => setKillSwitchChecked2(e.target.checked)} className="mt-1 w-5 h-5 text-red-600 rounded" />
                    <label htmlFor="lock2" className="text-gray-800 font-medium cursor-pointer">
                      تأكيد مستوى الأمان المزدوج: الإقفال وبدء وضع الصيانة.
                    </label>
                  </div>

                  <button
                    disabled
                    title="مفتاح الصيانة غير مفعّل خادمياً: يتطلب Redis dispatch + اعتماد ثنائي + تحقق استرداد"
                    className="w-full mt-4 bg-slate-300 text-slate-500 font-bold py-4 rounded-lg uppercase tracking-widest text-lg cursor-not-allowed"
                  >
                    Trigger System Kill-Switch (معطّل — يتطلب إعداد الخادم)
                  </button>
                  <p className="text-xs text-slate-500">زر الصيانة الطارئة معطّل عمداً: الخادم يرفض أي حالة صيانة شاملة بلا Redis dispatch وتدقيق غير قابل للتغيير. لا يُفعَّل إلا بعد تنفيذ ذلك خادمياً.</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded border border-green-200 text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">النظام حالياً في وضع الإيقاف الطارئ.</h3>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleTriggerEmergencyKillSwitch(false)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50 transition text-lg"
                  >
                    إلغاء وضع الصيانة (Restore Systems)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-bold mb-4">قواعد الذروة (Surge) والرسوم الافتراضية</h2>
              <p className="text-sm text-gray-500 mb-4">تُحفظ في إعدادات المنصة وتبقى بعد إعادة التشغيل.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label className="text-sm font-medium">بداية الذروة (ساعة)
                  <input type="number" min={0} max={23} value={surgeStart} onChange={(e) => setSurgeStart(Number(e.target.value))} className="mt-1 w-full border rounded p-2" />
                </label>
                <label className="text-sm font-medium">نهاية الذروة (ساعة)
                  <input type="number" min={0} max={23} value={surgeEnd} onChange={(e) => setSurgeEnd(Number(e.target.value))} className="mt-1 w-full border rounded p-2" />
                </label>
                <label className="text-sm font-medium">معامل الذروة (1-5)
                  <input type="number" min={1} max={5} step={0.1} value={surgeMult} onChange={(e) => setSurgeMult(Number(e.target.value))} className="mt-1 w-full border rounded p-2" />
                </label>
                <label className="text-sm font-medium">رسوم التوصيل الافتراضية
                  <input type="number" min={0} max={1000} value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} className="mt-1 w-full border rounded p-2" />
                </label>
                <label className="text-sm font-medium">رسوم الخدمة الافتراضية
                  <input type="number" min={0} max={1000} value={serviceFee} onChange={(e) => setServiceFee(Number(e.target.value))} className="mt-1 w-full border rounded p-2" />
                </label>
              </div>
              <button onClick={() => void savePricing()} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg">حفظ التسعير</button>
              {pricingMsg && <p className="mt-2 text-sm font-bold">{pricingMsg}</p>}
            </div>
          </div>
        )}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-bold mb-1">إصدارات التطبيقات والصيانة</h2>
              <p className="text-sm text-gray-500 mb-4">min_version يفرض التحديث الإجباري · maintenance يفعّل وضع الصيانة لذلك التطبيق.</p>
              {APPS.map((app) => (
                <div key={app} className="border rounded-lg p-4 mb-3">
                  <div className="font-bold mb-2" dir="ltr">{app}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="text-sm">min_version
                      <input value={appVersions[app]?.min_version || ''} onChange={(e) => setApp(app, { min_version: e.target.value })} dir="ltr" className="mt-1 w-full border rounded p-2" placeholder="1.0.0" />
                    </label>
                    <label className="text-sm">latest_version
                      <input value={appVersions[app]?.latest_version || ''} onChange={(e) => setApp(app, { latest_version: e.target.value })} dir="ltr" className="mt-1 w-full border rounded p-2" placeholder="1.2.0" />
                    </label>
                    <label className="text-sm flex items-center gap-2 mt-6">
                      <input type="checkbox" checked={!!appVersions[app]?.maintenance} onChange={(e) => setApp(app, { maintenance: e.target.checked })} /> صيانة
                    </label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 mt-2">
                    <input value={appVersions[app]?.message_ar || ''} onChange={(e) => setApp(app, { message_ar: e.target.value })} className="border rounded p-2 text-sm" placeholder="رسالة الصيانة (عربي)" />
                    <input value={appVersions[app]?.message_en || ''} onChange={(e) => setApp(app, { message_en: e.target.value })} dir="ltr" className="border rounded p-2 text-sm" placeholder="Maintenance message" />
                  </div>
                </div>
              ))}
              <button onClick={() => void saveAppVersions()} className="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg">حفظ الإصدارات</button>
              {appsMsg && <p className="mt-2 text-sm font-bold">{appsMsg}</p>}
            </div>
          </div>
        )}
        {activeTab === 'rxconsult' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-bold mb-1">تخصص زر &laquo;استشر طبيب&raquo; لأدوية الوصفة</h2>
              <p className="text-sm text-gray-500 mb-4">لكل فئة من أدوية الوصفة اختر التخصص الذي تُفتح عليه الاستشارات. الفئات بلا اختيار تستخدم التخصص الافتراضي، وإن لم يُحدَّد تُفتح الاستشارات بلا تصفية.</p>
              {!rxConsult ? <p className="text-sm">جارٍ التحميل…</p> : (
                <>
                  <label className="text-sm block max-w-sm mb-4">التخصص الافتراضي
                    <select value={rxConsult.default || ''} onChange={(e) => setRxConsult({ ...rxConsult, default: e.target.value || null })} className="mt-1 w-full border rounded p-2">
                      <option value="">بدون تصفية</option>
                      {rxConsult.specialties.map((sp) => <option key={sp.slug} value={sp.slug}>{sp.name_ar}</option>)}
                    </select>
                  </label>
                  <table className="w-full text-sm">
                    <thead><tr className="text-right text-gray-500"><th className="py-2">الفئة</th><th>عدد الأدوية</th><th>التخصص</th></tr></thead>
                    <tbody>
                      {rxConsult.categories.map((c) => (
                        <tr key={c.key} className="border-t">
                          <td className="py-2">{c.key}</td>
                          <td>{c.count}</td>
                          <td>
                            <select value={rxConsult.map[c.key] || ''} onChange={(e) => setRxConsult({ ...rxConsult, map: { ...rxConsult.map, [c.key]: e.target.value } })} className="border rounded p-1">
                              <option value="">الافتراضي</option>
                              {rxConsult.specialties.map((sp) => <option key={sp.slug} value={sp.slug}>{sp.name_ar}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => void saveRxConsult()} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg">حفظ الربط</button>
                  {rxConsultMsg && <p className="mt-2 text-sm font-bold">{rxConsultMsg}</p>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
