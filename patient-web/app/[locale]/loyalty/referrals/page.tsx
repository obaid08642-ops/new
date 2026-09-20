import { VectorLoyalty } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" } as React.CSSProperties}><div style={{ minWidth: 0 }}><Link href={`/${locale}/loyalty`} style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as React.CSSProperties}>{ar ? "الولاء" : "Loyalty"}</Link><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "برنامج المكافآت والإحالة" : "Rewards & referral program"}</h1></div><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorLoyalty size={48} aria-hidden="true" /></span><span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "ادعُ أصدقاءك واكسبا نقاط نبض معاً" : "Invite friends and earn Nabd points together"}</p>
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
