import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { adminFetch } from '@/lib/admin-client';

/**
 * #1235: the admin bell. Shows the signed-in admin's unread urgent alerts (GET /admin/urgent-alerts/unread-count,
 * only the kinds their permissions cover) and opens the inbox. Refreshes every minute while the tab is visible,
 * on every page change and when the inbox marks alerts read (`nabd:alerts-read`).
 */
export function AlertsBell({ className = '' }: { className?: string }) {
  const [unread, setUnread] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const pull = () => {
      if (document.visibilityState !== 'visible') return;
      adminFetch<{ unread: number }>('/api/admin/admin/urgent-alerts/unread-count')
        .then((r) => { if (alive) setUnread(Number(r?.unread || 0)); })
        .catch(() => { if (alive) setUnread(null); });
    };
    pull();
    const timer = window.setInterval(pull, 60000);
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('nabd:alerts-read', pull);
    router.events.on('routeChangeComplete', pull);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
      window.removeEventListener('nabd:alerts-read', pull);
      router.events.off('routeChangeComplete', pull);
    };
  }, [router.events]);

  const count = unread ?? 0;
  const label = count > 0 ? `التنبيهات العاجلة: ${count.toLocaleString('ar-SA-u-ca-gregory')} غير مقروء` : 'التنبيهات العاجلة';
  return (
    <Link href="/admin/alerts" aria-label={label} title={label} className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-800 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {count > 0 ? (
        <span data-testid="alerts-badge" className="absolute -top-0.5 end-0 min-w-5 rounded-full border border-rose-200 bg-rose-50 px-1 text-center text-[11px] font-bold leading-5 text-rose-700">
          {count > 99 ? '99+' : count.toLocaleString('ar-SA-u-ca-gregory')}
        </span>
      ) : null}
    </Link>
  );
}
