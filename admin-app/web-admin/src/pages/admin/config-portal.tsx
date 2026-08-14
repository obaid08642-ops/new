import React, { useState, useEffect } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

export default function ConfigPortal() {
  const [activeTab, setActiveTab] = useState<'sla' | 'maintenance'>('sla');
  
  // SLA State
  const [consultationDuration, setConsultationDuration] = useState(15);
  const [callRingingDuration, setCallRingingDuration] = useState(45);
  const [jwtExpiry, setJwtExpiry] = useState(24);
  
  // Maintenance State
  const [killSwitchChecked1, setKillSwitchChecked1] = useState(false);
  const [killSwitchChecked2, setKillSwitchChecked2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'online' | 'maintenance'>('online');

  useEffect(() => {
    const fetchSLA = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
        const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`);
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

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`, { 
        method: 'PUT', 
        body: JSON.stringify({ consultationDuration, callRingingDuration, jwtExpiry }) 
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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/trigger-emergency-maintenance`, {
        method: 'PUT',
        body: JSON.stringify({
          adminId: 'admin-master-001',
          forceMaintenanceState
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
                ⚠️ THE HIGH-PRIORITY SYSTEM MAINTENANCE KILL-SWITCH
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
                    disabled={!killSwitchChecked1 || !killSwitchChecked2 || isSubmitting}
                    onClick={() => handleTriggerEmergencyKillSwitch(true)}
                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg disabled:opacity-50 transition uppercase tracking-widest text-lg"
                  >
                    {isSubmitting ? 'جاري الإقفال...' : 'Trigger System Kill-Switch'}
                  </button>
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
      </div>
    </div>
  );
}
