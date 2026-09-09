import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { LoyaltyReferralsClient } from "@/components-next/loyalty-referrals-client";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app loyalty/referrals: real code + stats + invites + apply, GET/POST /referrals. */
export default async function LoyaltyReferralsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/referrals/my", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const rec = asRecord(payload?.data) ?? payload ?? {};
  const stats = asRecord(rec.stats) ?? {};
  const invitesRaw = Array.isArray(rec.invites) ? rec.invites : [];
  const invites = invitesRaw.flatMap((inv) => {
    const o = asRecord(inv);
    if (!o || typeof o.id === "undefined") return [];
    const status = typeof o.status === "string" ? o.status : "registered";
    const rewarded = status === "rewarded";
    return [{
      id: String(o.id),
      name: typeof o.name === "string" && o.name ? o.name : (ar ? "مدعو" : "Invitee"),
      label: rewarded ? (ar ? "حجز مكتمل — تمت إضافة النقاط" : "Completed booking — points added") : (ar ? "تم التسجيل — في انتظار أول حجز" : "Registered — awaiting first booking"),
      date: typeof o.created_at === "string" ? o.created_at : "",
      reward: rewarded ? (ar ? "+100 نقطة" : "+100 points") : (ar ? "+100 نقطة معلقة" : "+100 pending"),
    }];
  });
  return (
    <main className="main">
      <Link href={`/${locale}/loyalty`}>{ar ? "الولاء" : "Loyalty"}</Link>
      <h1>{ar ? "برنامج المكافآت والإحالة" : "Rewards & referral program"}</h1>
      <p>{ar ? "ادعُ أصدقاءك واكسبا نقاط نبض معاً" : "Invite friends and earn Nabd points together"}</p>
      <LoyaltyReferralsClient
        initial={{
          code: typeof rec.code === "string" ? rec.code : "",
          earned: Number(stats.earned_points ?? 0) || 0,
          total: Number(stats.total ?? 0) || 0,
          invites,
        }}
        locale={locale}
      />
    </main>
  );
}
