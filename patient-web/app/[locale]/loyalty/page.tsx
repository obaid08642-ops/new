import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { LoyaltyActions } from "@/components-next/loyalty-actions";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Loyalty hub (parity #22): server-fetched account, rewards, challenges,
 * leaderboard and referral code; join/claim/apply are real BFF posts.
 */
export default async function LoyaltyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const [accountRes, rewardsRes, challengesRes, leaderboardRes, referralRes] = await Promise.all([
    callPatientApi("/loyalty/account", {}, token),
    callPatientApi("/loyalty/rewards", {}, token),
    callPatientApi("/loyalty/challenges", {}, token),
    callPatientApi("/loyalty/leaderboard", {}, token),
    callPatientApi("/referrals/my", {}, token),
  ]);
  if ([accountRes, rewardsRes, challengesRes].some((r) => r.status === 401)) redirect(`/${locale}/login`);
  const account: any = accountRes.ok ? await accountRes.json().catch(() => null) : null;
  const rewards: any = rewardsRes.ok ? await rewardsRes.json().catch(() => null) : [];
  const challenges: any = challengesRes.ok ? await challengesRes.json().catch(() => null) : [];
  const leaderboard: any = leaderboardRes.ok ? await leaderboardRes.json().catch(() => null) : [];
  const referral: any = referralRes.ok ? await referralRes.json().catch(() => null) : null;
  const list = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.rewards) ? value.rewards : Array.isArray(value?.challenges) ? value.challenges : Array.isArray(value?.leaderboard) ? value.leaderboard : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Trophy size={18} aria-hidden="true" /> برنامج الولاء</h1>
      <Card>
        <dl className="text-sm">
          <div className="flex justify-between py-1 font-bold"><dt>رصيد النقاط</dt><dd>{Number(account?.points ?? account?.balance ?? 0)}</dd></div>
          <div className="flex justify-between py-1"><dt>كود الإحالة الخاص بك</dt><dd className="font-mono text-xs">{referral?.code ?? referral?.referral_code ?? "—"}</dd></div>
        </dl>
      </Card>

      <h2 className="mt-4 text-lg font-bold">المكافآت</h2>
      <LoyaltyActions mode="rewards" items={list(rewards).slice(0, 12).map((r: any) => ({ id: String(r.id), label: String(r.name_ar || r.name || r.id).slice(0, 80), cost: Number(r.cost_points ?? r.points ?? 0) }))} />

      <h2 className="mt-4 text-lg font-bold">التحديات</h2>
      <LoyaltyActions mode="challenges" items={list(challenges).slice(0, 12).map((c: any) => ({ id: String(c.id), label: String(c.name_ar || c.title || c.name || c.id).slice(0, 80), cost: 0 }))} />

      <h2 className="mt-4 text-lg font-bold">لوحة الصدارة</h2>
      <Card>{leaderboard.length === 0 && list(leaderboard).length === 0 ? <p className="text-sm">لا بيانات بعد.</p> : (
        <ol className="text-sm list-decimal pr-5">{list(leaderboard).slice(0, 10).map((entry: any, index: number) => (
          <li key={`${entry.id ?? index}-${index}`} className="py-1">{String(entry.display_name || entry.name || entry.user_id || "—").slice(0, 60)} — {Number(entry.points ?? entry.score ?? 0)} نقطة</li>
        ))}</ol>
      )}</Card>

      <p className="mt-3 text-xs text-black/50">استبدال المكافآت وانضمام التحديات يتم على الخادم ويراجع رصيدك لحظيًا.</p>
    </main>
  );
}
