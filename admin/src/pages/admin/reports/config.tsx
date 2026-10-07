import { useEffect, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage, adminMutation } from '@/lib/admin-client';

interface ConfigSchema {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'boolean' | 'string' | 'json';
  validation?: { min?: number; max?: number; enum?: string[] };
  sensitive?: boolean;
}

interface ConfigValue {
  key: string;
  value: any;
  updatedAt: string;
  updatedBy: string;
  reason: string;
}

const CONFIG_GROUPS: Record<string, ConfigSchema[]> = {
  commissions: [
    { key: 'commission_rate_pharmacy', label: 'عمولة الصيدلية (%)', description: 'نسبة العمولة من طلبات الصيدلية', type: 'number', validation: { min: 0, max: 50 } },
    { key: 'commission_rate_doctor', label: 'عمولة الطبيب (%)', description: 'نسبة العمولة من استشارات الأطباء', type: 'number', validation: { min: 0, max: 50 } },
    { key: 'commission_rate_lab', label: 'عمولة المختبر (%)', description: 'نسبة العمولة من تحاليل المختبر', type: 'number', validation: { min: 0, max: 50 } },
    { key: 'commission_rate_radiology', label: 'عمولة الأشعة (%)', description: 'نسبة العمولة من خدمات الأشعة', type: 'number', validation: { min: 0, max: 50 } },
    { key: 'commission_rate_nursing', label: 'عمولة التمريض (%)', description: 'نسبة العمولة من خدمات التمريض المنزلي', type: 'number', validation: { min: 0, max: 50 } },
    { key: 'commission_rate_ambulance', label: 'عمولة الإسعاف (%)', description: 'نسبة العمولة من خدمات الإسعاف', type: 'number', validation: { min: 0, max: 50 } },
  ],
  vat: [
    { key: 'vat_rate', label: 'نسبة ضريبة القيمة المضافة (%)', description: 'معدل ضريبة القيمة المضافة المطبق', type: 'number', validation: { min: 0, max: 20 } },
    { key: 'vat_inclusive', label: 'الأسعار شاملة الضريبة', description: 'هل الأسعار المعروضة تتضمن الضريبة', type: 'boolean' },
  ],
  settlement: [
    { key: 'settlement_cycle_days', label: 'دورة التسوية (أيام)', description: 'عدد الأيام بين طلب السحب والتنفيذ', type: 'number', validation: { min: 1, max: 30 } },
    { key: 'settlement_min_amount', label: 'الحد الأدنى للسحب', description: 'أقل مبلغ يمكن للمزود سحبه', type: 'number', validation: { min: 0 } },
    { key: 'settlement_fee', label: 'رسوم السحب', description: 'رسوم ثابتة لكل عملية سحب', type: 'number', validation: { min: 0 } },
  ],
  payouts: [
    { key: 'payout_min_amount', label: 'الحد الأدنى للدفع', description: 'أقل مبلغ للدفع للمزود', type: 'number', validation: { min: 0 } },
    { key: 'payout_auto_approve_threshold', label: 'عتبة الموافقة التلقائية', description: 'المبالغ أقل من هذا تُعتمد تلقائياً', type: 'number', validation: { min: 0 } },
    { key: 'payout_batch_window_hours', label: 'نافذة تجميع الدفعات (ساعات)', description: 'فترة تجميع الدفعات قبل التنفيذ', type: 'number', validation: { min: 1, max: 72 } },
  ],
  sla: [
    { key: 'sla_consultation_duration_min', label: 'مدة الاستشارة (دقيقة)', description: 'المدة القياسية للاستشارة الطبية', type: 'number', validation: { min: 5, max: 120 } },
    { key: 'sla_call_ringing_seconds', label: 'مدة رنين المكالمة (ثانية)', description: 'مهلة الرد على المكالمة الواردة', type: 'number', validation: { min: 15, max: 120 } },
    { key: 'sla_provider_response_minutes', label: 'مهلة رد المزود (دقيقة)', description: 'الوقت المسموح للمزود للرد على الطلب', type: 'number', validation: { min: 1, max: 60 } },
    { key: 'sla_delivery_minutes', label: 'مهلة التوصيل (دقيقة)', description: 'الوقت المستهدف للتوصيل', type: 'number', validation: { min: 15, max: 180 } },
  ],
  refunds: [
    { key: 'refund_window_days', label: 'نافذة الاسترداد (أيام)', description: 'فترة السماح بطلب الاسترداد', type: 'number', validation: { min: 1, max: 90 } },
    { key: 'refund_auto_approve_threshold', label: 'عتبة الموافقة التلقائية للاسترداد', description: 'المبالغ أقل من هذا تُعتمد تلقائياً', type: 'number', validation: { min: 0 } },
    { key: 'refund_require_reason', label: 'طلب سبب للاسترداد', description: 'إجبار المريض على كتابة سبب', type: 'boolean' },
  ],
  delivery: [
    { key: 'delivery_fee_base', label: 'رسوم التوصيل الأساسية', description: 'رسوم التوصيل الافتراضية', type: 'number', validation: { min: 0 } },
    { key: 'delivery_fee_per_km', label: 'رسوم التوصيل لكل كم', description: 'تكلفة إضافية لكل كيلومتر', type: 'number', validation: { min: 0 } },
    { key: 'delivery_free_threshold', label: 'عتبة التوصيل المجاني', description: 'قيمة الطلب للحصول على توصيل مجاني', type: 'number', validation: { min: 0 } },
    { key: 'surge_multiplier', label: 'معامل الذروة', description: 'مضاعف الأسعار في أوقات الذروة', type: 'number', validation: { min: 1, max: 5 } },
    { key: 'surge_start_hour', label: 'بداية الذروة (ساعة)', description: 'ساعة بداية فترة الذروة (0-23)', type: 'number', validation: { min: 0, max: 23 } },
    { key: 'surge_end_hour', label: 'نهاية الذروة (ساعة)', description: 'ساعة نهاية فترة الذروة (0-23)', type: 'number', validation: { min: 0, max: 23 } },
  ],
  loyalty: [
    { key: 'loyalty_earn_rate', label: 'معدل كسب النقاط', description: 'نقاط لكل ريال يتم إنفاقه', type: 'number', validation: { min: 0, max: 10 } },
    { key: 'loyalty_redeem_value', label: 'قيمة استبدال النقاط', description: 'ريالات لكل 100 نقطة', type: 'number', validation: { min: 0, max: 10 } },
    { key: 'loyalty_cap_per_order', label: 'سقف النقاط للطلب الواحد', description: 'أقصى نقاط يمكن كسبها من طلب واحد', type: 'number', validation: { min: 0 } },
    { key: 'loyalty_cap_per_month', label: 'سقف النقاط الشهري', description: 'أقصى نقاط يمكن كسبها شهرياً', type: 'number', validation: { min: 0 } },
    { key: 'loyalty_expiry_months', label: 'انتهاء صلاحية النقاط (أشهر)', description: 'مدة صلاحية النقاط قبل انتهائها', type: 'number', validation: { min: 1, max: 36 } },
  ],
  featureFlags: [
    { key: 'ff_insurance_enabled', label: 'تفعيل التأمين', description: 'تمكين/تعطيل خدمة التأمين', type: 'boolean' },
    { key: 'ff_loyalty_enabled', label: 'تفعيل الولاء', description: 'تمكين/تعطيل برنامج الولاء', type: 'boolean' },
    { key: 'ff_refunds_enabled', label: 'تفعيل الاستردادات', description: 'تمكين/تعطيل طلبات الاسترداد', type: 'boolean' },
    { key: 'ff_payouts_enabled', label: 'تفعيل السحوبات', description: 'تمكين/تعطيل سحب المزودين', type: 'boolean' },
    { key: 'ff_chat_enabled', label: 'تفعيل المحادثة', description: 'تمكين/تعطيل المحادثة بين المريض والمزود', type: 'boolean' },
    { key: 'ff_telemedicine_enabled', label: 'تفعيل الطب عن بعد', description: 'تمكين/تعطيل الاستشارات عن بعد', type: 'boolean' },
    { key: 'ff_home_care_enabled', label: 'تفعيل الرعاية المنزلية', description: 'تمكين/تعطيل خدمات الرعاية المنزلية', type: 'boolean' },
    { key: 'ff_ambulance_enabled', label: 'تفعيل الإسعاف', description: 'تمكين/تعطيل خدمات الإسعاف', type: 'boolean' },
  ],
};

