import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

/**
 * Insurance companies directory management:
 * - list ALL companies (active + disabled) with their tier networks
 * - add / edit company (rename, logo)
 * - enable / disable (real PATCH to backend + DB)
 * - add / remove tiers (networks) per company
 *
 * Backend: GET /insurance/companies/all · POST /insurance/companies
 *          PATCH /insurance/companies/:id
 *          POST /insurance/companies/:id/networks
 *          DELETE /insurance/companies/:id/networks/:networkId
 */
export default function InsuranceCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // add-company form
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');

  // edit-company form
  const [editId, setEditId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');

  // add-tier form
  const [tierCompany, setTierCompany] = useState<string | null>(null);
  const [tierCode, setTierCode] = useState('');
  const [tierNameAr, setTierNameAr] = useState('');
  const [tierNameEn, setTierNameEn] = useState('');
  const [tierLevel, setTierLevel] = useState('1');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/insurance/companies/all');
      setCompanies(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل شركات التأمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (c: any) => {
    const id = c.id || c._id;
    setBusy(id);
    try {
      await apiFetch(`/insurance/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      await load();
    } catch (e: any) {
      alert(`${c.is_active ? 'فشل التعطيل' : 'فشل التفعيل'}: ${e?.message || ''}`);
    } finally {
      setBusy(null);
    }
  };

  const addCompany = async () => {
    if (!newCode.trim() || !newNameAr.trim() || !newNameEn.trim()) {
      alert('أكمل الكود والاسم العربي والإنجليزي');
      return;
    }
    setBusy('add');
    try {
      await apiFetch('/insurance/companies', {
        method: 'POST',
        body: JSON.stringify({ code: newCode.trim().toLowerCase(), name_ar: newNameAr.trim(), name_en: newNameEn.trim() }),
      });
      setShowAdd(false);
      setNewCode(''); setNewNameAr(''); setNewNameEn('');
      await load();
    } catch (e: any) {
      alert(`فشل إضافة الشركة: ${e?.message || ''}`);
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(editId);
    try {
      await apiFetch(`/insurance/companies/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name_ar: editNameAr.trim(), name_en: editNameEn.trim() }),
      });
      setEditId(null);
      await load();
    } catch (e: any) {
      alert(`فشل حفظ التعديل: ${e?.message || ''}`);
    } finally {
      setBusy(null);
    }
  };

  const addTier = async () => {
    if (!tierCompany || !tierCode.trim() || !tierNameAr.trim() || !tierNameEn.trim()) {
      alert('أكمل بيانات الفئة (الكود والاسم العربي والإنجليزي)');
      return;
    }
    setBusy(tierCompany);
    try {
      await apiFetch(`/insurance/companies/${tierCompany}/networks`, {
        method: 'POST',
        body: JSON.stringify({
          code: tierCode.trim().toLowerCase(),
          name_ar: tierNameAr.trim(),
          name_en: tierNameEn.trim(),
          tier_level: parseInt(tierLevel, 10) || 1,
        }),
      });
      setTierCompany(null);
      setTierCode(''); setTierNameAr(''); setTierNameEn(''); setTierLevel('1');
      await load();
    } catch (e: any) {
      alert(`فشل إضافة الفئة: ${e?.message || ''}`);
    } finally {
      setBusy(null);
    }
  };

  const removeTier = async (companyId: string, tier: any) => {
    if (!confirm(`حذف فئة «${tier.name_ar}» نهائياً؟`)) return;
    setBusy(tier.id || tier._id);
    try {
      await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert(`فشل حذف الفئة: ${e?.message || ''}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Head><title>شركات التأمين | نبض</title></Head>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">شركات التأمين ({companies.length})</h1>
            <p className="text-sm text-slate-500 mt-1">إدارة الشركات والفئات — كل التغييرات تُحفظ فورياً في قاعدة البيانات.</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl"
          >
            {showAdd ? 'إلغاء' : '+ إضافة شركة'}
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded">{error}</div>}

        {showAdd && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">الكود (إنجليزي، فريد)</label>
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="مثال: cigna" className="border rounded px-3 py-2 w-44" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">الاسم بالعربية</label>
              <input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} placeholder="سيجنا" className="border rounded px-3 py-2 w-52" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">الاسم بالإنجليزية</label>
              <input value={newNameEn} onChange={e => setNewNameEn(e.target.value)} placeholder="Cigna" className="border rounded px-3 py-2 w-52" dir="ltr" />
            </div>
            <button onClick={addCompany} disabled={busy === 'add'} className="bg-teal-600 text-white font-bold px-6 py-2 rounded-xl disabled:opacity-50">
              {busy === 'add' ? '...' : 'حفظ الشركة'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : (
          <div className="space-y-3">
            {companies.map((c) => {
              const id = c.id || c._id;
              const isOpen = expanded === id;
              return (
                <div key={id} className={`bg-white rounded-xl border ${c.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'}`}>
                  <div className="p-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => setExpanded(isOpen ? null : id)} className="text-slate-400 w-6">{isOpen ? '▾' : '◂'}</button>
                    <div className="flex-1 min-w-[220px]">
                      {editId === id ? (
                        <div className="flex flex-wrap gap-2">
                          <input value={editNameAr} onChange={e => setEditNameAr(e.target.value)} className="border rounded px-2 py-1" />
                          <input value={editNameEn} onChange={e => setEditNameEn(e.target.value)} className="border rounded px-2 py-1" dir="ltr" />
                          <button onClick={saveEdit} disabled={busy === id} className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded">حفظ</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-slate-500 px-2">إلغاء</button>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-slate-800">{c.name_ar} <span className="text-slate-400 font-normal" dir="ltr">({c.name_en})</span></div>
                          <div className="text-xs text-slate-400" dir="ltr">{c.code} · {(c.tiers || []).length} فئة</div>
                        </>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'مفعّلة' : 'معطّلة'}
                    </span>
                    <button
                      onClick={() => { setEditId(id); setEditNameAr(c.name_ar || ''); setEditNameEn(c.name_en || ''); }}
                      className="text-slate-600 hover:text-slate-900 text-sm font-bold border border-slate-300 rounded-lg px-3 py-1.5"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={toggleActive}
                      disabled={busy === id}
                      className={`text-sm font-bold rounded-lg px-3 py-1.5 text-white disabled:opacity-50 ${c.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {busy === id ? '...' : c.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-600">الفئات / الشبكات (Tiers)</h3>
                        <button
                          onClick={() => { setTierCompany(tierCompany === id ? null : id); setTierCode(''); setTierNameAr(''); setTierNameEn(''); }}
                          className="text-teal-700 text-sm font-bold"
                        >
                          {tierCompany === id ? 'إلغاء' : '+ إضافة فئة'}
                        </button>
                      </div>

                      {tierCompany === id && (
                        <div className="mb-4 flex flex-wrap gap-2 items-end bg-slate-50 rounded-lg p-3">
                          <input value={tierCode} onChange={e => setTierCode(e.target.value)} placeholder="الكود: vip" className="border rounded px-2 py-1.5 w-28" dir="ltr" />
                          <input value={tierNameAr} onChange={e => setTierNameAr(e.target.value)} placeholder="الاسم: VIP" className="border rounded px-2 py-1.5 w-36" />
                          <input value={tierNameEn} onChange={e => setTierNameEn(e.target.value)} placeholder="Name: VIP" className="border rounded px-2 py-1.5 w-36" dir="ltr" />
                          <input value={tierLevel} onChange={e => setTierLevel(e.target.value.replace(/\D/g, ''))} placeholder="المستوى" className="border rounded px-2 py-1.5 w-20" dir="ltr" />
                          <button onClick={addTier} disabled={busy === id} className="bg-teal-600 text-white text-sm font-bold px-4 py-1.5 rounded disabled:opacity-50">حفظ الفئة</button>
                        </div>
                      )}

                      {(c.tiers || []).length === 0 ? (
                        <div className="text-sm text-slate-400">لا توجد فئات بعد — أضف أول فئة لهذه الشركة.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(c.tiers || []).map((t: any) => (
                            <span key={t.id || t._id} className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 text-sm">
                              <span className="font-bold text-slate-700">{t.name_ar}</span>
                              <span className="text-slate-400 text-xs" dir="ltr">{t.name_en} · L{t.tier_level}</span>
                              <button onClick={() => removeTier(id, t)} disabled={busy === (t.id || t._id)} className="text-red-500 hover:text-red-700 font-bold" title="حذف الفئة">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
