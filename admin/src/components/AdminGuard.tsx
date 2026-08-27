import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

/**
 * Central admin shell (wraps every /admin/* route via _app.tsx).
 * M5: sidebar now covers ALL operational pages — previously only 7 links
 * existed and several pages self-wrapped causing double sidebars.
 */

const NAV_SECTIONS: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: 'القيادة والمراقبة',
    items: [
      { href: '/admin/dashboard', label: 'مركز القيادة', icon: '' },
      { href: '/admin/sos-monitor', label: 'مراقبة الطوارئ SOS', icon: '' },
      { href:'/admin/fraud-monitoring', label:'مراقبة الاحتيال', icon:'' },
    ],
  },
  {
    title: 'المالية',
    items: [
      { href: '/admin/payouts', label: 'اعتمادات السحب', icon: '' },
      { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },
      { href: '/admin/insurance-companies', label: 'شركات التأمين', icon: '' },
      { href: '/admin/commissions', label: 'العمولات والأستاذ', icon: '' },
      { href: '/admin/financial-ledger', label: 'دفتر الأستاذ المالي', icon: '' },
      { href:'/admin/disputes', label:'النزاعات المالية', icon:'' },
    ],
  },
  {
    title: 'التشغيل',
    items: [
      { href: '/admin/users-management', label: 'إدارة المستخدمين', icon: '' },
      { href: '/admin/provider-moderation', label: 'اعتماد المزودين', icon: '' },
      { href: '/admin/provider-audits', label: 'تدقيق المزودين', icon: '' },
      { href: '/admin/ambulance-fleet', label: 'أساطيل الإسعاف', icon: '' },
      { href: '/admin/nursing-portal', label: 'بوابة التمريض', icon: '' },
      { href: '/admin/catalog-manager', label: 'إدارة كتالوج الخدمات', icon: '' },
      { href: '/admin/medicines-catalog', label: 'كتالوج الأدوية', icon: '' },
      { href: '/admin/pharmacy-procurement', label: 'طلبات توريد الصيدليات', icon: '' },
      { href: '/admin/support-tickets', label: 'تذاكر الدعم', icon: '' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { href: '/admin/rbac', label: 'الأدوار والصلاحيات', icon: '' },
      { href: '/admin/security', label: 'الأمان ومفاتيح الدخول', icon: '' },
      { href:'/admin/config-portal', label:'إعدادات المنصة', icon:'' },
      { href: '/admin/audit-logs', label: 'سجل التدقيق', icon: '' },
    ],
  },
];

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');

    if (!token || role !== 'admin') {
      setIsAuthenticated(false);
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">جاري التحقق من الصلاحيات المركزية...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-wider text-teal-400">نبض</h1>
          <p className="text-sm text-slate-400 mt-1">لوحة التحكم الإدارية</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="text-[11px] font-bold text-slate-500 px-4 mb-1">{sec.title}</div>
              <ul className="space-y-1">
                {sec.items.map((item) => {
                  const active = router.pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-slate-800 text-teal-400 font-bold border-r-4 border-teal-400'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-teal-400'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => {
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_role');
              router.push('/login');
            }}
            className="w-full text-right px-4 py-2 rounded-lg text-sm text-red-300 hover:bg-slate-800 transition-colors"
          >
             تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {children}
      </main>
    </div>
  );
};
