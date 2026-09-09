"use client";

import { useState } from "react";

export type ReferralData = {
  code: string; earned: number; total: number;
  invites: { id: string; name: string; label: string; date: string; reward: string }[];
};

export function LoyaltyReferralsClient({ initial, locale }: { initial: ReferralData; locale: string }) {
  const ar = locale === "ar";
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    if (!initial.code) return;
    try {
      await navigator.clipboard.writeText(initial.code);
      setMessage(ar ? "تم نسخ كود الإحالة" : "Referral code copied");
    } catch { setError(ar ? "تعذر النسخ" : "Could not copy"); }
  }

  async function share() {
    if (!initial.code) return;
    const text = ar
      ? `انضم لنبض بكودي ${initial.code} واكسب 50 نقطة — https://nabdahplus.com/invite`
      : `Join Nabd with my code ${initial.code} and earn 50 points — https://nabdahplus.com/invite`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setMessage(ar ? "تمت المشاركة" : "Shared");
    } catch { /* dismissed */ }
  }

  async function apply() {
    const c = applyCode.trim();
    if (!c || applying) return;
    setApplying(true); setMessage(null); setError(null);
    try {
      const res = await fetch("/api/patient/referrals/apply", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-referral-${Date.now()}` },
        body: JSON.stringify({ code: c }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر التطبيق — الكود غير صالح" : "Could not apply — invalid code"); return; }
      setApplyCode("");
      setMessage(ar ? "تم تطبيق كود الإحالة" : "Referral code applied");
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setApplying(false); }
  }

  return (
    <div>
      <section aria-label={ar ? "كيف يعمل البرنامج؟" : "How does it work?"}>
        <p>{ar ? "أهدِ صديقك 50 نقطة واكسب 100 نقطة عند أول حجز مكتمل له." : "Gift your friend 50 points and earn 100 on their first completed booking."}</p>
      </section>
      <section aria-label={ar ? "كود الإحالة الخاص بك" : "Your referral code"}>
        <h2>{ar ? "كود الإحالة الخاص بك" : "Your referral code"}</h2>
        <p><strong>{initial.code || "—"}</strong></p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={copy} disabled={!initial.code}>{ar ? "نسخ الكود" : "Copy code"}</button>
          <button type="button" onClick={share} disabled={!initial.code}>{ar ? "مشاركة الكود" : "Share code"}</button>
        </div>
      </section>
      <section aria-label={ar ? "لديك كود من صديق؟" : "Have a friend's code?"}>
        <h2>{ar ? "لديك كود من صديق؟" : "Have a friend's code?"}</h2>
        <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <input value={applyCode} onChange={(e) => setApplyCode(e.target.value)} placeholder={ar ? "أدخل كود الإحالة" : "Enter referral code"}
            autoCapitalize="characters" maxLength={32} />
          <button type="submit" disabled={applying || !applyCode.trim()}>{ar ? "تطبيق الكود" : "Apply code"}</button>
        </form>
        <p>{ar ? "متاح للحسابات الجديدة قبل أول حجز مكتمل." : "Available for new accounts before the first completed booking."}</p>
      </section>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <section aria-label={ar ? "الإحصائيات" : "Stats"}>
        <ul>
          <li>{initial.earned} {ar ? "نقطة / النقاط المكتسبة" : "points / earned"}</li>
          <li>{initial.total} {ar ? "صديق / إجمالي المدعوين" : "friends / invited"}</li>
        </ul>
      </section>
      <section aria-label={ar ? "سجل الإحالات والمدعوين" : "Referral history"}>
        <h2>{ar ? "سجل الإحالات والمدعوين" : "Referral history"}</h2>
        {initial.invites.length === 0 ? (
          <p role="status">{ar ? "لا توجد إحالات بعد" : "No referrals yet"}</p>
        ) : (
          <ul>
            {initial.invites.map((ref) => (
              <li key={ref.id}><strong>{ref.name}</strong> — {ref.label} — {ref.date} — {ref.reward}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
