import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminApiError, adminFetch, adminMutation, type AdminSession } from '@/lib/admin-client';
import { useDrawer } from './useDrawer';
import { useMediaQuery } from './useMediaQuery';
import { useLegacyTableCards } from './useLegacyTableCards';
import { getAdminCalendar, setAdminCalendar, type AdminCalendar } from '../utils/dates';

type NavItem = { href: string; label: string; permission?: string };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'القيادة والمراقبة',
    items: [
      { href: '/admin/command-center', label: 'مركز القيادة الحي', permission: 'command.center.view' },
      { href: '/admin/health-dashboard', label: 'لوحة صحة النظام', permission: 'command.center.view' },
      // #960: the telemetry board (health, demand heatmap, command centre) was reachable only by URL.
      { href: '/admin/dashboard', label: 'لوحة القياس الحية', permission: 'command.center.view' },
      { href: '/admin/orders', label: 'دورة الطلبات', permission: 'order.read' },
      { href: '/admin/analytics-suite', label: 'التحليلات', permission: 'analytics.read' },
      { href: '/admin/analytics', label: 'التحليلات الداخلية', permission: 'analytics.read' },
      { href: '/admin/reports', label: 'التقارير التشغيلية', permission: 'analytics.read' },
      { href: '/admin/search', label: 'البحث الشامل', permission: 'user.read' },
      { href: '/admin/fraud-monitoring', label: 'مراقبة الاحتيال' },
    ],
  },
  {
    title: 'المزودون والاعتمادات',
    items: [
      { href: '/admin/provider-moderation', label: 'تدقيق واعتماد المزودين' },
      { href: '/admin/provider-audits', label: 'سجلات تدقيق المزودين' },
      { href: '/admin/insurance-queue', label: 'طابور الموافقات التأمينية' },
      { href: '/admin/insurance-companies', label: 'شركات التأمين المعتمدة' },
      { href: '/admin/pharmacy-procurement', label: 'توريدات ومخازن الأدوية' },
      { href: '/admin/nursing-portal', label: 'بوابة وإدارة التمريض' },
      { href: '/admin/support-tickets', label: 'تذاكر الدعم والشكاوى' },
      { href: '/admin/config-portal', label: 'بوابة الإعدادات العامة' },
    ],
  },
  {
    title: 'الماليات',
    items: [
      { href: '/admin/finance-suite', label: 'المالية والتسويات', permission: 'finance.read' },
      { href: '/admin/disputes', label: 'النزاعات المالية', permission: 'disputes.resolve' },
      { href: '/admin/payouts', label: 'اعتمادات السحب' },
      { href: '/admin/returns', label: 'طلبات الإرجاع والاسترداد' },
      { href: '/admin/financial-ledger', label: 'دفتر الأستاذ المالي' },
      { href: '/admin/commissions', label: 'العمولات والأستاذ', permission: 'finance.read' },
    ],
  },
  {
    title: 'العملاء والنمو',
    items: [
      { href: '/admin/crm', label: 'CRM 360', permission: 'crm.read' },
      { href: '/admin/segments', label: 'شرائح العملاء', permission: 'crm.read' },
      { href: '/admin/gdpr', label: 'خصوصية البيانات', permission: 'gdpr.manage' },
      { href: '/admin/legal-policies', label: 'السياسات القانونية', permission: 'gdpr.manage' },
      { href: '/admin/content-growth', label: 'المحتوى والنمو', permission: 'cms.edit' },
      { href: '/admin/home-curation', label: 'ترتيب الصفحة الرئيسية', permission: 'cms.edit' },
      { href: '/admin/search-intelligence', label: 'ذكاء وتحليلات البحث' },
      { href: '/admin/catalog-governance', label: 'حوكمة الكتالوج' },
      { href: '/admin/medicines-catalog', label: 'كتالوج الأدوية' },
      { href: '/admin/shortage-reports', label: 'بلاغات نقص الأدوية', permission: 'catalog.read' },
      { href: '/admin/image-suggestions', label: 'اقتراحات صور الأدوية', permission: 'catalog.read' },
      { href: '/admin/catalog-manager', label: 'كتالوج الأشعة والتحاليل والتمريض' },
      { href: '/admin/price-override-audit', label: 'تدقيق أسعار الأدوية' },
      { href: '/admin/community-moderation', label: 'إشراف المجتمع' },
      { href: '/admin/loyalty-config', label: 'إعدادات الولاء' },
      { href: '/admin/live-chat-console', label: 'الشات الحي' },
      { href: '/admin/appointments-oversight', label: 'إشراف المواعيد' },
      { href: '/admin/broadcast-monitor', label: 'مراقبة البث' },
      { href: '/admin/users-management', label: 'إدارة المستخدمين' },
      { href: '/admin/locations', label: 'إدارة المدن والأحياء' },
      { href: '/admin/impersonation', label: 'جلسات الدعم المقيّدة', permission: 'user.impersonate' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { href: '/admin/rbac', label: 'الأدوار والصلاحيات', permission: 'rbac.manage' },
      { href: '/admin/system-ops', label: 'تشغيل النظام', permission: 'ops.queues.manage' },
      // D-16 / #953: the backend PUT /admin/modules/:key is ADMIN-role only; ops.queues.manage is held by the admin roles and not by support/finance.
      { href: '/admin/module-switches', label: 'مفاتيح الخدمات', permission: 'ops.queues.manage' },
      { href: '/admin/notification-center', label: 'مركز الإشعارات والحملات', permission: 'ops.queues.manage' },
      // #994: AI controls were reachable only by URL.
      { href: '/admin/ai-control', label: 'التحكم في الذكاء الاصطناعي', permission: 'ops.queues.manage' },
      { href: '/admin/scheduled-reports', label: 'التقارير المجدولة', permission: 'reports.schedule.manage' },
      { href: '/admin/audit-logs', label: 'سجل التدقيق' },
      { href: '/admin/security', label: 'الأمان ومفاتيح الدخول' },
    ],
  },
];

