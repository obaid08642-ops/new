import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Baby } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { MaternityForms } from "@/components-next/maternity-forms";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Maternity hub (parity #17): server-fetched profile + real logging forms
 * (setup / kicks / contractions / infant growth). All writes go through BFF.
 */
export default async function MaternityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/maternity/profile", {}, token);
  const profile: any = res.ok ? await res.json().catch(() => null) : null;

  const dueDate = typeof profile?.due_date === "string" ? profile.due_date.slice(0, 10) : "";
  const week = Number(profile?.current_week ?? NaN);

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">الحمل والأمومة</h1>
      <Card>
        {profile && dueDate ? (
          <p className="text-sm">
            {profile.is_pregnant
              ? `حمل نشط — الأسبوع ${Number.isFinite(week) ? week : "—"} · الموعد المتوقع: ${dueDate}`
              : "لا يوجد حمل نشط — يمكنك تتبع الدورة أو بدء متابعة حمل جديد."}
          </p>
        ) : (
          <p className="text-sm">لم تُنشئ ملف حمل بعد — ابدأ بتحديد الموعد المتوقع للولادة.</p>
        )}
      </Card>
      <MaternityForms isPregnant={Boolean(profile?.is_pregnant)} knownDueDate={dueDate} locale={locale} />
      <p className="mt-3 text-xs text-black/50"><Baby size={12} aria-hidden="true" /> جميع القياسات تُحفظ في سجلك الصحي عبر الخادم.</p>
    </main>
  );
}
