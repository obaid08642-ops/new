import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { SettingsForms } from "@/components-next/settings-forms";

/** Account settings (parity #28): profile edit + language sync + notif prefs. */
export default async function SettingsEditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const [profileRes, notifRes] = await Promise.all([
    callPatientApi("/users/me/display", {}, token),
    callPatientApi("/users/me/notification-settings", {}, token),
  ]);
  if (profileRes.status === 401 || notifRes.status === 401) redirect(`/${locale}/login`);
  const profile: any = profileRes.ok ? await profileRes.json().catch(() => null) : null;
  const notif: any = notifRes.ok ? await notifRes.json().catch(() => ({})) : {};

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Settings size={18} aria-hidden="true" /> الإعدادات</h1>
      <SettingsForms
        profile={{
          display_name: typeof profile?.display_name === "string" ? profile.display_name : undefined,
          locale: typeof profile?.locale === "string" ? profile.locale : undefined,
          gender: typeof profile?.gender === "string" ? profile.gender : undefined,
          birth_date: typeof profile?.birth_date === "string" ? profile.birth_date.slice(0, 10) : undefined,
          height_cm: Number(profile?.height_cm) > 0 ? Number(profile.height_cm) : undefined,
          weight_kg: Number(profile?.weight_kg) > 0 ? Number(profile.weight_kg) : undefined,
        }}
        notif={{ channels: notif?.channels, categories: notif?.categories }}
      />
      <p className="mt-3 text-xs text-black/50">تغيير كلمة المرور والتحقق بخطوتين متاحان من شاشة الأمان في التطبيق.</p>
    </main>
  );
}
