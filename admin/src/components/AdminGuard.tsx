import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminApiError, adminFetch, adminMutation, type AdminSession } from '@/lib/admin-client';
import { getAdminCalendar, setAdminCalendar, type AdminCalendar } from '../utils/dates';
import { NAV_SECTIONS, permitted, requiredPermissionFor } from '@/lib/admin-nav';

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState<AdminCalendar>('gregory');
  const router = useRouter();

  useEffect(() => {
    setCalendar(getAdminCalendar());
    // Online presence: heartbeat every 60s so command-center counts admins.
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      adminFetch('/auth/heartbeat', { method: 'POST', body: JSON.stringify({ client: 'admin' }) }).catch(() => null);
    };
    beat();
    timer = setInterval(beat, 60000);
    const onVis = () => beat();
    document.addEventListener('visibilitychange', onVis);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useEffect(() => {
    let mounted = true;
    adminFetch<AdminSession>('/api/admin/admin/session')
      .then((data) => {
        if (mounted) setSession(data);
      })
      .catch((error) => {
        if (!mounted) return;
        if (error instanceof AdminApiError && [401, 403].includes(error.status)) {
          router.replace(`/login?returnTo=${encodeURIComponent(router.asPath)}`);
          return;
        }
        setSession(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  const permissionSet = useMemo(() => new Set(session?.permissions || []), [session]);
  const sections = useMemo(
    () => NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => permitted(item, permissionSet)) })).filter((section) => section.items.length),
    [permissionSet],
  );

  async function logout() {
    try {
      await adminMutation('/auth/logout', 'POST');
    } finally {
      router.replace('/login');
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">جاري التحقق من جلسة الإدارة…</div>;
  }
  if (!session) return null;

  const requiredPermission = requiredPermissionFor(router.pathname);
  if (requiredPermission && !permissionSet.has(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-slate-900">غير مصرح لك بعرض هذه الصفحة</h1>
          <p className="mt-2 text-sm text-slate-500">الصلاحية المطلوبة: {requiredPermission}</p>
          <Link href="/admin/command-center" className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-2.5 text-sm text-white">العودة لمركز القيادة</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <aside className="sticky top-0 h-screen w-72 shrink-0 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-6">
          <h1 className="text-2xl font-bold tracking-wide text-teal-300">نبض</h1>
          <p className="mt-1 text-sm text-slate-400">مركز التحكم المؤسسي</p>
          <p className="mt-3 truncate text-xs text-slate-500">{session.user.full_name || session.user.email || session.user.id}</p>
        </div>
        <nav className="h-[calc(100vh-180px)] overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <section key={section.title} className="mb-5">
              <h2 className="mb-1 px-3 text-[11px] font-bold tracking-wide text-slate-500">{section.title}</h2>
              {section.items.map((item) => {
                const active = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-1 flex rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'border-r-4 border-teal-300 bg-slate-800 font-bold text-teal-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">التقويم</span>
            <div className="flex gap-1 text-xs" role="group" aria-label="التقويم">
              {(['gregory', 'islamic-umalqura'] as AdminCalendar[]).map((cal) => (
                <button
                  key={cal}
                  onClick={() => { setAdminCalendar(cal); setCalendar(cal); router.reload(); }}
                  aria-pressed={calendar === cal}
                  className={`rounded px-2 py-1 ${calendar === cal ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {cal === 'gregory' ? 'ميلادي' : 'هجري'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-right text-sm text-red-200 hover:bg-slate-900">
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-slate-50">{children}</main>
    </div>
  );
};
