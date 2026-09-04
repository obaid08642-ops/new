import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminApiError, adminFetch, adminMutation, type AdminSession } from '@/lib/admin-client';

type NavItem = { href: string; label: string; permission?: string };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'القيادة والمراقبة',
    items: [
      { href: '/admin/command-center', label: 'مركز القيادة الحي', permission: 'command_center.view' },
      { href: '/admin/orders', label: 'دورة الطلبات', permission: 'order.read' },
      { href: '/admin/analytics-suite', label: 'التحليلات', permission: 'analytics.read' },
      { href: '/admin/sos-monitor', label: 'مراقبة الطوارئ SOS' },
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
      { href: '/admin/ambulance-fleet', label: 'أسطول مركبات الإسعاف' },
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
      { href: '/admin/financial-ledger', label: 'دفتر الأستاذ المالي' },
    ],
  },
  {
    title: 'العملاء والنمو',
    items: [
      { href: '/admin/crm', label: 'CRM 360', permission: 'crm.read' },
      { href: '/admin/segments', label: 'شرائح العملاء', permission: 'crm.read' },
      { href: '/admin/gdpr', label: 'خصوصية البيانات', permission: 'gdpr.manage' },
      { href: '/admin/content-growth', label: 'المحتوى والنمو', permission: 'cms.edit' },
      { href: '/admin/home-curation', label: 'ترتيب الصفحة الرئيسية', permission: 'cms.edit' },
      { href: '/admin/search-intelligence', label: 'ذكاء وتحليلات البحث' },
      { href: '/admin/catalog-governance', label: 'حوكمة الكتالوج' },
      { href: '/admin/price-override-audit', label: 'تدقيق أسعار الأدوية' },
      { href: '/admin/users-management', label: 'إدارة المستخدمين' },
      { href: '/admin/impersonation', label: 'جلسات الدعم المقيّدة', permission: 'user.impersonate' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { href: '/admin/rbac', label: 'الأدوار والصلاحيات', permission: 'rbac.manage' },
      { href: '/admin/system-ops', label: 'تشغيل النظام', permission: 'ops.queues.manage' },
      { href: '/admin/scheduled-reports', label: 'التقارير المجدولة', permission: 'scheduled_reports.manage' },
      { href: '/admin/audit-logs', label: 'سجل التدقيق' },
      { href: '/admin/security', label: 'الأمان ومفاتيح الدخول' },
    ],
  },
];

function permitted(item: NavItem, permissions: Set<string>) {
  return !item.permission || permissions.has(item.permission);
}

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    adminFetch<AdminSession>('/session')
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
        <div className="border-t border-slate-800 p-4">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-right text-sm text-red-200 hover:bg-slate-900">
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-slate-50">{children}</main>
    </div>
  );
};
