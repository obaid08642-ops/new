import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { SecurityForms } from "@/components-next/security-forms";

/** Security settings (parity #28 completion): re-auth password + toggles. */
export default async function SettingsSecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/users/me/security-settings", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const settings: any = res.ok ? await res.json().catch(() => ({})) : {};

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><ShieldCheck size={18} aria-hidden="true" /> الأمان</h1>
      <SecurityForms biometric={settings?.biometric === true} twoFactor={settings?.two_factor === true} />
      <p className="mt-3 text-xs text-black/50">تغيير كلمة المرور يتحقق من الحالية عبر bcrypt على الخادم قبل التدوير.</p>
    </main>
  );
}
