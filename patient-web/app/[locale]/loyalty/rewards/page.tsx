import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { LoyaltyRewardsClient } from "@/components-next/loyalty-rewards-client";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function text(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/** Parity with app loyalty/rewards: live balance + catalog + governed claim with coupon code. */
export default async function LoyaltyRewardsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const [accountRes, rewardsRes] = await Promise.all([
    callPatientApi("/loyalty/account", {}, token),
    callPatientApi("/loyalty/rewards", {}, token),
  ]);
  if (accountRes.status === 401 || rewardsRes.status === 401) redirect(`/${locale}/login`);
  if (!accountRes.ok || !rewardsRes.ok) notFound();
  const account = asRecord(await accountRes.json().catch(() => null));
  const arec = asRecord(account?.data) ?? account ?? {};
  const rpayload = asRecord(await rewardsRes.json().catch(() => null));
  const rlist = [rpayload?.data, rpayload?.rewards].find(Array.isArray);
  const rewards = (Array.isArray(rlist) ? rlist : []).flatMap((r) => {
    const o = asRecord(r);
    if (!o || typeof o.id !== "string") return [];
    return [{
      id: o.id,
      title: text(o, ["title", "title_ar"]) ?? o.id,
      description: text(o, ["description", "description_ar"]),
      pointsRequired: Number(o.points_required ?? 0) || 0,
      icon: text(o, ["icon"]),
    }];
  });
  return (
    <main className="main">
      <Link href={`/${locale}/loyalty`}>{ar ? "الولاء" : "Loyalty"}</Link>
      <h1>{ar ? "استبدال النقاط" : "Redeem points"}</h1>
      <LoyaltyRewardsClient
        initialPoints={Number(arec.points ?? 0) || 0}
        initialRewards={rewards}
        locale={locale}
      />
    </main>
  );
}