export default function BusinessConfigPage() {
  const [configs, setConfigs] = useState<Record<string, ConfigValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<string>('commissions');
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res: any = await adminFetch('/api/admin/admin/config/business');
      if (res?.configs) {
        setConfigs(res.configs);
        Object.keys(res.configs).forEach(k => setEditValues(k => res.configs[k]?.value));
      }
    } catch (cause) {
      console.error('Failed to load config', cause);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string, schema: ConfigSchema) => {
    const value = editValues[key];
    if (value === undefined) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    setMessages(prev => ({ ...prev, [key]: '' }));
    try {
      const reason = window.prompt(`سبب تعديل ${schema.label} (يُحفظ في سجل التدقيق — 5 أحرف على الأقل):`, '');
      if (!reason || reason.trim().length < 5) {
        alert('يرجى إدخال سبب لا يقل عن 5 أحرف');
        setSaving(prev => ({ ...prev, [key]: false }));
        return;
      }
      const res = await adminMutation(`/api/admin/admin/config/business/${key}`, 'PUT', { value, reason: reason.trim() });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, [key]: { ...prev[key], value, updatedAt: new Date().toISOString(), reason: reason.trim() } }));
        setMessages(prev => ({ ...prev, [key]: 'تم الحفظ' }));
      } else {
        setMessages(prev => ({ ...prev, [key]: 'فشل الحفظ' }));
      }
    } catch {
      setMessages(prev => ({ ...prev, [key]: 'فشل الحفظ' }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderInput = (schema: ConfigSchema, value: any) => {
    const val = value ?? '';
    switch (schema.type) {
      case 'number':
        return (
          <input
            type="number"
            min={schema.validation?.min}
            max={schema.validation?.max}
            value={val}
            onChange={e => handleChange(schema.key, Number(e.target.value))}
            className="w-full border rounded p-2 text-left"
            dir="ltr"
          />
        );
      case 'boolean':
        return (
          <select value={String(val)} onChange={e => handleChange(schema.key, e.target.value === 'true')} className="w-full border rounded p-2">
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </select>
        );
      case 'string':
        return (
          <input
            type="text"
            value={val}
            onChange={e => handleChange(schema.key, e.target.value)}
            className="w-full border rounded p-2"
          />
        );
      case 'json':
        return (
          <textarea
            value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
            onChange={e => { try { handleChange(schema.key, JSON.parse(e.target.value)); } catch { handleChange(schema.key, e.target.value); } }}
            className="w-full border rounded p-2 font-mono text-sm"
            rows={3}
          />
        );
    }
  };

  if (loading) {
    return (
      <>
        <Head><title>إعدادات العمل | نبض بلس</title></Head>
        <section dir="rtl" className="p-6 md:p-8 text-center">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <p className="text-slate-500">جارٍ تحميل الإعدادات…</p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Head><title>إعدادات العمل | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">إعدادات العمل القابلة للتعديل</h1>
            <p className="mt-1 text-sm text-slate-500">جميع القيم التجارية تدار من هنا — لا توجد ثوابت في الكود. كل تغيير مدقق ومسجل.</p>
          </div>
          <div className="flex gap-2">
            <a href="/api/admin/admin/config/business/export" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">تصدير JSON</a>
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const text = await file.text();
                try {
                  await adminMutation('/api/admin/admin/config/business/import', 'POST', JSON.parse(text));
                  alert('تم الاستيراد');
                  loadAll();
                } catch { alert('ملف غير صالح'); }
              }
            }} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white cursor-pointer">استيراد JSON</label>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {Object.keys(CONFIG_GROUPS).map(group => (
            <button key={group} onClick={() => setActiveGroup(group)}
              className={`rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap ${activeGroup === group ? 'bg-teal-700 text-white' : 'bg-white border'}`}>
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </button>
          ))}
        </div>

        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-6">
            {CONFIG_GROUPS[activeGroup].map(schema => {
              const current = configs[schema.key];
              const value = editValues[schema.key] ?? current?.value;
              const savingKey = saving[schema.key];
              const msg = messages[schema.key];
              return (
                <div key={schema.key} className="border rounded-lg p-4 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1">
                      <label className="block font-medium text-gray-700">{schema.label}</label>
                      <p className="text-sm text-slate-500 mt-1">{schema.description}</p>
                    </div>
                    <div className="md:col-span-2">
                      {renderInput(schema, value)}
                      {schema.validation && (
                        <p className="mt-1 text-xs text-slate-500">
                          {schema.validation.min !== undefined && `الحد الأدنى: ${schema.validation.min}`}
                          {schema.validation.max !== undefined && ` — الحد الأقصى: ${schema.validation.max}`}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-2">
                      {msg && <span className="text-sm font-bold text-teal-700">{msg}</span>}
                      <button
                        disabled={savingKey || value === current?.value}
                        onClick={() => handleSave(schema.key, schema)}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {savingKey ? 'جاري الحفظ…' : 'حفظ'}
                      </button>
                    </div>
                  </div>
                  {current && (
                    <div className="mt-3 pt-3 border-t text-xs text-slate-500">
                      آخر تعديل: {new Date(current.updatedAt).toLocaleString('ar-SA')} بواسطة {current.updatedBy} — السبب: {current.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>

        {/* Audit Log for Config Changes */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">سجل تغييرات الإعدادات</h2>
          <ConfigAuditLog />
        </article>
      </section>
    </>
  );
}

function ConfigAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/admin/config/business/audit')
      .then((res: any) => setLogs(res?.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-500">جارٍ تحميل السجل…</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-right text-sm">
        <thead><tr className="border-b text-slate-500">
          <th className="p-2">المفتاح</th>
          <th className="p-2">القيمة السابقة</th>
          <th className="p-2">القيمة الجديدة</th>
          <th className="p-2">الفاعل</th>
          <th className="p-2">السبب</th>
          <th className="p-2">التاريخ</th>
        </tr></thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-b hover:bg-slate-50">
              <td className="p-2 font-mono">{log.key}</td>
              <td className="p-2">{log.old_value ?? '—'}</td>
              <td className="p-2">{log.new_value ?? '—'}</td>
              <td className="p-2">{log.actor_name || log.actor_id}</td>
              <td className="p-2">{log.reason}</td>
              <td className="p-2">{new Date(log.createdAt).toLocaleString('ar-SA')}</td>
            </tr>
          ))}
          {!logs.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">لا توجد تغييرات مسجلة</td></tr>}
        </tbody>
      </table>
    </div>
  );
}