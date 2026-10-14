import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ProgramsActiveClient, type Program } from "@/components-next/programs-active-client";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Programs (canvas/CareHub; merge map 2, section 8): the old list and the old active-programs page are one screen. The live
 * programs come from GET /medical/programs/active; the chosen program shows its progress, the next session, the milestone reward and
 * the sessions, and a session is marked done through the same POST as before (see the client).
 */
export default async function ProgramsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ProgramsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      {body}
    </ConsultPage>
  );

  let response: Response;
  try {
    response = await callPatientApi("/medical/programs/active", {}, token);
  } catch {
    return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const payload = asRecord(await response.json().catch(() => null));
  const list = [payload?.data, payload?.programs].find(Array.isArray);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const programs: Program[] = (Array.isArray(list) ? list : []).flatMap((p) => {
    const o = asRecord(p);
    if (!o || typeof o.id !== "string") return [];
    const sessions = (Array.isArray(o.sessions) ? o.sessions : []).flatMap((s) => {
      const so = asRecord(s);
      if (!so) return [];
      return [{
        id: typeof so.id === "string" || typeof so.id === "number" ? so.id : "",
        title: typeof so.title === "string" ? so.title : "",
        completed: so.status === "completed",
      }];
    });
    const next = sessions.find((s) => !s.completed);
    return [{
      id: o.id,
      title: str(o.title) ?? o.id,
      duration: str(o.duration),
      completedSessions: sessions.filter((s) => s.completed).length,
      totalSessions: sessions.length,
      nextTitle: next?.title,
      nextDate: str(o.next_session_date),
      nextTime: str(o.next_session_time),
      milestoneReward: str(o.milestoneReward),
      rewardDesc: str(o.rewardDesc),
      sessions,
    }];
  });

  if (programs.length === 0) return frame(<ConsultState kind="empty" icon="clipboard-text" tone="blue" title={t("title")} body={t("empty")} />);
  return frame(<ProgramsActiveClient initial={programs} locale={locale} />);
}
