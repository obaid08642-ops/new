"use client";

import { useState } from "react";

export type Reward = { id: string; title: string; description?: string; pointsRequired: number; icon?: string };

export function LoyaltyRewardsClient({ initialPoints, initialRewards, locale }: {
  initialPoints: number; initialRewards: Reward[]; locale: string;
}) {
  const ar = locale === "ar";
  const [points, setPoints] = useState(initialPoints);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(reward: Reward) {
    if (points < reward.pointsRequired || claiming) {
      if (points < reward.pointsRequired) setError(ar ? "رصيد غير كافٍ" : "Insufficient balance");
      return;
    }
    if (!window.confirm(ar ? `تأكيد الاستبدال — هل تريد استبدال ${reward.pointsRequired} نقطة مقابل ${reward.title}؟` : `Confirm redemption — redeem ${reward.pointsRequired} points for ${reward.title}?`)) return;
    setClaiming(reward.id); setMessage(null); setError(null);
    try {
      const res = await fetch(`/api/patient/loyalty/rewards/${encodeURIComponent(reward.id)}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-claim-${reward.id}-${Date.now()}` },
        body: "{}",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(ar ? "حدث خطأ أثناء استبدال المكافأة" : "Redemption failed"); return; }
      const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const coupon = typeof rec.coupon_code === "string" ? rec.coupon_code : "NAB-FREE";
      setPoints((p) => p - reward.pointsRequired);
      setMessage(ar ? `تم الاستبدال بنجاح — كود الكوبون: ${coupon}` : `Redeemed — coupon code: ${coupon}`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setClaiming(null); }
  }

  return (
    <div>
      <section aria-label={ar ? "رصيدك" : "Your balance"}>
        <p>{ar ? "رصيد نقاطك الحالي" : "Your current points balance"}: <strong>{points}</strong></p>
      </section>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <h2>{ar ? "المكافآت المتاحة" : "Available rewards"}</h2>
      <ul>
        {initialRewards.map((r) => {
          const affordable = points >= r.pointsRequired;
          return (
            <li key={r.id}>
              <p><strong>{r.title}</strong> — {r.pointsRequired} {ar ? "نقطة" : "points"}</p>
              {r.description ? <p>{r.description}</p> : null}
              <button type="button" onClick={() => claim(r)} disabled={claiming !== null}>
                {claiming === r.id ? (ar ? "جارٍ الاستبدال…" : "Redeeming…") : (ar ? "استبدال" : "Redeem")}
                {!affordable ? (ar ? " (رصيد غير كافٍ)" : " (insufficient)") : ""}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
