import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { NutritionForms } from "@/components-next/nutrition-forms";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Nutrition hub (parity #18): server-fetched profile + daily summary, real
 * writes for meals / water / profile targets through the BFF.
 */
export default async function NutritionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const [profileRes, summaryRes] = await Promise.all([
    callPatientApi("/nutrition/profile", {}, token),
    callPatientApi("/nutrition/daily-summary", {}, token),
  ]);
  const profile: any = profileRes.ok ? await profileRes.json().catch(() => null) : null;
  const summary: any = summaryRes.ok ? await summaryRes.json().catch(() => null) : null;

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2">التغذية</h1>
      <Card>
        <dl className="text-sm">
          <div className="flex justify-between py-1"><dt>الهدف</dt><dd>{profile?.goal ? String(profile.goal).replaceAll("_", " ") : "غير محدد"}</dd></div>
          <div className="flex justify-between py-1"><dt>الوزن الحالي</dt><dd>{profile?.weight_kg ? `${profile.weight_kg} كجم` : "—"}</dd></div>
          <div className="flex justify-between py-1"><dt>الوزن المستهدف</dt><dd>{profile?.target_weight_kg ? `${profile.target_weight_kg} كجم` : "—"}</dd></div>
          <div className="flex justify-between py-1 font-bold"><dt>سعرات اليوم</dt><dd>{Number(summary?.totals?.calories ?? summary?.calories ?? 0)}</dd></div>
        </dl>
      </Card>
      <NutritionForms />
      <p className="mt-3 text-xs text-black/50">القيم تُتحقق على الخادم — لا يُحتسب أي شيء في المتصفح.</p>
    </main>
  );
}