/**
 * The signed-in admin's permissions, for pages that hide what the role cannot do (needs-review #907/#920/#922/#996):
 * the server still refuses; this only stops a read-only role from seeing buttons and sections that answer 403.
 */
const AdminPermissionsContext = createContext<Set<string> | null>(null);

/** True when the admin holds `permission`. Before the session loads (or outside the guard) nothing is granted. */
export function useCan(permission: string): boolean {
  const set = useContext(AdminPermissionsContext);
  return !!set && set.has(permission);
}

function permitted(item: NavItem, permissions: Set<string>) {
  // Single source of truth: nav visibility derives from the same route map,
  // so a link is never shown when its page would render a 403 panel.
  const required = item.permission ?? requiredPermissionFor(item.href);
  return !required || permissions.has(required);
}

// Per-page permission enforcement for direct-URL access (nav hiding alone is not enough).
// Vocabulary MUST match backend/src/common/permissions.ts exactly (dotted form).
// Underscore variants (command_center.view, scheduled_reports.manage) are never
// granted by the backend and previously locked those pages for every admin.
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/command-center': 'command.center.view',
  '/admin/fraud-monitoring': 'command.center.view',
  '/admin/health-dashboard': 'command.center.view',
  '/admin/dashboard': 'command.center.view',
  '/admin/orders': 'order.read',
  '/admin/order-detail': 'order.read',
  '/admin/broadcast-monitor': 'order.read',
  '/admin/appointments-oversight': 'appointment.read',
  '/admin/analytics-suite': 'analytics.read',
  '/admin/analytics': 'analytics.read',
  '/admin/search-intelligence': 'analytics.read',
  '/admin/finance-suite': 'finance.read',
  '/admin/financial-ledger': 'finance.read',
  '/admin/commissions': 'finance.read',
  '/admin/payouts': 'finance.payout.approve',
  '/admin/returns': 'finance.payout.approve',
  '/admin/disputes': 'disputes.resolve',
  '/admin/provider-moderation': 'facility.edit',
  '/admin/provider-audits': 'doctor.read',
  '/admin/insurance-queue': 'order.read',
  '/admin/insurance-companies': 'order.read',
  '/admin/nursing-portal': 'appointment.read',
  '/admin/pharmacy-procurement': 'pharmacy.inventory.read',
  '/admin/medicines-catalog': 'catalog.read',
  '/admin/catalog-manager': 'catalog.read',
  '/admin/catalog-governance': 'catalog.read',
  '/admin/price-override-audit': 'catalog.read',
  '/admin/shortage-reports': 'catalog.read',
  '/admin/crm': 'crm.read',
  '/admin/segments': 'crm.read',
  '/admin/support-tickets': 'crm.read',
  '/admin/live-chat-console': 'crm.read',
  '/admin/users-management': 'user.read',
  '/admin/gdpr': 'gdpr.manage',
  '/admin/legal-policies': 'gdpr.manage',
  '/admin/content-growth': 'cms.edit',
  '/admin/home-curation': 'cms.edit',
  '/admin/community-moderation': 'cms.edit',
  '/admin/loyalty-config': 'coupons.manage',
  '/admin/notification-center': 'ops.queues.manage',
  '/admin/system-ops': 'ops.queues.manage',
  '/admin/module-switches': 'ops.queues.manage',
  '/admin/config-portal': 'ops.queues.manage',
  '/admin/ai-control': 'ops.queues.manage',
  '/admin/audit-logs': 'data.export',
  '/admin/rbac': 'rbac.manage',
  '/admin/scheduled-reports': 'reports.schedule.manage',
  '/admin/impersonation': 'user.impersonate',
  // NOTE: /admin/security manages the admin's OWN passkeys — intentionally
  // unlisted so every authenticated admin keeps access to personal security.
};

