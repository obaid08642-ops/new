import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    // In a real production scenario, this checks the JWT and UserRole.ADMIN from API or Context
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');
    setPathname(window.location.pathname);

    if (!token || role !== 'admin') {
      setIsAuthenticated(false);
      window.location.assign('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">جاري التحقق من الصلاحيات المركزية...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-wider text-teal-400">NABDah</h1>
          <p className="text-sm text-slate-400 mt-1">Master Admin Control</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            <li>
              <Link href="/admin/dashboard" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/dashboard' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                مركز القيادة (Telemetry)
              </Link>
            </li>
            <li>
              <Link href="/admin/provider-moderation" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/provider-moderation' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                إدارة المزودين (Moderation)
              </Link>
            </li>
            <li>
              <Link href="/admin/config-portal" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/config-portal' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                بوابة الإعدادات (Config & SLA)
              </Link>
            </li>
            <li>
              <Link href="/admin/financial-ledger" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/financial-ledger' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                السجل المالي (Financial Ledger)
              </Link>
            </li>
            <li>
              <Link href="/admin/disputes" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/disputes' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                حل النزاعات (Disputes)
              </Link>
            </li>
            <li>
              <Link href="/admin/payouts" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/payouts' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                اعتمادات السحب (Payouts)
              </Link>
            </li>
            <li>
              <Link href="/admin/audit-logs" className={`block px-6 py-3 hover:bg-slate-800 hover:text-teal-400 transition-colors ${pathname === '/admin/audit-logs' ? 'bg-slate-800 text-teal-400 border-r-4 border-teal-400' : ''}`}>
                سجلات الأمن (Audit Logs)
              </Link>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">AD</div>
            <div>
              <p className="text-sm font-medium">المدير العام</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {children}
      </main>
    </div>
  );
};
