import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

type Reward = { id: string; title_ar: string; points_required: number; reward_type: string; stock: number; active: boolean };
type Challenge = { id: string; title_ar: string; target_action: string; target_count: number; reward_points: number; start_date: string; end_date: string; active: boolean };

export default function LoyaltyConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rewardDraft, setRewardDraft] = useState({ title_ar: '', title_en: '', points_required: 500, reward_type: 'coupon', stock: 100 });
  const [challengeDraft, setChallengeDraft] = useState({ title_ar: '', title_en: '', target_action: 'book_appointment', target_count: 1, reward_points: 200, start_date: '', end_date: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cfg, rw, ch] = await Promise.all([
        apiFetch<any>('/loyalty/config'),
        apiFetch<any>('/admin/loyalty/rewards').catch(() => []),
        apiFetch<any>('/admin/loyalty/challenges').catch(() => []),
      ]);
      setConfig({ points_per_order: cfg?.points_per_order ?? 10, referral_points: cfg?.referral_points ?? 50, tiers: cfg?.tiers ?? [], earn_ways: cfg?.earn_ways ?? [] });
      setRewards(Array.isArray(rw) ? rw : rw?.data || []);
      setChallenges(Array.isArray(ch) ? ch : ch?.data || []);
    } catch (e: any) { setError(e?.message || 'تعذر تحميل إعدادات الولاء'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    setSaving(true); setError('');
    try {
      await apiFetch('/admin/admin/loyalty/config', { method: 'PUT', body: JSON.stringify({ points_per_order: config?.points_per_order ?? 10, referral_points: config?.referral_points ?? 50 }) });
      alert('تم الحفظ'); await load();
    } catch (e: any) { setError(e?.message || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const createReward = async () => {
    setError('');
    try {
      await apiFetch('/admin/admin/loyalty/rewards', { method: 'POST', body: JSON.stringify(rewardDraft) });
      setRewardDraft({ title_ar: '', title_en: '', points_required: 500, reward_type: 'coupon', stock: 100 });
      await load();
    } catch (e: any) { setError(e?.message || 'تعذر إنشاء المكافأة'); }
  };

  const toggleReward = async (reward: Reward) => {
    setError('');
    try { await apiFetch(`/admin/loyalty/rewards/${reward.id}`, { method: 'PATCH', body: JSON.stringify({ active: !reward.active }) }); await load(); }
    catch (e: any) { setError(e?.message || 'تعذر تحديث المكافأة'); }
  };

  const createChallenge = async () => {
    setError('');
    try {
      await apiFetch('/admin/admin/loyalty/challenges', { method: 'POST', body: JSON.stringify(challengeDraft) });
      setChallengeDraft({ title_ar: '', title_en: '', target_action: 'book_appointment', target_count: 1, reward_points: 200, start_date: '', end_date: '' });
      await load();
    } catch (e: any) { setError(e?.message || 'تعذر إنشاء التحدي'); }
  };

  const toggleChallenge = async (challenge: Challenge) => {
    setError('');
    try { await apiFetch(`/admin/loyalty/challenges/${challenge.id}`, { method: 'PATCH', body: JSON.stringify({ active: !challenge.active }) }); await load(); }
    catch (e: any) { setError(e?.message || 'تعذر تحديث التحدي'); }
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  return (<><Head><title>إعدادات الولاء | نبض</title></Head>
  <div className="p-8 space-y-6">
    <h1 className="text-2xl font-black">إعداد الولاء والإحالة</h1>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-black">النقاط</h2>
      <div><label className="mb-1 block text-sm font-bold">نقاط لكل طلب</label><input type="number" value={config?.points_per_order ?? 10} onChange={e => setConfig({ ...config, points_per_order: parseInt(e.target.value) || 0 })} className="w-40 rounded border px-3 py-2" /></div>
      <div><label className="mb-1 block text-sm font-bold">نقاط الإحالة</label><input type="number" value={config?.referral_points ?? 50} onChange={e => setConfig({ ...config, referral_points: parseInt(e.target.value) || 0 })} className="w-40 rounded border px-3 py-2" /></div>
      <button onClick={saveConfig} disabled={saving} className="rounded-xl bg-teal-600 px-6 py-2 font-bold text-white disabled:opacity-50">{saving ? '...' : 'حفظ الإعدادات'}</button>
    </div>

    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-black">المكافآت ({rewards.length})</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        <input placeholder="الاسم بالعربية" value={rewardDraft.title_ar} onChange={e => setRewardDraft({ ...rewardDraft, title_ar: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Name (EN)" value={rewardDraft.title_en} onChange={e => setRewardDraft({ ...rewardDraft, title_en: e.target.value })} className="rounded border px-3 py-2" />
        <input type="number" placeholder="النقاط" value={rewardDraft.points_required} onChange={e => setRewardDraft({ ...rewardDraft, points_required: parseInt(e.target.value) || 0 })} className="rounded border px-3 py-2" />
        <select value={rewardDraft.reward_type} onChange={e => setRewardDraft({ ...rewardDraft, reward_type: e.target.value })} className="rounded border px-3 py-2">
          <option value="coupon">كوبون</option><option value="cashback">كاشباك</option><option value="badge">شارة</option><option value="gift">هدية</option>
        </select>
        <button onClick={createReward} className="rounded bg-teal-600 px-4 py-2 font-bold text-white">إضافة</button>
      </div>
      <ul className="divide-y text-sm">
        {rewards.map(r => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <span>{r.title_ar} · {r.points_required} نقطة · {r.reward_type} · مخزون {r.stock}</span>
            <button onClick={() => toggleReward(r)} className={`rounded px-3 py-1 text-xs font-bold ${r.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{r.active ? 'مفعّلة' : 'معطّلة'}</button>
          </li>
        ))}
        {rewards.length === 0 && <li className="py-2 text-slate-400">لا توجد مكافآت بعد.</li>}
      </ul>
    </div>

    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-black">التحديات ({challenges.length})</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
        <input placeholder="الاسم بالعربية" value={challengeDraft.title_ar} onChange={e => setChallengeDraft({ ...challengeDraft, title_ar: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Name (EN)" value={challengeDraft.title_en} onChange={e => setChallengeDraft({ ...challengeDraft, title_en: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="الإجراء" value={challengeDraft.target_action} onChange={e => setChallengeDraft({ ...challengeDraft, target_action: e.target.value })} className="rounded border px-3 py-2" />
        <input type="number" placeholder="الهدف" value={challengeDraft.target_count} onChange={e => setChallengeDraft({ ...challengeDraft, target_count: parseInt(e.target.value) || 1 })} className="rounded border px-3 py-2" />
        <input type="number" placeholder="النقاط" value={challengeDraft.reward_points} onChange={e => setChallengeDraft({ ...challengeDraft, reward_points: parseInt(e.target.value) || 0 })} className="rounded border px-3 py-2" />
        <input type="date" value={challengeDraft.start_date} onChange={e => setChallengeDraft({ ...challengeDraft, start_date: e.target.value })} className="rounded border px-3 py-2" />
        <input type="date" value={challengeDraft.end_date} onChange={e => setChallengeDraft({ ...challengeDraft, end_date: e.target.value })} className="rounded border px-3 py-2" />
        <button onClick={createChallenge} className="rounded bg-teal-600 px-4 py-2 font-bold text-white">إضافة تحدٍ</button>
      </div>
      <ul className="divide-y text-sm">
        {challenges.map(c => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <span>{c.title_ar} · {c.target_action} ×{c.target_count} · {c.reward_points} نقطة</span>
            <button onClick={() => toggleChallenge(c)} className={`rounded px-3 py-1 text-xs font-bold ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{c.active ? 'مفعّل' : 'معطّل'}</button>
          </li>
        ))}
        {challenges.length === 0 && <li className="py-2 text-slate-400">لا توجد تحديات بعد.</li>}
      </ul>
    </div>
  </div></>);
}
