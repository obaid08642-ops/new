"use client";

import { useState } from "react";

export type Challenge = {
  id: string; title: string; desc?: string; icon?: string; rewardPoints: number;
  endDate?: string; joined: boolean; completed: boolean; progress: number; total: number;
};

export function LoyaltyChallengesClient({ initial, locale }: { initial: Challenge[]; locale: string }) {
  const ar = locale === "ar";
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(id: string) {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/patient/loyalty/challenges/${encodeURIComponent(id)}/join`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-challenge-${id}-${Date.now()}` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر الانضمام إلى التحدي، حاول لاحقاً" : "Could not join the challenge, try later"); return; }
      setJoined((s) => ({ ...s, [id]: true }));
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(null); }
  }

  const joinedCount = initial.filter((c) => c.joined || joined[c.id]).length;
  const completedCount = initial.filter((c) => c.completed).length;
  const earned = initial.filter((c) => c.completed).reduce((s, c) => s + c.rewardPoints, 0);

  return (
    <div>
      <p role="status">{joinedCount} {ar ? "منضم" : "joined"} · {completedCount} {ar ? "مكتمل" : "completed"} · {earned} {ar ? "نقطة مكتسبة" : "points earned"}</p>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {initial.map((c) => {
          const isJoined = c.joined || joined[c.id];
          const pct = c.total > 0 ? Math.min(100, Math.round((c.progress / c.total) * 100)) : 0;
          return (
            <li key={c.id}>
              <p><strong>{c.title}</strong> <span>+{c.rewardPoints}</span></p>
              {c.desc ? <p>{c.desc}</p> : null}
              <p>{ar ? "ينتهي" : "Ends"} {c.endDate || (ar ? "30 يونيو" : "June 30")}</p>
              {c.completed ? (
                <p role="status">{ar ? "مكتمل" : "Completed"}</p>
              ) : isJoined ? (
                <p role="status">{ar ? "جارٍ" : "In progress"} — {pct}% ({c.progress}/{c.total})</p>
              ) : (
                <button type="button" onClick={() => join(c.id)} disabled={busy === c.id}>{ar ? "انضم" : "Join"}</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
