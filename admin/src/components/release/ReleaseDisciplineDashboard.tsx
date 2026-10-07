import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAdminGuard } from '@/utils/api';
import { checkVersionFormat, effectiveAppEnforcement, type AppVersionEntry } from '@/lib/ops-control';

const APPS = ['patient', 'provider', 'driver', 'pharmacy', 'web'];

/**
 * Release-discipline overview backed exclusively by the real backend route:
 * - GET admin/config/app-versions  (same shape the config-portal apps tab reads)
 * Read-only: edits stay in /admin/config-portal so the save guard
 * (load-before-save) cannot be bypassed from here.
 */
export function ReleaseDisciplineDashboard() {
  const [apps, setApps] = useState<Record<string, AppVersionEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetchWithAdminGuard('/api/admin/admin/config/app-versions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { apps?: Record<string, AppVersionEntry> };
        if (!mounted) return;
        if (data?.apps && typeof data.apps === 'object') setApps(data.apps);
        setLoaded(true);
      } catch {
        if (mounted) setError('تعذر تحميل إصدارات التطبيقات.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const maintenanceOn = APPS.filter((app) => effectiveAppEnforcement(app, apps[app]).maintenance).length;
  const unconfigured = APPS.filter((app) => !effectiveAppEnforcement(app, apps[app]).configured).length;
  const badFormat = APPS.filter(
    (app) =>
      checkVersionFormat(apps[app]?.min_version) === 'invalid' ||
      checkVersionFormat(apps[app]?.latest_version) === 'invalid',
  ).length;

  const stat = (label: string, value: number, color = 'text-gray-900') => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span>عرض مراقبة فقط — التعديل من بوابة الإعدادات</span>
        <Link href="/admin/config-portal" className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white">
          بوابة الإعدادات
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل انضباط الإصدارات…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stat('تطبيقات تحت الصيانة', maintenanceOn, maintenanceOn > 0 ? 'text-red-600' : 'text-gray-900')}
            {stat('تطبيقات غير مضبوطة', unconfigured, unconfigured > 0 ? 'text-amber-600' : 'text-gray-900')}
            {stat('صيغ إصدارات غير قياسية', badFormat, badFormat > 0 ? 'text-amber-600' : 'text-gray-900')}
            {stat('إجمالي التطبيقات', APPS.length)}
          </div>

          {!loaded ? (
            <p className="rounded-2xl border bg-white p-10 text-center text-slate-400">لا بيانات إصدارات بعد</p>
          ) : (
            <div className="space-y-3">
              {APPS.map((app) => {
                const entry = apps[app];
                const enforcement = effectiveAppEnforcement(app, entry);
                const warn =
                  checkVersionFormat(entry?.min_version) === 'invalid' ||
                  checkVersionFormat(entry?.latest_version) === 'invalid';
                return (
                  <div key={app} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold" dir="ltr">
                        {app}
                      </div>
                      <div className="flex gap-2">
                        {enforcement.maintenance ? (
                          <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">صيانة</span>
                        ) : (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">يعمل</span>
                        )}
                        {!enforcement.configured ? (
                          <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                            غير مضبوط
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2" dir="ltr">
                      <div>
                        <span className="text-gray-500">min_version: </span>
                        <span className="font-mono font-bold">{entry?.min_version || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">latest_version: </span>
                        <span className="font-mono font-bold">{entry?.latest_version || '—'}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{enforcement.summary}</p>
                    {warn ? (
                      <p className="mt-1 text-xs font-bold text-amber-700">
                        تحذير: صيغة الإصدار غير قياسية (المتوقع X.Y.Z مثل 1.4.0).
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
