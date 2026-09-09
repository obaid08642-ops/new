"use client";

import Link from "next/link";
import { useState } from "react";

export type Program = {
  id: string; title: string; duration?: string;
  completedSessions: number; totalSessions: number;
  nextTitle?: string; nextDate?: string; nextTime?: string;
  milestoneReward?: string; rewardDesc?: string;
  sessions: { id: string | number; title: string; completed: boolean }[];
};

export function ProgramsActiveClient({ initial, locale }: { initial: Program[]; locale: string }) {
  const ar = locale === "ar";
  const [programs, setPrograms] = useState(initial);
  const [activeTab, setActiveTab] = useState(initial[0]?.id ?? "diabetes");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = programs.find((p) => p.id === activeTab) ?? programs[0];
  if (!selected) return <p role="status">{ar ? "لا توجد برامج نشطة" : "No active programs"}</p>;
  const pct = selected.totalSessions > 0 ? Math.round((selected.completedSessions / selected.totalSessions) * 100) : 0;

  async function complete(sessionId: string | number) {
    if (!window.confirm(ar ? "تأكيد إكمال الجلسة؟" : "Confirm session completion?")) return;
    setBusy(sessionId); setMessage(null); setError(null);
    try {
      const res = await fetch("/api/patient/medical/programs/complete-session", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-session-${activeTab}-${sessionId}-${Date.now()}` },
        body: JSON.stringify({ programType: activeTab, sessionId: String(sessionId) }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(ar ? "تعذر إكمال الجلسة" : "Could not complete session"); return; }
      const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const list = [root.data, root.programs].find(Array.isArray);
      if (Array.isArray(list)) {
        setPrograms(list.flatMap((p) => {
          if (!p || typeof p !== "object") return [];
          const o = p as Record<string, unknown>;
          if (typeof o.id !== "string") return [];
          const sessions = Array.isArray(o.sessions) ? o.sessions : [];
          return [{
            id: o.id,
            title: typeof o.title === "string" ? o.title : o.id,
            duration: typeof o.duration === "string" ? o.duration : undefined,
            completedSessions: sessions.filter((s) => s && typeof s === "object" && (s as Record<string, unknown>).status === "completed").length,
            totalSessions: sessions.length,
            nextTitle: undefined, nextDate: undefined, nextTime: undefined,
            milestoneReward: typeof o.milestoneReward === "string" ? o.milestoneReward : undefined,
            rewardDesc: typeof o.rewardDesc === "string" ? o.rewardDesc : undefined,
            sessions: sessions.flatMap((s) => {
              if (!s || typeof s !== "object") return [];
              const so = s as Record<string, unknown>;
              return [{
                id: typeof so.id === "string" || typeof so.id === "number" ? so.id : String(sessionId),
                title: typeof so.title === "string" ? so.title : "",
                completed: so.status === "completed",
              }];
            }),
          }];
        }));
      }
      if (String(sessionId) === "4") setMessage(ar ? "مبروك إكمال الجلسة الرابعة!" : "Congrats on completing session 4!");
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="tablist" aria-label={ar ? "البرامج" : "Programs"}>
        {programs.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={activeTab === p.id} onClick={() => setActiveTab(p.id)}>
            {p.title.replace(ar ? "برنامج " : "Program ", "")}
          </button>
        ))}
      </div>
      <section aria-label={ar ? "التقدم" : "Progress"}>
        <h2>{selected.title}</h2>
        {selected.duration ? <p>{ar ? "المدة:" : "Duration:"} {selected.duration}</p> : null}
        <p role="status">{ar ? "نسبة الإنجاز:" : "Completion:"} {selected.completedSessions} {ar ? "من أصل" : "of"} {selected.totalSessions} ({pct}%)</p>
      </section>
      {selected.nextTitle ? (
        <section aria-label={ar ? "الجلسة القادمة" : "Next session"}>
          <h3>{ar ? "الجلسة القادمة المجدولة" : "Next scheduled session"}</h3>
          <p>{selected.nextTitle}{selected.nextDate ? ` — ${selected.nextDate}` : ""}{selected.nextTime ? ` ${selected.nextTime}` : ""}</p>
        </section>
      ) : null}
      {selected.milestoneReward ? (
        <section aria-label={ar ? "المكافأة" : "Reward"}>
          <h3>{ar ? "مكافأة الإنجاز القادم" : "Next milestone reward"}</h3>
          <p><strong>{selected.milestoneReward}</strong>{selected.rewardDesc ? ` — ${selected.rewardDesc}` : ""}</p>
        </section>
      ) : null}
      <h3>{ar ? "جدول الجلسات والزيارات" : "Sessions schedule"}</h3>
      <ul>
        {selected.sessions.map((s) => (
          <li key={String(s.id)} style={s.completed ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
            #{String(s.id)} {s.title}{" "}
            {!s.completed ? (
              <button type="button" onClick={() => complete(s.id)} disabled={busy !== null}>
                {ar ? "تأكيد إكمال الجلسة" : "Mark session completed"}
              </button>
            ) : (
              <span role="status">✓</span>
            )}
          </li>
        ))}
      </ul>
      <Link href={`/${locale}/loyalty`}>{ar ? "نقاطي ومكافآتي" : "My points & rewards"}</Link>
    </div>
  );
}