// Exact match first, then longest-prefix (covers dynamic routes such as
// /admin/orders/[kind]/[id], which inherit their section permission).
function requiredPermissionFor(pathname: string): string | undefined {
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];
  let best: string | undefined;
  for (const prefix of Object.keys(ROUTE_PERMISSIONS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? ROUTE_PERMISSIONS[best] : undefined;
}

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState<AdminCalendar>('gregory');
  const router = useRouter();
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const [navOpen, setNavOpen] = useState(false);
  const drawerOpen = navOpen && !desktop;
  const drawerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const closeNav = React.useCallback(() => setNavOpen(false), []);
  useDrawer(drawerOpen, closeNav, drawerRef);
  useLegacyTableCards(mainRef, !loading && !!session);

  useEffect(() => {
    // Close the drawer after navigating.
    const close = () => setNavOpen(false);
    router.events.on('routeChangeComplete', close);
    return () => router.events.off('routeChangeComplete', close);
  }, [router.events]);

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
    return <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-white">جاري التحقق من جلسة الإدارة…</div>;
  }
  if (!session) return null;

  const requiredPermission = requiredPermissionFor(router.pathname);
  if (requiredPermission && !permissionSet.has(requiredPermission)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-slate-900">غير مصرح لك بعرض هذه الصفحة</h1>
          <p className="mt-2 text-sm text-slate-500">الصلاحية المطلوبة: {requiredPermission}</p>
          <Link href="/admin/command-center" className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-2.5 text-sm text-white">العودة لمركز القيادة</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-900 lg:flex-row" dir="rtl">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-950 pe-[max(12px,env(safe-area-inset-right))] ps-[max(12px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] text-white shadow lg:hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="فتح القائمة"
          aria-expanded={drawerOpen}
          aria-controls="admin-nav"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-800"
        >
          <span aria-hidden="true" className="flex flex-col gap-1.5"><i className="block h-0.5 w-5 bg-current" /><i className="block h-0.5 w-5 bg-current" /><i className="block h-0.5 w-5 bg-current" /></span>
        </button>
        <span className="py-3 text-lg font-bold text-teal-300">نبض</span>
      </header>
      {drawerOpen ? <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" aria-hidden="true" data-testid="nav-backdrop" onClick={closeNav} /> : null}
      <aside
        id="admin-nav"
        ref={drawerRef}
        tabIndex={-1}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label="القائمة الرئيسية"
        // Below 1024 px the closed drawer is out of the tab order and the accessibility tree.
        // Its slide-out offset is max-lg only: an `ltr:` offset outranks `lg:translate-x-0` and shifted the desktop sidebar over the page.
        inert={!desktop && !drawerOpen}
        className={`fixed inset-y-0 start-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col bg-slate-950 text-white ${drawerOpen ? 'shadow-2xl' : 'max-lg:shadow-none lg:shadow-2xl'} transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:max-w-none ${drawerOpen ? 'translate-x-0' : 'max-lg:translate-x-full max-lg:ltr:-translate-x-full'}`}
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-6 pb-6 pt-[max(24px,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-wide text-teal-300">نبض</h1>
            <p className="mt-1 text-sm text-slate-400">مركز التحكم المؤسسي</p>
            <p className="mt-3 truncate text-xs text-slate-500">{session.user.full_name || session.user.email || session.user.id}</p>
          </div>
          <button type="button" onClick={closeNav} aria-label="إغلاق القائمة" className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl hover:bg-slate-800 lg:hidden"><span aria-hidden="true">×</span></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {sections.map((section) => (
            <section key={section.title} className="mb-5">
              <h2 className="mb-1 px-3 text-[11px] font-bold tracking-wide text-slate-500">{section.title}</h2>
              {section.items.map((item) => {
                const active = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-1 flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'border-s-4 border-teal-300 bg-slate-800 font-bold text-teal-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-800 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">التقويم</span>
            <div className="flex gap-1 text-xs" role="group" aria-label="التقويم">
              {(['gregory', 'islamic-umalqura'] as AdminCalendar[]).map((cal) => (
                <button
                  key={cal}
                  onClick={() => { setAdminCalendar(cal); setCalendar(cal); router.reload(); }}
                  aria-pressed={calendar === cal}
                  className={`min-h-11 min-w-11 rounded px-2 py-1 ${calendar === cal ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {cal === 'gregory' ? 'ميلادي' : 'هجري'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={logout} className="min-h-11 w-full rounded-lg px-3 py-2 text-start text-sm text-red-200 hover:bg-slate-900">
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main ref={mainRef} className="min-w-0 flex-1 bg-slate-50"><AdminPermissionsContext.Provider value={permissionSet}>{children}</AdminPermissionsContext.Provider></main>
    </div>
  );
};
