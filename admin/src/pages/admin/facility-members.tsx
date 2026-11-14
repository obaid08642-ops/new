import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import {
  INVITATION_STATUSES, canCancelInvitation, filterByText, invitationStatusText, roleText,
  type FacilityInvitationRow, type FacilityMembershipRow,
} from '@/lib/facility-members';

type Tab = 'invitations' | 'memberships';

/** Facility invitations and members (gap 8): who was invited to which facility, withdraw a pending invitation, end a member's link. */
export default function FacilityMembersPage() {
  const [tab, setTab] = useState<Tab>('invitations');
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [invitations, setInvitations] = useState<FacilityInvitationRow[] | null>(null);
  const [members, setMembers] = useState<FacilityMembershipRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  // the row waiting for its second tap ("تأكيد"): a native confirm() is not used
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setFailed(false); setConfirming(null);
    if (tab === 'invitations') {
      setInvitations(null);
      apiFetch(`/api/admin/admin/facilities/invitations${status ? `?status=${status}` : ''}`).then((r: FacilityInvitationRow[]) => setInvitations(Array.isArray(r) ? r : [])).catch(() => setFailed(true));
    } else {
      setMembers(null);
      apiFetch('/api/admin/admin/facilities/memberships').then((r: FacilityMembershipRow[]) => setMembers(Array.isArray(r) ? r : [])).catch(() => setFailed(true));
    }
  };
  useEffect(() => { load(); }, [tab, status]);

  const run = async (path: string, done: string) => {
    setBusy(true); setMessage('');
    try { await apiFetch(path, { method: 'POST' }); setMessage(done); load(); } catch { setMessage('تعذر تنفيذ الإجراء، أعد المحاولة'); } finally { setBusy(false); setConfirming(null); }
  };

  const invRows = invitations ? filterByText(invitations, text, ['facility_name', 'invitee_name', 'invitee_identifier', 'facility_id', 'invitee_id']) : [];
  const memRows = members ? filterByText(members, text, ['facility_name', 'full_name', 'role', 'facility_id', 'user_id']) : [];

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">دعوات المنشآت وأعضاؤها</h1>
      <p className="text-sm opacity-70 mb-4">من دُعي إلى أي منشأة، وحالة الدعوة، ومن هم الأعضاء المرتبطون بكل منشأة. يمكن سحب دعوة قيد الانتظار أو إنهاء ارتباط عضو.</p>
      <div className="flex gap-2 mb-4" role="group" aria-label="القسم">
        <button onClick={() => setTab('invitations')} aria-pressed={tab === 'invitations'} className={`px-3 py-1 rounded-lg border ${tab === 'invitations' ? 'border-4 font-bold' : ''}`}>الدعوات</button>
        <button onClick={() => setTab('memberships')} aria-pressed={tab === 'memberships'} className={`px-3 py-1 rounded-lg border ${tab === 'memberships' ? 'border-4 font-bold' : ''}`}>الأعضاء</button>
      </div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="بحث بالاسم" aria-label="بحث" className="border rounded-lg px-3 py-1 w-64" />
        {tab === 'invitations' && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="حالة الدعوة" className="border rounded-lg px-3 py-1">
            {INVITATION_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}
      </div>
      {message && <p role="status" className="mb-3 font-bold">{message}</p>}
      {failed ? (
        <div><p className="mb-2">تعذر تحميل القائمة</p><button onClick={load} className="px-4 py-2 rounded-lg border font-bold">إعادة المحاولة</button></div>
      ) : tab === 'invitations' ? (
        invitations === null ? <p>جارٍ التحميل…</p> : invRows.length === 0 ? <p>لا توجد دعوات.</p> : (
          <table className="w-full text-sm border">
            <thead><tr className="text-right"><th className="p-2">المنشأة</th><th className="p-2">المدعو</th><th className="p-2">الدور</th><th className="p-2">الحالة</th><th className="p-2">التاريخ</th><th className="p-2"></th></tr></thead>
            <tbody>
              {invRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.facility_name || r.facility_id}</td>
                  <td className="p-2">{r.invitee_name || r.invitee_identifier || r.invitee_id}</td>
                  <td className="p-2">{roleText(r.role)}</td>
                  <td className="p-2">{invitationStatusText(r.status)}</td>
                  <td className="p-2" dir="ltr">{r.createdAt ? String(r.createdAt).slice(0, 10) : '—'}</td>
                  <td className="p-2">
                    {canCancelInvitation(r) && (confirming === r.id
                      ? <span className="flex gap-2"><button disabled={busy} onClick={() => run(`/api/admin/admin/facilities/invitations/${encodeURIComponent(r.id)}/cancel`, 'سُحبت الدعوة')} className="px-3 py-1 rounded-lg border font-bold">تأكيد سحب الدعوة</button><button onClick={() => setConfirming(null)} className="px-3 py-1 rounded-lg border">تراجع</button></span>
                      : <button onClick={() => setConfirming(r.id)} className="px-3 py-1 rounded-lg border">سحب الدعوة</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        members === null ? <p>جارٍ التحميل…</p> : memRows.length === 0 ? <p>لا يوجد أعضاء مرتبطون بمنشآت.</p> : (
          <table className="w-full text-sm border">
            <thead><tr className="text-right"><th className="p-2">العضو</th><th className="p-2">الدور</th><th className="p-2">المنشأة</th><th className="p-2">الحالة</th><th className="p-2"></th></tr></thead>
            <tbody>
              {memRows.map((r) => (
                <tr key={r.user_id} className="border-t">
                  <td className="p-2">{r.full_name || r.user_id}</td>
                  <td className="p-2">{roleText(r.role)}</td>
                  <td className="p-2">{r.facility_name || r.facility_id}</td>
                  <td className="p-2">{r.suspended ? 'موقوف' : 'نشط'}</td>
                  <td className="p-2">
                    {confirming === r.user_id
                      ? <span className="flex gap-2"><button disabled={busy} onClick={() => run(`/api/admin/admin/facilities/memberships/${encodeURIComponent(r.user_id)}/end`, 'أُنهي ارتباط العضو بالمنشأة')} className="px-3 py-1 rounded-lg border font-bold">تأكيد إنهاء الارتباط</button><button onClick={() => setConfirming(null)} className="px-3 py-1 rounded-lg border">تراجع</button></span>
                      : <button onClick={() => setConfirming(r.user_id)} className="px-3 py-1 rounded-lg border">إنهاء الارتباط</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
