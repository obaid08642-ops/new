"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ChoiceGroup } from "@/components-next/care/care-fields";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { RowsCard, SectionHead } from "@/components-next/health/health-kit";
import { formatDate } from "@/lib/format-date";
import forms from "@/components-next/consult/consult.module.css";

export type Program = {
  id: string; title: string; duration?: string;
  completedSessions: number; totalSessions: number;
  nextTitle?: string; nextDate?: string; nextTime?: string;
  milestoneReward?: string; rewardDesc?: string;
  sessions: { id: string | number; title: string; completed: boolean }[];
};

/**
 * The programs screen's body (canvas/CareHub): the program chooser, the progress ring, the next session, the milestone reward and
 * the sessions with "Mark completed". Marking a session is the same POST as before (/api/patient/medical/programs/complete-session,
 * with its idempotency key); the screen shows what the server answers.
 */
export function ProgramsActiveClient({ initial, locale }: { initial: Program[]; locale: string }) {
  const t = useTranslations("ProgramsWeb");
  const [programs, setPrograms] = useState(initial);
  const [activeTab, setActiveTab] = useState(initial[0]?.id ?? "");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = programs.find((p) => p.id === activeTab) ?? programs[0];
  if (!selected) return <p role="status" className={forms.body}>{t("empty")}</p>;
  const ratio = selected.totalSessions > 0 ? selected.completedSessions / selected.totalSessions : 0;
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const nextDate = selected.nextDate ? formatDate(locale, selected.nextDate) ?? selected.nextDate : null;

  async function complete(sessionId: string | number) {
    if (!window.confirm(t("confirmComplete"))) return;
    setBusy(sessionId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/patient/medical/programs/complete-session", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-session-${activeTab}-${sessionId}-${Date.now()}` },
        body: JSON.stringify({ programType: activeTab, sessionId: String(sessionId) }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(t("completeFailed"));
        return;
      }
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
      if (String(sessionId) === "4") setMessage(t("congrats"));
    } catch {
      setError(t("connectionFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={forms.stack}>
      {message ? <p role="status" className={forms.notice}>{message}</p> : null}
      {error ? <p role="alert" className={forms.error}>{error}</p> : null}
      {programs.length > 1 ? <ChoiceGroup label={t("programs")} value={selected.id} onChange={setActiveTab} options={programs.map((p) => ({ value: p.id, label: p.title }))} /> : null}
      <CareHero
        tone="blue"
        icon="clipboard-text"
        label={t("progress")}
        ring={{ value: ratio, label: t("ringLabel", { done: number.format(selected.completedSessions), total: number.format(selected.totalSessions) }), valueText: percent.format(ratio) }}
        title={selected.title}
        lines={[
          t("sessionsDone", { done: number.format(selected.completedSessions), total: number.format(selected.totalSessions) }),
          selected.duration ? t("duration", { value: selected.duration }) : null,
        ].filter((line): line is string => line !== null)}
      />
      {selected.nextTitle ? (
        <RowCard icon="calendar-dots" tone="violet" title={t("nextSession")} sub={[selected.nextTitle, nextDate, selected.nextTime].filter(Boolean).join(" · ")} />
      ) : null}
      {selected.milestoneReward ? (
        <RowCard icon="gift" tone="amber" title={t("rewardTitle")} sub={[selected.milestoneReward, selected.rewardDesc].filter(Boolean).join(" - ")} />
      ) : null}
      <SectionHead id="sessions" title={t("sessions")} action={{ href: `/${locale}/loyalty`, label: t("myPoints") }} />
      {selected.sessions.length === 0 ? (
        <Notice>{t("noSessions")}</Notice>
      ) : (
        <RowsCard label={t("sessions")}>
          {selected.sessions.map((s) => (
            <li key={String(s.id)}>
              <RecordRow
                icon={s.completed ? "check-circle" : "clipboard-text"}
                tone={s.completed ? "mint" : "blue"}
                muted={s.completed}
                title={<><bdi>#{String(s.id)}</bdi> {s.title}</>}
                end={s.completed ? undefined : <Button label={t("markDone")} size="sm" variant="outline" loading={busy === s.id} disabled={busy !== null} onClick={() => complete(s.id)} />}
              />
            </li>
          ))}
        </RowsCard>
      )}
    </div>
  );
}
