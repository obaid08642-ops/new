import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/api';
import ProviderFullDetail from '../../components/ProviderFullDetail';

const ROLE_LABELS: Record<string, string> = {
  patient: 'مريض',
  guest: 'زائر',
  doctor: 'طبيب',
  pharmacy: 'صيدلية',
  laboratory: 'معمل تحاليل',
  lab: 'معمل تحاليل',
  hospital: 'مستشفى',
  facility: 'منشأة طبية',
  radiology: 'أشعة',
  nursing: 'تمريض',
  ambulance: 'إسعاف',
  admin: 'أدمن',
  super_admin: 'أدمن رئيسي',
};

const ROLE_FILTERS = [
  { value: '', label: 'كل الأدوار' },
  { value: 'patient', label: 'المرضى' },
  { value: 'doctor', label: 'الأطباء' },
  { value: 'pharmacy', label: 'الصيدليات' },
  { value: 'laboratory', label: 'معامل التحاليل' },
  { value: 'hospital', label: 'المستشفيات / المنشآت' },
  { value: 'radiology', label: 'مراكز الأشعة' },
  { value: 'nursing', label: 'التمريض' },
  { value: 'ambulance', label: 'الإسعاف' },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Full user/provider file viewer ──────────────────────────────
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [userOverview, setUserOverview] = useState<any | null>(null);
  const [providerFile, setProviderFile] = useState<any | null>(null);
  const [activityDays, setActivityDays] = useState(30);

  const openUserFile = async (u: any, days: number = 30) => {
    const id = u.id || u._id;
    setViewUser(u);
    setActivityDays(days);
    setViewLoading(true);
    setUserOverview(null);
    setProviderFile(null);
    try {
      const ov = await apiFetch(`/admin/users/${id}/overview?days=${days}`).catch(() => null);
      setUserOverview(ov);
      const role = String(u.role || '').toLowerCase();
      if (role && role !== 'patient' && role !== 'guest' && role !== 'admin' && role !== 'super_admin') {
        // Provider account — pull the COMPLETE registration file (same record
        // the moderation screen reviews: every entered field + contract).
        const pf = await apiFetch(`/admin/providers/by-user/${id}`).catch(() => null);
        setProviderFile(pf);
      }
    } finally {
      setViewLoading(false);
    }
  };

  const reloadActivity = async (days: number) => {
    if (!viewUser) return;
    setActivityDays(days);
    const ov = await apiFetch(`/admin/users/${viewUser.id || viewUser._id}/overview?days=${days}`).catch(() => null);
    if (ov) setUserOverview(ov);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ limit: '200', sort: 'newest' });
      if (roleFilter) params.set('role', roleFilter);
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      const res = await apiFetch(`/admin/users?${params.toString()}`);
      setUsers(Array.isArray(res) ? res : res?.data || []);
      setTotal(res?.total ?? (Array.isArray(res) ? res.length : res?.data?.length ?? 0));
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل المستخدمين');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, searchTerm]);

  /** Suspend (reversible) — sets active=false + suspended=true in the DB. */
  const handleSuspend = async (u: any) => {
    const id = u.id || u._id;
    if (!confirm(`تعليق حساب «${u.full_name || u.phone}»؟ يمكن إعادة تفعيله لاحقاً.`)) return;
    setActionBusy(id);
    try {
      await apiFetch(`/admin/users/${id}/ban`, { method: 'POST' });
      await fetchUsers();
    } catch (err: any) {
      alert(`فشل التعليق: ${err?.message || ''}`);
    } finally {
      setActionBusy(null);
    }
  };

  /** Reactivate a suspended account. */
  const handleReactivate = async (u: any) => {
    const id = u.id || u._id;
    setActionBusy(id);
    try {
      await apiFetch(`/admin/users/${id}/unban`, { method: 'POST' });
      await fetchUsers();
    } catch (err: any) {
      alert(`فشل إعادة التفعيل: ${err?.message || ''}`);
    } finally {
      setActionBusy(null);
    }
  };

  /** Provider moderation from the full-file view (approve / reject / suspend). */
  const handleProviderAction = async (action: 'approve' | 'reject' | 'suspend') => {
    const accountId = providerFile?.account?.id || providerFile?.onboarding?.account_id;
    if (!accountId) return;
    let body: any = {};
    if (action === 'reject') {
      const reason = prompt('سبب الرفض (يظهر للمزود):');
      if (reason === null) return;
      body = { reason };
    } else if (action === 'suspend') {
      const reason = prompt('سبب الإيقاف:');
      if (reason === null) return;
      body = { reason };
    } else if (!confirm('اعتماد هذا المزود وتفعيل حسابه؟')) return;
    setActionBusy(accountId);
    try {
      await apiFetch(`/admin/providers/${accountId}/${action}`, { method: 'POST', body: JSON.stringify(body) });
      if (viewUser) await openUserFile(viewUser, activityDays);
      await fetchUsers();
    } catch (err: any) {
      alert(`فشل الإجراء: ${err?.message || ''}`);
    } finally {
      setActionBusy(null);
    }
  };

  /** PERMANENT delete — removes the user and their owned records from the DB. */
  const handleDelete = async (u: any) => {
    const id = u.id || u._id;
    const name = u.full_name || u.phone || id;
    if (!confirm(`⚠️ حذف نهائي!\nسيتم حذف «${name}» وبياناته من قاعدة البيانات نهائياً ولا يمكن التراجع.\n\nهل أنت متأكد تماماً؟`)) return;
    if (!confirm(`تأكيد أخير: حذف «${name}» نهائياً من الـ backend وقاعدة البيانات؟`)) return;
    setActionBusy(id);
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (err: any) {
      alert(`فشل الحذف: ${err?.message || ''}`);
    } finally {
      setActionBusy(null);
    }
  };

  /** Directory status: moderation-aware. A provider still awaiting approval is
   * NEVER shown as "نشط" — pending/rejected/suspended reflect the review state. */
  const statusOf = (u: any): { key: string; label: string; cls: string } => {
    const ps = String(u.provider_status || '').toLowerCase();
    if (u.suspended || u.active === false || ps === 'suspended') return { key: 'suspended', label: 'موقوف', cls: 'bg-red-100 text-red-800' };
    if (ps === 'pending' || ps === 'pending_admin_approval' || ps === 'email_unverified') return { key: 'pending', label: 'بانتظار الاعتماد', cls: 'bg-amber-100 text-amber-800' };
    if (ps === 'rejected') return { key: 'rejected', label: 'مرفوض', cls: 'bg-red-100 text-red-800' };
    if (ps === 'needs_changes') return { key: 'pending', label: 'يحتاج تعديلات', cls: 'bg-orange-100 text-orange-800' };
    return { key: 'active', label: 'نشط', cls: 'bg-green-100 text-green-800' };
  };

  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      const st = statusOf(u).key;
      if (statusFilter === 'active') return st === 'active';
      if (statusFilter === 'pending') return st === 'pending' || st === 'rejected';
      if (statusFilter === 'suspended') return st === 'suspended';
      return true;
    });
  }, [users, statusFilter]);

  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">إدارة المستخدمين ({total})</h1>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو البريد..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-64"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 bg-white"
          >
            {ROLE_FILTERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 bg-white"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="pending">بانتظار الاعتماد</option>
            <option value="suspended">موقوف / معلّق</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded">{errorMsg}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف / البريد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleUsers.map((u) => {
                const id = u.id || u._id;
                const st = statusOf(u);
                const suspended = st.key === 'suspended';
                const isAdmin = u.role === 'admin' || u.role === 'super_admin';
                return (
                  <tr key={id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {u.full_name || u.name || 'مستخدم'}
                      {u.is_guest && <span className="mr-2 text-xs text-gray-400">(زائر)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500" dir="ltr">
                      {u.phone || u.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {ROLE_LABELS[String(u.role || 'patient').toLowerCase()] || u.role || 'مريض'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin ? (
                        <span className="text-gray-400 text-xs">محمي</span>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => openUserFile(u)}
                            className="text-teal-700 hover:text-teal-900 font-bold"
                          >
                            عرض الملف
                          </button>
                          {suspended ? (
                            <button
                              onClick={() => handleReactivate(u)}
                              disabled={actionBusy === id}
                              className="text-green-600 hover:text-green-900 font-bold disabled:opacity-50"
                            >
                              إعادة تفعيل
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(u)}
                              disabled={actionBusy === id}
                              className="text-amber-600 hover:text-amber-900 font-bold disabled:opacity-50"
                            >
                              تعليق / إيقاف
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={actionBusy === id}
                            className="text-red-600 hover:text-red-900 font-bold disabled:opacity-50"
                          >
                            حذف نهائي
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا يوجد مستخدمين مطابقين.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ User / Provider full-file modal ═══ */}
      {viewUser && (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
          <div className="min-h-screen w-full">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-900 text-white">
              <h2 className="text-lg font-bold">
                ملف المستخدم: {viewUser.full_name || viewUser.name || viewUser.phone || viewUser.email || '—'}
                <span className="mr-3 text-xs bg-slate-700 px-2 py-1 rounded">{ROLE_LABELS[String(viewUser.role || 'patient').toLowerCase()] || viewUser.role}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewUser(null)} className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-2 rounded-lg">← عودة لإدارة المستخدمين</button>
                <button onClick={() => setViewUser(null)} className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg">✕ خروج</button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
              {viewLoading && <p className="text-center text-gray-400 py-8">جاري تحميل الملف الكامل…</p>}

              {!viewLoading && userOverview?.user && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-700 text-white px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                    <span>بيانات المستخدم والنشاط</span>
                    {/* Period filter for the activity block */}
                    <div className="flex gap-1">
                      {[{ d: 7, l: '٧ أيام' }, { d: 30, l: '٣٠ يوم' }, { d: 90, l: '٩٠ يوم' }, { d: 0, l: 'كل الفترات' }].map(p => (
                        <button key={p.d} onClick={() => reloadActivity(p.d)}
                          className={`text-xs px-2 py-1 rounded font-bold ${activityDays === p.d ? 'bg-teal-500 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}`}>
                          {p.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">الاسم الكامل</label><p className="text-gray-800">{userOverview.user.full_name || '—'}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">الهاتف</label><p className="text-gray-800 font-mono text-sm" dir="ltr">{userOverview.user.phone || '—'}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">البريد الإلكتروني</label><p className="text-gray-800 font-mono text-sm">{userOverview.user.email || '—'}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">المدينة</label><p className="text-gray-800">{userOverview.user.city || '—'}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">الحالة</label><p className="text-gray-800">{statusOf({ ...userOverview.user, provider_status: userOverview.provider_status }).label}{userOverview.user.verified ? ' — موثّق' : ''}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">تاريخ التسجيل</label><p className="text-gray-800 font-mono text-sm">{userOverview.user.createdAt ? String(userOverview.user.createdAt).slice(0, 19).replace('T', ' ') : '—'}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">الأجهزة المسجلة</label><p className="text-gray-800">{userOverview.devices?.registered_count ?? 0}</p></div>
                    <div className="space-y-1"><label className="text-sm font-bold text-gray-500">آخر دخول</label><p className="text-gray-800 font-mono text-sm">{userOverview.user.last_login_at ? String(userOverview.user.last_login_at).slice(0, 19).replace('T', ' ') : '—'}</p></div>
                    {userOverview.user.specialty && <div className="space-y-1"><label className="text-sm font-bold text-gray-500">التخصص</label><p className="text-gray-800">{userOverview.user.specialty}</p></div>}
                    {userOverview.user.license_number && <div className="space-y-1"><label className="text-sm font-bold text-gray-500">رقم الترخيص</label><p className="text-gray-800 font-mono text-sm">{userOverview.user.license_number}</p></div>}
                  </div>

                  {/* Activity stats within the selected period */}
                  <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-slate-800">{userOverview.activity?.appointments_total ?? 0}</p>
                      <p className="text-xs text-slate-500 font-bold">المواعيد ({activityDays ? `${activityDays} يوم` : 'كل الفترات'})</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-slate-800">{userOverview.activity?.sos_total ?? 0}</p>
                      <p className="text-xs text-slate-500 font-bold">بلاغات طوارئ</p>
                    </div>
                    {providerFile && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-slate-800">{userOverview.activity?.provider_requests_total ?? 0}</p>
                        <p className="text-xs text-slate-500 font-bold">طلبات الخدمة</p>
                      </div>
                    )}
                    {Object.keys(userOverview.activity?.appointments_by_status || {}).length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 font-bold mb-1">المواعيد حسب الحالة</p>
                        {Object.entries(userOverview.activity.appointments_by_status).map(([k, v]: [string, any]) => (
                          <p key={k} className="text-xs text-slate-600 flex justify-between"><span>{k}</span><span className="font-bold">{v}</span></p>
                        ))}
                      </div>
                    )}
                    {Object.keys(userOverview.activity?.provider_requests_by_status || {}).length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 font-bold mb-1">الطلبات حسب الحالة</p>
                        {Object.entries(userOverview.activity.provider_requests_by_status).map(([k, v]: [string, any]) => (
                          <p key={k} className="text-xs text-slate-600 flex justify-between"><span>{k}</span><span className="font-bold">{v}</span></p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent orders/appointments */}
                  {(userOverview.activity?.recent_appointments || []).length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-sm font-bold text-gray-500 mb-2">أحدث المواعيد / الطلبات</p>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-2 py-1.5 text-right">النوع</th><th className="px-2 py-1.5 text-right">الحالة</th><th className="px-2 py-1.5 text-right">السعر</th><th className="px-2 py-1.5 text-right">التاريخ</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {userOverview.activity.recent_appointments.slice(0, 10).map((a: any) => (
                              <tr key={a.id}>
                                <td className="px-2 py-1.5">{a.type || '—'}</td>
                                <td className="px-2 py-1.5 font-bold">{a.status || a.state || '—'}</td>
                                <td className="px-2 py-1.5" dir="ltr">{a.price ?? a.fee ?? '—'}</td>
                                <td className="px-2 py-1.5 font-mono" dir="ltr">{String(a.createdAt || '').slice(0, 10)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {(userOverview.activity?.recent_provider_requests || []).length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-sm font-bold text-gray-500 mb-2">أحدث طلبات الخدمة (كمزود)</p>
                      <div className="space-y-1">
                        {userOverview.activity.recent_provider_requests.slice(0, 10).map((r: any) => (
                          <div key={r.id} className="flex justify-between items-center border border-gray-200 rounded-lg px-3 py-2 text-xs">
                            <span className="font-bold text-gray-700">{r.summary_ar || r.type || '—'}</span>
                            <span className="text-gray-500">{r.status}</span>
                            <span className="font-mono" dir="ltr">{r.amount_total ? `${r.amount_total} ${r.currency || 'SAR'}` : ''} {String(r.createdAt || '').slice(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient family */}
                  {userOverview.family?.members?.length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-sm font-bold text-gray-500 mb-2">أفراد العائلة ({userOverview.family.members.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {userOverview.family.members.map((m: any, i: number) => (
                          <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-1 font-bold">
                            {m.name || 'فرد'}{m.relation ? ` — ${m.relation}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!viewLoading && providerFile && (
                <>
                  <div className="sticky top-[72px] z-10 flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                    <span className="text-sm font-bold text-gray-500 ml-2">إجراءات الاعتماد:</span>
                    <button onClick={() => handleProviderAction('approve')} disabled={!!actionBusy}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50">✓ اعتماد</button>
                    <button onClick={() => handleProviderAction('reject')} disabled={!!actionBusy}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50">✕ رفض</button>
                    <button onClick={() => handleProviderAction('suspend')} disabled={!!actionBusy}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50">⏸ إيقاف / تعليق</button>
                  </div>
                  <ProviderFullDetail detail={providerFile} accountId={providerFile.account?.id || providerFile.onboarding?.account_id} />
                </>
              )}

              {!viewLoading && !userOverview && !providerFile && (
                <p className="text-center text-gray-500 py-8">تعذر تحميل تفاصيل هذا المستخدم.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
